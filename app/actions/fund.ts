"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import {
  collectedTotal,
  expectedPaymentForShare,
  expectedPoolTotal,
} from "@/lib/fund";
import { asMoney, formatShareLabel } from "@/lib/money";
import { canMutateMoney } from "@/lib/rbac";
import { getTemplate } from "@/lib/templates/registry";
import {
  assignFundTurnSchema,
  setFundPaymentSchema,
  upsertFundPlanSchema,
  type AssignFundTurnInput,
  type SetFundPaymentInput,
  type UpsertFundPlanInput,
} from "@/lib/validations/fund";

export type FundActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type FundMemberRow = {
  memberId: string;
  userId: string;
  name: string;
  defaultShare: number;
  shareLabel: string;
  expectedAmount: number;
  paid: boolean;
  paidAmount: number;
};

export type FundDashboardDTO = {
  spaceId: string;
  plan: {
    shareAmount: number;
    periodCount: number;
  } | null;
  periodIndex: number;
  winnerMemberId: string | null;
  winnerName: string | null;
  turnStatus: "OPEN" | "ASSIGNED" | null;
  expectedTotal: number;
  collectedTotal: number;
  members: FundMemberRow[];
  periods: { periodIndex: number; winnerName: string | null; status: string }[];
};

async function assertFundEnabled(spaceId: string, userId: string) {
  const membership = await requireSpaceMember(spaceId, userId);
  if (!membership) {
    return { ok: false as const, error: "به این فضا دسترسی ندارید." };
  }
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { type: true },
  });
  if (!space) {
    return { ok: false as const, error: "فضا پیدا نشد." };
  }
  if (!getTemplate(space.type).features.fundRotating) {
    return {
      ok: false as const,
      error: "ماژول صندوق نوبتی در این قالب فعال نیست.",
    };
  }
  return { ok: true as const, membership };
}

function memberName(user: { name: string | null; phone: string }): string {
  return user.name?.trim() || user.phone || "عضو";
}

export async function getFundDashboard(
  spaceId: string,
  periodIndex?: number,
): Promise<FundDashboardDTO | null> {
  const session = await requireUser();
  const access = await assertFundEnabled(spaceId, session.userId);
  if (!access.ok) return null;

  const [plan, members, turns, payments] = await Promise.all([
    prisma.fundPlan.findUnique({ where: { spaceId } }),
    prisma.spaceMember.findMany({
      where: { spaceId },
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.fundTurn.findMany({
      where: { spaceId },
      include: {
        winner: { include: { user: { select: { name: true, phone: true } } } },
      },
      orderBy: { periodIndex: "asc" },
    }),
    prisma.fundPayment.findMany({
      where: {
        spaceId,
        ...(periodIndex != null ? { periodIndex } : {}),
      },
    }),
  ]);

  const activePeriod =
    periodIndex && periodIndex >= 1
      ? periodIndex
      : turns.find((t) => t.status === "OPEN")?.periodIndex ??
        turns[0]?.periodIndex ??
        1;

  const periodPayments = payments.filter((p) => p.periodIndex === activePeriod);
  const turn = turns.find((t) => t.periodIndex === activePeriod) ?? null;
  const shareAmount = plan?.shareAmount ?? 0;

  const memberRows: FundMemberRow[] = members.map((m) => {
    const expected = plan
      ? expectedPaymentForShare(shareAmount, m.defaultShare)
      : 0;
    const payment = periodPayments.find((p) => p.memberId === m.id);
    return {
      memberId: m.id,
      userId: m.userId,
      name: memberName(m.user),
      defaultShare: m.defaultShare,
      shareLabel: formatShareLabel(m.defaultShare),
      expectedAmount: expected,
      paid: Boolean(payment),
      paidAmount: payment?.amount ?? 0,
    };
  });

  return {
    spaceId,
    plan: plan
      ? { shareAmount: plan.shareAmount, periodCount: plan.periodCount }
      : null,
    periodIndex: activePeriod,
    winnerMemberId: turn?.winnerMemberId ?? null,
    winnerName: turn?.winner ? memberName(turn.winner.user) : null,
    turnStatus: turn ? (turn.status as "OPEN" | "ASSIGNED") : null,
    expectedTotal: plan
      ? expectedPoolTotal(
          shareAmount,
          members.map((m) => ({ defaultShare: m.defaultShare })),
        )
      : 0,
    collectedTotal: collectedTotal(periodPayments),
    members: memberRows,
    periods: turns.map((t) => ({
      periodIndex: t.periodIndex,
      winnerName: t.winner ? memberName(t.winner.user) : null,
      status: t.status,
    })),
  };
}

export async function upsertFundPlan(
  input: UpsertFundPlanInput,
): Promise<FundActionResult> {
  const session = await requireUser();
  const parsed = upsertFundPlanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const data = parsed.data;
  const access = await assertFundEnabled(data.spaceId, session.userId);
  if (!access.ok) return access;
  if (access.membership.role !== "OWNER") {
    return { ok: false, error: "فقط مالک می‌تواند پلن صندوق را تنظیم کند." };
  }

  const shareAmount = asMoney(data.shareAmount);
  const periodCount = data.periodCount;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.fundPlan.upsert({
        where: { spaceId: data.spaceId },
        create: {
          spaceId: data.spaceId,
          shareAmount,
          periodCount,
        },
        update: { shareAmount, periodCount },
      });

      const existing = await tx.fundTurn.findMany({
        where: { spaceId: data.spaceId },
        select: { periodIndex: true },
      });
      const have = new Set(existing.map((t) => t.periodIndex));

      for (let i = 1; i <= periodCount; i++) {
        if (!have.has(i)) {
          await tx.fundTurn.create({
            data: {
              spaceId: data.spaceId,
              periodIndex: i,
              status: "OPEN",
            },
          });
        }
      }

      await tx.fundTurn.deleteMany({
        where: {
          spaceId: data.spaceId,
          periodIndex: { gt: periodCount },
        },
      });
      await tx.fundPayment.deleteMany({
        where: {
          spaceId: data.spaceId,
          periodIndex: { gt: periodCount },
        },
      });
    });

    revalidatePath(`/spaces/${data.spaceId}`);
    revalidatePath(`/spaces/${data.spaceId}/settings`);
    return { ok: true };
  } catch {
    return { ok: false, error: "ذخیره پلن ناموفق بود." };
  }
}

