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
  confirmFundProofUploadSchema,
  createFundProofUploadIntentSchema,
  reviewFundProofSchema,
  setFundPaymentSchema,
  upsertFundPlanSchema,
  type AssignFundTurnInput,
  type ConfirmFundProofUploadInput,
  type CreateFundProofUploadIntentInput,
  type ReviewFundProofInput,
  type SetFundPaymentInput,
  type UpsertFundPlanInput,
} from "@/lib/validations/fund";
import {
  fundProofObjectKey,
  isStorageConfigured,
  presignGetObject,
  presignPutObject,
} from "@/lib/storage/s3";

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

// ─── Phase B: member portal + payment proofs ────────────────────────────────

export type FundProofStatusValue = "PENDING" | "APPROVED" | "REJECTED";

export type FundPaymentProofDTO = {
  id: string;
  periodIndex: number;
  memberId: string;
  memberName: string;
  mimeType: string;
  byteSize: number;
  note: string | null;
  status: FundProofStatusValue;
  uploadedByName: string | null;
  createdAt: string;
  reviewNote: string | null;
};

export type FundMemberPortalDTO = {
  spaceId: string;
  spaceName: string;
  currency: string;
  memberId: string;
  memberName: string;
  shareLabel: string;
  plan: { shareAmount: number; periodCount: number } | null;
  periodIndex: number;
  expectedAmount: number;
  paid: boolean;
  paidAmount: number;
  winnerName: string | null;
  turnStatus: "OPEN" | "ASSIGNED" | null;
  periods: {
    periodIndex: number;
    winnerName: string | null;
    status: string;
    paid: boolean;
  }[];
  proofs: FundPaymentProofDTO[];
  storageReady: boolean;
};

function proofToDto(p: {
  id: string;
  periodIndex: number;
  memberId: string;
  mimeType: string;
  byteSize: number;
  note: string | null;
  status: string;
  createdAt: Date;
  reviewNote: string | null;
  member: { user: { name: string | null; phone: string } };
  uploadedBy: { name: string | null; phone: string };
}): FundPaymentProofDTO {
  return {
    id: p.id,
    periodIndex: p.periodIndex,
    memberId: p.memberId,
    memberName: memberName(p.member.user),
    mimeType: p.mimeType,
    byteSize: p.byteSize,
    note: p.note,
    status: p.status as FundProofStatusValue,
    uploadedByName: memberName(p.uploadedBy),
    createdAt: p.createdAt.toISOString(),
    reviewNote: p.reviewNote,
  };
}

