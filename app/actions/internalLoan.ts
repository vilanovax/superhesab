"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import {
  isLoanFullyPaid,
  isDueSoon,
  loanPaidTotal,
  type InternalLoanStatusValue,
} from "@/lib/family-loans";
import { parseExpenseDateInput } from "@/lib/format";
import { asMoney } from "@/lib/money";
import { canMutateMoney } from "@/lib/rbac";
import { getTemplate } from "@/lib/templates/registry";
import {
  addInternalLoanPaymentSchema,
  createInternalLoanSchema,
  type AddInternalLoanPaymentInput,
  type CreateInternalLoanInput,
} from "@/lib/validations/family-loan";

export type InternalLoanActionResult =
  | { ok: true; loanId: string }
  | { ok: false; error: string };

export type InternalLoanPaymentDTO = {
  id: string;
  amount: number;
  date: string;
  note: string | null;
};

export type InternalLoanDTO = {
  id: string;
  spaceId: string;
  fromMemberId: string;
  toMemberId: string;
  fromName: string;
  toName: string;
  initialAmount: number;
  dueDate: string | null;
  status: InternalLoanStatusValue;
  note: string | null;
  paidTotal: number;
  remaining: number;
  progressPercent: number;
  payments: InternalLoanPaymentDTO[];
};

async function assertInternalLoansEnabled(spaceId: string, userId: string) {
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

  if (!getTemplate(space.type).features.internalLoans) {
    return {
      ok: false as const,
      error: "ماژول وام خانوادگی در این قالب فعال نیست.",
    };
  }

  return { ok: true as const, membership };
}

function memberLabel(user: { name: string | null; phone: string }): string {
  return user.name?.trim() || user.phone || "عضو";
}

function toLoanDTO(row: {
  id: string;
  spaceId: string;
  fromMemberId: string;
  toMemberId: string;
  initialAmount: number;
  dueDate: Date | null;
  status: InternalLoanStatusValue;
  note: string | null;
  fromMember: { user: { name: string | null; phone: string } };
  toMember: { user: { name: string | null; phone: string } };
  payments: { id: string; amount: number; date: Date; note: string | null }[];
}): InternalLoanDTO {
  const paidTotal = loanPaidTotal(row.payments);
  const remaining = Math.max(0, row.initialAmount - paidTotal);
  const progressPercent =
    row.initialAmount <= 0
      ? 100
      : Math.min(100, Math.round((paidTotal * 100) / row.initialAmount));

  return {
    id: row.id,
    spaceId: row.spaceId,
    fromMemberId: row.fromMemberId,
    toMemberId: row.toMemberId,
    fromName: memberLabel(row.fromMember.user),
    toName: memberLabel(row.toMember.user),
    initialAmount: row.initialAmount,
    dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
    status: row.status,
    note: row.note,
    paidTotal,
    remaining,
    progressPercent,
    payments: row.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      date: p.date.toISOString().slice(0, 10),
      note: p.note,
    })),
  };
}

const loanInclude = {
  fromMember: {
    include: { user: { select: { name: true, phone: true } } },
  },
  toMember: {
    include: { user: { select: { name: true, phone: true } } },
  },
  payments: { orderBy: { date: "desc" as const } },
};

