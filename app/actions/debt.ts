"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import {
  DEBT_DUE_SOON_DAYS,
  allocatePaymentFifo,
  counterpartyKey,
  debtPaidTotal,
  debtStatusAfter,
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
  addGroupedDebtPaymentSchema,
  createDebtSchema,
  deleteDebtPaymentSchema,
  deleteDebtSchema,
  updateDebtPaymentSchema,
  updateDebtSchema,
  type AddDebtPaymentInput,
  type AddGroupedDebtPaymentInput,
  type CreateDebtInput,
  type DeleteDebtInput,
  type DeleteDebtPaymentInput,
  type UpdateDebtInput,
  type UpdateDebtPaymentInput,
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
  note: string | null;
  dueDate: string | null;
  status: DebtStatusValue;
  createdById: string;
  createdByName: string;
  paidTotal: number;
  remaining: number;
  progressPercent: number;
  payments: DebtPaymentDTO[];
  createdAt: string;
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
  note: string | null;
  dueDate: Date | null;
  status: DebtStatusValue;
  createdById: string;
  createdBy: { name: string | null };
  createdAt: Date;
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
    note: row.note,
    dueDate: row.dueDate
      ? row.dueDate.toISOString().slice(0, 10)
      : null,
    status: row.status,
    createdById: row.createdById,
    createdByName: row.createdBy.name?.trim() || "عضو",
    paidTotal,
    remaining,
    progressPercent,
    createdAt: row.createdAt.toISOString(),
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
        note: data.note?.trim() || null,
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

export async function addGroupedDebtPayment(
  input: AddGroupedDebtPaymentInput,
): Promise<DebtActionResult> {
  const session = await requireUser();
  const parsed = addGroupedDebtPaymentSchema.safeParse(input);
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

  const rows = await prisma.debt.findMany({
    where: {
      spaceId: data.spaceId,
      type: data.type,
      status: "ACTIVE",
    },
    include: { payments: { select: { amount: true } } },
  });
  const key = counterpartyKey(data.counterparty);
  const matches = rows.filter(
    (row) => counterpartyKey(row.counterparty) === key,
  );
  if (matches.length === 0) {
    return { ok: false, error: "طلب یا بدهی فعالی برای این طرف پیدا نشد." };
  }

  const amount = asMoney(data.amount);
  const allocated = allocatePaymentFifo(
    matches.map((row) => ({
      id: row.id,
      remaining: Math.max(0, row.initialAmount - debtPaidTotal(row.payments)),
      dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
      createdAt: row.createdAt.toISOString(),
    })),
    amount,
  );
  if (!allocated.ok) {
    return {
      ok: false,
      error:
        allocated.remaining <= 0
          ? "مانده‌ای برای تسویه نیست."
          : `مبلغ از مانده (${allocated.remaining}) بیشتر است.`,
    };
  }

  const paidById = new Map(matches.map((row) => [row.id, row]));

  try {
    const firstId = allocated.splits[0]?.id;
    if (!firstId) {
      return { ok: false, error: "مانده‌ای برای تسویه نیست." };
    }
    const payDate = parseExpenseDateInput(data.date);
    const note = data.note?.trim() || null;

    await prisma.$transaction(async (tx) => {
      for (const split of allocated.splits) {
        const row = paidById.get(split.id);
        if (!row) continue;
        await tx.debtPayment.create({
          data: {
            debtId: split.id,
            amount: split.amount,
            date: payDate,
            note,
            createdById: session.userId,
          },
        });
        const nextPaid = debtPaidTotal(row.payments) + split.amount;
        if (nextPaid >= row.initialAmount) {
          await tx.debt.update({
            where: { id: split.id },
            data: { status: "SETTLED" },
          });
        }
      }
    });

    revalidatePath(`/spaces/${data.spaceId}`);
    revalidatePath("/app");
    return { ok: true, debtId: firstId };
  } catch {
    return { ok: false, error: "ثبت پرداخت ناموفق بود." };
  }
}

