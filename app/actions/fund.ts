"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import {
  assertFundPaymentAmount,
  assertPeriodInPlan,
  assertUniqueWinnerAssignment,
  buildCycleIntegrity,
  buildPeriodReport,
  collectedTotal,
  expectedPaymentForShare,
  expectedPoolTotal,
  winnerPeriodByMember,
  type FundCycleIntegrity,
  type FundPeriodReport,
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
  /** memberId → period they already won (for disabling select options) */
  winnerTakenByMember: Record<string, number>;
  periodReport: FundPeriodReport | null;
  cycleIntegrity: FundCycleIntegrity | null;
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

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
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

  const expectedTotal = plan
    ? expectedPoolTotal(
        shareAmount,
        members.map((m) => ({ defaultShare: m.defaultShare })),
      )
    : 0;
  const collected = collectedTotal(periodPayments);
  const turnStatus = turn ? (turn.status as "OPEN" | "ASSIGNED") : null;
  const winnerName = turn?.winner ? memberName(turn.winner.user) : null;

  const taken = winnerPeriodByMember(
    turns.map((t) => ({
      periodIndex: t.periodIndex,
      winnerMemberId: t.winnerMemberId,
    })),
  );
  const winnerTakenByMember: Record<string, number> = {};
  for (const [id, p] of taken) {
    winnerTakenByMember[id] = p;
  }

  const periodReport = plan
    ? buildPeriodReport({
        periodIndex: activePeriod,
        expectedTotal,
        collectedTotal: collected,
        members: memberRows.map((m) => ({ name: m.name, paid: m.paid })),
        winnerName,
        status: turnStatus,
      })
    : null;

  const cycleIntegrity = plan
    ? buildCycleIntegrity(
        turns.map((t) => ({
          periodIndex: t.periodIndex,
          winnerMemberId: t.winnerMemberId,
        })),
      )
    : null;

  return {
    spaceId,
    plan: plan
      ? { shareAmount: plan.shareAmount, periodCount: plan.periodCount }
      : null,
    periodIndex: activePeriod,
    winnerMemberId: turn?.winnerMemberId ?? null,
    winnerName,
    turnStatus,
    expectedTotal,
    collectedTotal: collected,
    members: memberRows,
    periods: turns.map((t) => ({
      periodIndex: t.periodIndex,
      winnerName: t.winner ? memberName(t.winner.user) : null,
      status: t.status,
    })),
    winnerTakenByMember,
    periodReport,
    cycleIntegrity,
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

  const periodOk = assertPeriodInPlan(data.periodIndex, plan.periodCount);
  if (!periodOk.ok) return periodOk;

  const turn = await prisma.fundTurn.findUnique({
    where: {
      spaceId_periodIndex: {
        spaceId: data.spaceId,
        periodIndex: data.periodIndex,
      },
    },
  });
  if (!turn) {
    return {
      ok: false,
      error: "دوره در پلن وجود ندارد. پلن را دوباره ذخیره کنید.",
    };
  }

  if (data.winnerMemberId) {
    const winner = await prisma.spaceMember.findFirst({
      where: { id: data.winnerMemberId, spaceId: data.spaceId },
    });
    if (!winner) {
      return { ok: false, error: "عضو انتخاب‌شده در این فضا نیست." };
    }
  }

  const otherTurns = await prisma.fundTurn.findMany({
    where: { spaceId: data.spaceId },
    select: { periodIndex: true, winnerMemberId: true },
  });
  const uniqueOk = assertUniqueWinnerAssignment(
    otherTurns,
    data.winnerMemberId,
    data.periodIndex,
  );
  if (!uniqueOk.ok) {
    return { ok: false, error: uniqueOk.error };
  }

  try {
    await prisma.fundTurn.update({
      where: { id: turn.id },
      data: {
        winnerMemberId: data.winnerMemberId,
        status: data.winnerMemberId ? "ASSIGNED" : "OPEN",
      },
    });
    revalidatePath(`/spaces/${data.spaceId}`);
    return { ok: true };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return {
        ok: false,
        error: "این عضو قبلاً در دورهٔ دیگری برنده شده است.",
      };
    }
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

  const periodOk = assertPeriodInPlan(data.periodIndex, plan.periodCount);
  if (!periodOk.ok) return periodOk;

  const turn = await prisma.fundTurn.findUnique({
    where: {
      spaceId_periodIndex: {
        spaceId: data.spaceId,
        periodIndex: data.periodIndex,
      },
    },
  });
  if (!turn) {
    return {
      ok: false,
      error: "دوره در پلن وجود ندارد. پلن را دوباره ذخیره کنید.",
    };
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
      const expected = expectedPaymentForShare(
        plan.shareAmount,
        member.defaultShare,
      );
      const amountCheck = assertFundPaymentAmount(expected, data.amount);
      if (!amountCheck.ok) {
        return { ok: false, error: amountCheck.error };
      }
      const amount = asMoney(amountCheck.amount);

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