export async function listInternalLoans(
  spaceId: string,
): Promise<InternalLoanDTO[]> {
  const session = await requireUser();
  const access = await assertInternalLoansEnabled(spaceId, session.userId);
  if (!access.ok) return [];

  const rows = await prisma.internalLoan.findMany({
    where: { spaceId },
    include: loanInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return rows.map((r) =>
    toLoanDTO({
      ...r,
      status: r.status as InternalLoanStatusValue,
    }),
  );
}

export async function createInternalLoan(
  input: CreateInternalLoanInput,
): Promise<InternalLoanActionResult> {
  const session = await requireUser();
  const parsed = createInternalLoanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

  const data = parsed.data;
  const access = await assertInternalLoansEnabled(data.spaceId, session.userId);
  if (!access.ok) return access;
  if (!canMutateMoney(access.membership.role)) {
    return { ok: false, error: "نقش ناظر اجازه ثبت وام ندارد." };
  }

  const [from, to] = await Promise.all([
    prisma.spaceMember.findFirst({
      where: { id: data.fromMemberId, spaceId: data.spaceId },
    }),
    prisma.spaceMember.findFirst({
      where: { id: data.toMemberId, spaceId: data.spaceId },
    }),
  ]);
  if (!from || !to) {
    return { ok: false, error: "هر دو طرف باید عضو همین فضا باشند." };
  }

  try {
    const loan = await prisma.internalLoan.create({
      data: {
        spaceId: data.spaceId,
        fromMemberId: data.fromMemberId,
        toMemberId: data.toMemberId,
        initialAmount: asMoney(data.initialAmount),
        dueDate: data.dueDate ? parseExpenseDateInput(data.dueDate) : null,
        note: data.note?.trim() || null,
      },
    });
    revalidatePath(`/spaces/${data.spaceId}`);
    return { ok: true, loanId: loan.id };
  } catch {
    return { ok: false, error: "ثبت وام ناموفق بود." };
  }
}

export async function addInternalLoanPayment(
  input: AddInternalLoanPaymentInput,
): Promise<InternalLoanActionResult> {
  const session = await requireUser();
  const parsed = addInternalLoanPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

  const data = parsed.data;
  const access = await assertInternalLoansEnabled(data.spaceId, session.userId);
  if (!access.ok) return access;
  if (!canMutateMoney(access.membership.role)) {
    return { ok: false, error: "نقش ناظر اجازه ثبت پرداخت ندارد." };
  }

  const loan = await prisma.internalLoan.findFirst({
    where: { id: data.loanId, spaceId: data.spaceId },
    include: { payments: { select: { amount: true } } },
  });
  if (!loan) {
    return { ok: false, error: "وام پیدا نشد." };
  }
  if (loan.status === "SETTLED") {
    return { ok: false, error: "این وام قبلاً تسویه شده است." };
  }

  const amount = asMoney(data.amount);
  const paidSoFar = loanPaidTotal(loan.payments);
  const remaining = loan.initialAmount - paidSoFar;
  if (amount > remaining) {
    return {
      ok: false,
      error: `مبلغ از مانده (${remaining}) بیشتر است.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.internalLoanPayment.create({
        data: {
          loanId: loan.id,
          amount,
          date: parseExpenseDateInput(data.date),
          note: data.note?.trim() || null,
        },
      });

      if (isLoanFullyPaid(loan.initialAmount, [...loan.payments, { amount }])) {
        await tx.internalLoan.update({
          where: { id: loan.id },
          data: { status: "SETTLED" },
        });
      }
    });

    revalidatePath(`/spaces/${data.spaceId}`);
    return { ok: true, loanId: loan.id };
  } catch {
    return { ok: false, error: "ثبت بازپرداخت ناموفق بود." };
  }
}

export type DueSoonInternalLoanSummary = {
  loanId: string;
  spaceId: string;
  spaceName: string;
  fromName: string;
  toName: string;
  remaining: number;
  dueDate: string;
  daysLeft: number;
};

/** Home dashboard — ACTIVE internal loans due soon across user's FAMILY spaces. */
export async function listDueSoonInternalLoansForUser(): Promise<DueSoonInternalLoanSummary[]> {
  const session = await requireUser();
  const userId = session.userId;

  const memberships = await prisma.spaceMember.findMany({
    where: { userId },
    select: {
      space: {
        select: {
          id: true,
          name: true,
          type: true,
          internalLoans: {
            where: { status: "ACTIVE", dueDate: { not: null } },
            include: {
              payments: { select: { amount: true } },
              fromMember: {
                include: { user: { select: { name: true, phone: true } } },
              },
              toMember: {
                include: { user: { select: { name: true, phone: true } } },
              },
            },
          },
        },
      },
    },
  });

  const now = new Date();
  const out: DueSoonInternalLoanSummary[] = [];

  for (const m of memberships) {
    if (!getTemplate(m.space.type).features.internalLoans) continue;
    for (const loan of m.space.internalLoans) {
      if (!loan.dueDate || !isDueSoon(loan.dueDate, 3, now)) continue;
      const paid = loanPaidTotal(loan.payments);
      const remaining = Math.max(0, loan.initialAmount - paid);
      if (remaining <= 0) continue;
      const due = loan.dueDate;
      const daysLeft = Math.round(
        (Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()) -
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) /
          (24 * 60 * 60 * 1000),
      );
      out.push({
        loanId: loan.id,
        spaceId: m.space.id,
        spaceName: m.space.name,
        fromName: memberLabel(loan.fromMember.user),
        toName: memberLabel(loan.toMember.user),
        remaining,
        dueDate: due.toISOString().slice(0, 10),
        daysLeft,
      });
    }
  }

  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}