export async function updateDebt(
  input: UpdateDebtInput,
): Promise<DebtActionResult> {
  const session = await requireUser();
  const parsed = updateDebtSchema.safeParse(input);
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
    return { ok: false, error: "نقش ناظر اجازه ویرایش بدهی ندارد." };
  }

  const debt = await prisma.debt.findFirst({
    where: { id: data.debtId, spaceId: data.spaceId },
    include: { payments: { select: { amount: true } } },
  });
  if (!debt) {
    return { ok: false, error: "مورد پیدا نشد." };
  }

  const initialAmount = asMoney(data.initialAmount);
  const paid = debtPaidTotal(debt.payments);
  if (initialAmount < paid) {
    return {
      ok: false,
      error: `مبلغ نمی‌تواند از دریافت‌های ثبت‌شده (${paid}) کمتر باشد.`,
    };
  }

  try {
    await prisma.debt.update({
      where: { id: debt.id },
      data: {
        initialAmount,
        note:
          data.note !== undefined ? data.note?.trim() || null : debt.note,
        dueDate: data.dueDate ? parseExpenseDateInput(data.dueDate) : null,
        status: debtStatusAfter(initialAmount, debt.payments),
        ...(data.occurredOn
          ? { createdAt: parseExpenseDateInput(data.occurredOn) }
          : {}),
      },
    });

    revalidatePath(`/spaces/${data.spaceId}`);
    revalidatePath("/app");
    return { ok: true, debtId: debt.id };
  } catch {
    return { ok: false, error: "ویرایش ناموفق بود." };
  }
}

export async function deleteDebt(
  input: DeleteDebtInput,
): Promise<DebtActionResult> {
  const session = await requireUser();
  const parsed = deleteDebtSchema.safeParse(input);
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
    return { ok: false, error: "نقش ناظر اجازه حذف بدهی ندارد." };
  }

  const debt = await prisma.debt.findFirst({
    where: { id: data.debtId, spaceId: data.spaceId },
    select: { id: true },
  });
  if (!debt) {
    return { ok: false, error: "مورد پیدا نشد." };
  }

  try {
    await prisma.debt.delete({ where: { id: debt.id } });
    revalidatePath(`/spaces/${data.spaceId}`);
    revalidatePath("/app");
    return { ok: true, debtId: debt.id };
  } catch {
    return { ok: false, error: "حذف ناموفق بود." };
  }
}

export async function updateDebtPayment(
  input: UpdateDebtPaymentInput,
): Promise<DebtActionResult> {
  const session = await requireUser();
  const parsed = updateDebtPaymentSchema.safeParse(input);
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
    return { ok: false, error: "نقش ناظر اجازه ویرایش پرداخت ندارد." };
  }

  const payment = await prisma.debtPayment.findFirst({
    where: { id: data.paymentId, debt: { spaceId: data.spaceId } },
    include: {
      debt: { include: { payments: { select: { id: true, amount: true } } } },
    },
  });
  if (!payment) {
    return { ok: false, error: "پرداخت پیدا نشد." };
  }

  const amount = asMoney(data.amount);
  const others = payment.debt.payments.filter((p) => p.id !== payment.id);
  if (debtPaidTotal(others) + amount > payment.debt.initialAmount) {
    const room =
      payment.debt.initialAmount - debtPaidTotal(others);
    return {
      ok: false,
      error:
        room <= 0
          ? "مانده‌ای برای این دریافت نیست."
          : `مبلغ از مانده این فقره (${room}) بیشتر است.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.debtPayment.update({
        where: { id: payment.id },
        data: {
          amount,
          date: parseExpenseDateInput(data.date),
          note: data.note?.trim() || null,
        },
      });
      const nextPayments = [...others, { amount }];
      await tx.debt.update({
        where: { id: payment.debtId },
        data: {
          status: debtStatusAfter(payment.debt.initialAmount, nextPayments),
        },
      });
    });

    revalidatePath(`/spaces/${data.spaceId}`);
    revalidatePath("/app");
    return { ok: true, debtId: payment.debtId };
  } catch {
    return { ok: false, error: "ویرایش پرداخت ناموفق بود." };
  }
}

export async function deleteDebtPayment(
  input: DeleteDebtPaymentInput,
): Promise<DebtActionResult> {
  const session = await requireUser();
  const parsed = deleteDebtPaymentSchema.safeParse(input);
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
    return { ok: false, error: "نقش ناظر اجازه حذف پرداخت ندارد." };
  }

  const payment = await prisma.debtPayment.findFirst({
    where: { id: data.paymentId, debt: { spaceId: data.spaceId } },
    include: {
      debt: { include: { payments: { select: { id: true, amount: true } } } },
    },
  });
  if (!payment) {
    return { ok: false, error: "پرداخت پیدا نشد." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.debtPayment.delete({ where: { id: payment.id } });
      const remainingPays = payment.debt.payments.filter(
        (p) => p.id !== payment.id,
      );
      await tx.debt.update({
        where: { id: payment.debtId },
        data: {
          status: debtStatusAfter(payment.debt.initialAmount, remainingPays),
        },
      });
    });

    revalidatePath(`/spaces/${data.spaceId}`);
    revalidatePath("/app");
    return { ok: true, debtId: payment.debtId };
  } catch {
    return { ok: false, error: "حذف پرداخت ناموفق بود." };
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
