"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import {
  DEBT_DUE_SOON_DAYS,
  debtPaidTotal,
  isDebtFullyPaid,
  isDueSoon,
  type DebtStatusValue,
  type DebtTypeValue,
} from "@/lib/debts";
import { parseExpenseDateInput } from "@/lib/format";
import { asMoney } from "@/lib/money";
import { canMutateMoney } from "@/lib/rbac";
import { getTemplate } from "@/lib/templates/registry";
import {
  addDebtPaymentSchema,
  createDebtSchema,
  type AddDebtPaymentInput,
  type CreateDebtInput,
} from "@/lib/validations/debt";

export type DebtActionResult =
  | { ok: true; debtId: string }
  | { ok: false; error: string };

export type DebtPaymentDTO = {
  id: string;
  amount: number;
  date: string;
  note: string | null;
};

export type DebtDTO = {
  id: string;
  spaceId: string;
  type: DebtTypeValue;
  counterparty: string;
  initialAmount: number;
  dueDate: string | null;
  status: DebtStatusValue;
  createdById: string;
  createdByName: string;
  paidTotal: number;
  remaining: number;
  progressPercent: number;
  payments: DebtPaymentDTO[];
};

async function assertDebtsEnabled(spaceId: string, userId: string) {
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

  const features = getTemplate(space.type).features;
  if (!features.debts) {
    return {
      ok: false as const,
      error: "ماژول بدهی در این قالب فعال نیست.",
    };
  }

  return { ok: true as const, membership, spaceType: space.type };
}