export async function getFundMemberPortal(
  spaceId: string,
  periodIndex?: number,
): Promise<FundMemberPortalDTO | null> {
  const session = await requireUser();
  const access = await assertFundEnabled(spaceId, session.userId);
  if (!access.ok) return null;

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { id: true, name: true, currency: true },
  });
  if (!space) return null;

  const myMembership = await prisma.spaceMember.findFirst({
    where: { spaceId, userId: session.userId },
    include: { user: { select: { name: true, phone: true } } },
  });
  if (!myMembership) return null;

  const [plan, turns, payments, proofs] = await Promise.all([
    prisma.fundPlan.findUnique({ where: { spaceId } }),
    prisma.fundTurn.findMany({
      where: { spaceId },
      include: {
        winner: { include: { user: { select: { name: true, phone: true } } } },
      },
      orderBy: { periodIndex: "asc" },
    }),
    prisma.fundPayment.findMany({
      where: { spaceId, memberId: myMembership.id },
    }),
    prisma.fundPaymentProof.findMany({
      where: { spaceId, memberId: myMembership.id },
      include: {
        member: { include: { user: { select: { name: true, phone: true } } } },
        uploadedBy: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  const activePeriod =
    periodIndex && periodIndex >= 1
      ? periodIndex
      : turns.find((t) => t.status === "OPEN")?.periodIndex ??
        turns[0]?.periodIndex ??
        1;

  const turn = turns.find((t) => t.periodIndex === activePeriod) ?? null;
  const payment = payments.find((p) => p.periodIndex === activePeriod);
  const expected = plan
    ? expectedPaymentForShare(plan.shareAmount, myMembership.defaultShare)
    : 0;

  const paidByPeriod = new Map(payments.map((p) => [p.periodIndex, true]));

  return {
    spaceId: space.id,
    spaceName: space.name,
    currency: space.currency,
    memberId: myMembership.id,
    memberName: memberName(myMembership.user),
    shareLabel: formatShareLabel(myMembership.defaultShare),
    plan: plan
      ? { shareAmount: plan.shareAmount, periodCount: plan.periodCount }
      : null,
    periodIndex: activePeriod,
    expectedAmount: expected,
    paid: Boolean(payment),
    paidAmount: payment?.amount ?? 0,
    winnerName: turn?.winner ? memberName(turn.winner.user) : null,
    turnStatus: turn ? (turn.status as "OPEN" | "ASSIGNED") : null,
    periods: turns.map((t) => ({
      periodIndex: t.periodIndex,
      winnerName: t.winner ? memberName(t.winner.user) : null,
      status: t.status,
      paid: Boolean(paidByPeriod.get(t.periodIndex)),
    })),
    proofs: proofs.map(proofToDto),
    storageReady: isStorageConfigured(),
  };
}

export async function listFundProofsForManager(
  spaceId: string,
): Promise<FundPaymentProofDTO[]> {
  const session = await requireUser();
  const access = await assertFundEnabled(spaceId, session.userId);
  if (!access.ok || !canMutateMoney(access.membership.role)) return [];

  const proofs = await prisma.fundPaymentProof.findMany({
    where: { spaceId },
    include: {
      member: { include: { user: { select: { name: true, phone: true } } } },
      uploadedBy: { select: { name: true, phone: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  return proofs.map(proofToDto);
}

export type FundProofUploadIntentResult =
  | {
      ok: true;
      proofId: string;
      uploadUrl: string;
      storageKey: string;
    }
  | { ok: false; error: string };

export async function createFundProofUploadIntent(
  input: CreateFundProofUploadIntentInput,
): Promise<FundProofUploadIntentResult> {
  if (!isStorageConfigured()) {
    return {
      ok: false,
      error: "ذخیره‌سازی فایل پیکربندی نشده است (S3/R2).",
    };
  }

  const session = await requireUser();
  const parsed = createFundProofUploadIntentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const data = parsed.data;
  const access = await assertFundEnabled(data.spaceId, session.userId);
  if (!access.ok) return access;

  const membership = await prisma.spaceMember.findFirst({
    where: { spaceId: data.spaceId, userId: session.userId },
  });
  if (!membership) {
    return { ok: false, error: "عضویت پیدا نشد." };
  }

  const plan = await prisma.fundPlan.findUnique({
    where: { spaceId: data.spaceId },
  });
  if (!plan) {
    return { ok: false, error: "پلن صندوق تعریف نشده است." };
  }
  const periodOk = assertPeriodInPlan(data.periodIndex, plan.periodCount);
  if (!periodOk.ok) return periodOk;

  const alreadyPaid = await prisma.fundPayment.findUnique({
    where: {
      spaceId_periodIndex_memberId: {
        spaceId: data.spaceId,
        periodIndex: data.periodIndex,
        memberId: membership.id,
      },
    },
  });
  if (alreadyPaid) {
    return { ok: false, error: "پرداخت این دوره قبلاً ثبت شده است." };
  }

  const pending = await prisma.fundPaymentProof.findFirst({
    where: {
      spaceId: data.spaceId,
      periodIndex: data.periodIndex,
      memberId: membership.id,
      status: "PENDING",
    },
  });
  if (pending) {
    return {
      ok: false,
      error: "یک فیش در انتظار بررسی برای این دوره دارید.",
    };
  }

  try {
    const storageKey = fundProofObjectKey({
      spaceId: data.spaceId,
      periodIndex: data.periodIndex,
      memberId: membership.id,
      mimeType: data.mimeType,
    });
    const { uploadUrl } = await presignPutObject({
      key: storageKey,
      mimeType: data.mimeType,
      byteSize: data.byteSize,
    });

    const proof = await prisma.fundPaymentProof.create({
      data: {
        spaceId: data.spaceId,
        periodIndex: data.periodIndex,
        memberId: membership.id,
        uploadedById: session.userId,
        storageKey,
        mimeType: data.mimeType,
        byteSize: data.byteSize,
        note: data.note ?? null,
        status: "PENDING",
      },
      select: { id: true },
    });

    return {
      ok: true,
      proofId: proof.id,
      uploadUrl,
      storageKey,
    };
  } catch {
    return { ok: false, error: "ساخت لینک آپلود ناموفق بود." };
  }
}

export async function confirmFundProofUpload(
  input: ConfirmFundProofUploadInput,
): Promise<FundActionResult> {
  const session = await requireUser();
  const parsed = confirmFundProofUploadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const data = parsed.data;
  const access = await assertFundEnabled(data.spaceId, session.userId);
  if (!access.ok) return access;

  const proof = await prisma.fundPaymentProof.findFirst({
    where: {
      id: data.proofId,
      spaceId: data.spaceId,
      uploadedById: session.userId,
    },
  });
  if (!proof) {
    return { ok: false, error: "فیش پیدا نشد." };
  }

  revalidatePath(`/spaces/${data.spaceId}`);
  revalidatePath(`/spaces/${data.spaceId}/member`);
  return { ok: true };
}

export async function reviewFundProof(
  input: ReviewFundProofInput,
): Promise<FundActionResult> {
  const session = await requireUser();
  const parsed = reviewFundProofSchema.safeParse(input);
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
    return { ok: false, error: "نقش ناظر اجازه بررسی فیش ندارد." };
  }

  const proof = await prisma.fundPaymentProof.findFirst({
    where: { id: data.proofId, spaceId: data.spaceId },
    include: { member: true },
  });
  if (!proof) {
    return { ok: false, error: "فیش پیدا نشد." };
  }
  if (proof.status !== "PENDING") {
    return { ok: false, error: "این فیش قبلاً بررسی شده است." };
  }

  const plan = await prisma.fundPlan.findUnique({
    where: { spaceId: data.spaceId },
  });
  if (!plan) {
    return { ok: false, error: "پلن صندوق تعریف نشده است." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.fundPaymentProof.update({
        where: { id: proof.id },
        data: {
          status: data.status,
          reviewedById: session.userId,
          reviewedAt: new Date(),
          reviewNote: data.reviewNote ?? null,
        },
      });

      if (data.status === "APPROVED") {
        const expected = expectedPaymentForShare(
          plan.shareAmount,
          proof.member.defaultShare,
        );
        const amountCheck = assertFundPaymentAmount(expected, undefined);
        if (!amountCheck.ok) {
          throw new Error(amountCheck.error);
        }
        const amount = asMoney(amountCheck.amount);
        await tx.fundPayment.upsert({
          where: {
            spaceId_periodIndex_memberId: {
              spaceId: data.spaceId,
              periodIndex: proof.periodIndex,
              memberId: proof.memberId,
            },
          },
          create: {
            spaceId: data.spaceId,
            periodIndex: proof.periodIndex,
            memberId: proof.memberId,
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
    });

    revalidatePath(`/spaces/${data.spaceId}`);
    revalidatePath(`/spaces/${data.spaceId}/member`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "بررسی فیش ناموفق بود.";
    return { ok: false, error: msg };
  }
}

export type FundProofDownloadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function getFundProofDownloadUrl(
  spaceId: string,
  proofId: string,
): Promise<FundProofDownloadResult> {
  if (!isStorageConfigured()) {
    return { ok: false, error: "ذخیره‌سازی فایل پیکربندی نشده است." };
  }

  const session = await requireUser();
  const access = await assertFundEnabled(spaceId, session.userId);
  if (!access.ok) return access;

  const proof = await prisma.fundPaymentProof.findFirst({
    where: { id: proofId, spaceId },
  });
  if (!proof) {
    return { ok: false, error: "فیش پیدا نشد." };
  }

  const isManager = canMutateMoney(access.membership.role);
  const isUploader = proof.uploadedById === session.userId;
  if (!isManager && !isUploader) {
    return { ok: false, error: "اجازه دانلود ندارید." };
  }

  try {
    const url = await presignGetObject(proof.storageKey);
    return { ok: true, url };
  } catch {
    return { ok: false, error: "لینک دانلود ساخته نشد." };
  }
}