export async function assignFundTurn(
  input: AssignFundTurnInput,
): Promise<FundActionResult> {
  const session = await requireUser();
  const parsed = assignFundTurnSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const data = parsed.data;
  const access = await assertFundEnabled(data.spaceId, session.userId);
  if (!access.ok) return access;
  if (!canMutateMoney(access.membership.role)) {
    return { ok: false, error: "نقش ناظر اجازه تعیین نوبت ندارد." };
  }

  const plan = await prisma.fundPlan.findUnique({
    where: { spaceId: data.spaceId },
  });
  if (!plan) {
    return { ok: false, error: "ابتدا پلن صندوق را تعریف کنید." };
  }
  if (data.periodIndex < 1 || data.periodIndex > plan.periodCount) {
    return { ok: false, error: "شماره دوره نامعتبر است." };
  }

  if (data.winnerMemberId) {
    const winner = await prisma.spaceMember.findFirst({
      where: { id: data.winnerMemberId, spaceId: data.spaceId },
    });
    if (!winner) {
      return { ok: false, error: "عضو انتخاب‌شده در این فضا نیست." };
    }
  }

  try {
    await prisma.fundTurn.upsert({
      where: {
        spaceId_periodIndex: {
          spaceId: data.spaceId,
          periodIndex: data.periodIndex,
        },
      },
      create: {
        spaceId: data.spaceId,
        periodIndex: data.periodIndex,
        winnerMemberId: data.winnerMemberId,
        status: data.winnerMemberId ? "ASSIGNED" : "OPEN",
      },
      update: {
        winnerMemberId: data.winnerMemberId,
        status: data.winnerMemberId ? "ASSIGNED" : "OPEN",
      },
    });
    revalidatePath(`/spaces/${data.spaceId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "ثبت نوبت ناموفق بود." };
  }
}

export async function setFundPayment(
  input: SetFundPaymentInput,
): Promise<FundActionResult> {
  const session = await requireUser();
  const parsed = setFundPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const data = parsed.data;
  const access = await assertFundEnabled(data.spaceId, session.userId);
  if (!access.ok) return access;
  if (!canMutateMoney(access.membership.role)) {
    return { ok: false, error: "نقش ناظر اجازه ثبت وصول ندارد." };
  }

  const plan = await prisma.fundPlan.findUnique({
    where: { spaceId: data.spaceId },
  });
  if (!plan) {
    return { ok: false, error: "ابتدا پلن صندوق را تعریف کنید." };
  }
  if (data.periodIndex < 1 || data.periodIndex > plan.periodCount) {
    return { ok: false, error: "شماره دوره نامعتبر است." };
  }

  const member = await prisma.spaceMember.findFirst({
    where: { id: data.memberId, spaceId: data.spaceId },
  });
  if (!member) {
    return { ok: false, error: "عضو پیدا نشد." };
  }

  try {
    if (!data.paid) {
      await prisma.fundPayment.deleteMany({
        where: {
          spaceId: data.spaceId,
          periodIndex: data.periodIndex,
          memberId: data.memberId,
        },
      });
    } else {
      const amount = asMoney(
        data.amount ??
          expectedPaymentForShare(plan.shareAmount, member.defaultShare),
      );
      await prisma.fundPayment.upsert({
        where: {
          spaceId_periodIndex_memberId: {
            spaceId: data.spaceId,
            periodIndex: data.periodIndex,
            memberId: data.memberId,
          },
        },
        create: {
          spaceId: data.spaceId,
          periodIndex: data.periodIndex,
          memberId: data.memberId,
          amount,
          createdById: session.userId,
        },
        update: {
          amount,
          createdById: session.userId,
          date: new Date(),
        },
      });
    }
    revalidatePath(`/spaces/${data.spaceId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "ثبت پرداخت ناموفق بود." };
  }
}