function toDebtDTO(row: {
  id: string;
  spaceId: string;
  type: DebtTypeValue;
  counterparty: string;
  initialAmount: number;
  dueDate: Date | null;
  status: DebtStatusValue;
  createdById: string;
  createdBy: { name: string | null };
  payments: { id: string; amount: number; date: Date; note: string | null }[];
}): DebtDTO {
  const paidTotal = debtPaidTotal(row.payments);
  const remaining = Math.max(0, row.initialAmount - paidTotal);
  const progressPercent =
    row.initialAmount <= 0
      ? 100
      : Math.min(100, Math.round((paidTotal * 100) / row.initialAmount));

  return {
    id: row.id,
    spaceId: row.spaceId,
    type: row.type,
    counterparty: row.counterparty,
    initialAmount: row.initialAmount,
    dueDate: row.dueDate
      ? row.dueDate.toISOString().slice(0, 10)
      : null,
    status: row.status,
    createdById: row.createdById,
    createdByName: row.createdBy.name?.trim() || "عضو",
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

export async function listSpaceDebts(spaceId: string): Promise<DebtDTO[]> {
  const session = await requireUser();
  const access = await assertDebtsEnabled(spaceId, session.userId);
  if (!access.ok) return [];

  const rows = await prisma.debt.findMany({
    where: { spaceId },
    include: {
      payments: { orderBy: { date: "desc" } },
      createdBy: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return rows.map((r) =>
    toDebtDTO({
      ...r,
      type: r.type as DebtTypeValue,
      status: r.status as DebtStatusValue,
    }),
  );
}

export async function createDebt(
  input: CreateDebtInput,
): Promise<DebtActionResult> {
  const session = await requireUser();
  const parsed = createDebtSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

  const data = parsed.data;
  const access = await assertDebtsEnabled(data.spaceId, session.userId);
  if (!access.ok) return access;
  if (!canMutateMoney(access.membership.role)) {
    return { ok: false, error: "نقش ناظر اجازه ثبت بدهی ندارد." };
  }

  try {
    const debt = await prisma.debt.create({
      data: {
        spaceId: data.spaceId,
        type: data.type,
        counterparty: data.counterparty,
        initialAmount: asMoney(data.initialAmount),
        dueDate: data.dueDate ? parseExpenseDateInput(data.dueDate) : null,
        createdById: session.userId,
        status: "ACTIVE",
      },
    });

    revalidatePath(`/spaces/${data.spaceId}`);
    revalidatePath("/app");
    return { ok: true, debtId: debt.id };
  } catch {
    return { ok: false, error: "ثبت بدهی ناموفق بود." };
  }
}

export async function addDebtPayment(
  input: AddDebtPaymentInput,
): Promise<DebtActionResult> {
  const session = await requireUser();
  const parsed = addDebtPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

  const data = parsed.data;
  const access = await assertDebtsEnabled(data.spaceId, session.userId);
  if (!access.ok) return access;
  if (!canMutateMoney(access.membership.role)) {
    return { ok: false, error: "نقش ناظر اجازه ثبت پرداخت ندارد." };
  }

  const debt = await prisma.debt.findFirst({
    where: { id: data.debtId, spaceId: data.spaceId },
    include: { payments: { select: { amount: true } } },
  });
  if (!debt) {
    return { ok: false, error: "بدهی پیدا نشد." };
  }
  if (debt.status === "SETTLED") {
    return { ok: false, error: "این مورد قبلاً تسویه شده است." };
  }

  const amount = asMoney(data.amount);
  const paidSoFar = debtPaidTotal(debt.payments);
  const remaining = debt.initialAmount - paidSoFar;
  if (amount > remaining) {
    return {
      ok: false,
      error: `مبلغ از مانده (${remaining}) بیشتر است.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.debtPayment.create({
        data: {
          debtId: debt.id,
          amount,
          date: parseExpenseDateInput(data.date),
          note: data.note?.trim() || null,
          createdById: session.userId,
        },
      });

      const nextPayments = [...debt.payments, { amount }];
      if (isDebtFullyPaid(debt.initialAmount, nextPayments)) {
        await tx.debt.update({
          where: { id: debt.id },
          data: { status: "SETTLED" },
        });
      }
    });

    revalidatePath(`/spaces/${data.spaceId}`);
    revalidatePath("/app");
    return { ok: true, debtId: debt.id };
  } catch {
    return { ok: false, error: "ثبت پرداخت ناموفق بود." };
  }
}

export type DueSoonDebtSummary = {
  debtId: string;
  spaceId: string;
  spaceName: string;
  type: DebtTypeValue;
  counterparty: string;
  remaining: number;
  dueDate: string;
  daysLeft: number;
};

/**
 * Home dashboard aggregation — ACTIVE debts due soon across the user's spaces.
 * Queries Debt directly (not nested under every membership) and limits to
 * debt-enabled, non-archived spaces. Semantics match `isDueSoon` (overdue + N days).
 */
export async function listDueSoonDebtsForUser(): Promise<DueSoonDebtSummary[]> {
  const session = await requireUser();
  const userId = session.userId;
  const now = new Date();
  const horizon = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + DEBT_DUE_SOON_DAYS,
      23,
      59,
      59,
      999,
    ),
  );

  const rows = await prisma.debt.findMany({
    where: {
      status: "ACTIVE",
      dueDate: { not: null, lte: horizon },
      space: {
        archivedAt: null,
        /** Debts module is FAMILY + legacy PERSONAL only. */
        type: { in: ["FAMILY", "PERSONAL"] },
        members: { some: { userId } },
      },
    },
    select: {
      id: true,
      spaceId: true,
      type: true,
      counterparty: true,
      initialAmount: true,
      dueDate: true,
      payments: { select: { amount: true } },
      space: { select: { name: true } },
    },
  });

  const out: DueSoonDebtSummary[] = [];

  for (const debt of rows) {
    if (!debt.dueDate || !isDueSoon(debt.dueDate, DEBT_DUE_SOON_DAYS, now)) {
      continue;
    }
    const paid = debtPaidTotal(debt.payments);
    const remaining = Math.max(0, debt.initialAmount - paid);
    if (remaining <= 0) continue;
    const due = debt.dueDate;
    const daysLeft = Math.round(
      (Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()) -
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) /
        (24 * 60 * 60 * 1000),
    );
    out.push({
      debtId: debt.id,
      spaceId: debt.spaceId,
      spaceName: debt.space.name,
      type: debt.type as DebtTypeValue,
      counterparty: debt.counterparty,
      remaining,
      dueDate: due.toISOString().slice(0, 10),
      daysLeft,
    });
  }

  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}
