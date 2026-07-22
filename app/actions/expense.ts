"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { parseExpenseDateInput } from "@/lib/format";
import { asMoney, splitEqual } from "@/lib/money";
import { canMutateMoney } from "@/lib/rbac";
import {
  expenseSchema,
  type ExpenseFormValues,
} from "@/lib/validations/expense";

export type ExpenseActionResult =
  | { ok: true; expenseId: string }
  | { ok: false; error: string };

type OwedRow = { userId: string; owedAmount: number };

async function assertCanMutateExpense(spaceId: string, userId: string) {
  const membership = await requireSpaceMember(spaceId, userId);
  if (!membership) {
    return { ok: false as const, error: "به این فضا دسترسی ندارید." };
  }
  if (!canMutateMoney(membership.role)) {
    return {
      ok: false as const,
      error: "نقش ناظر اجازه ثبت یا ویرایش هزینه ندارد.",
    };
  }
  return { ok: true as const, membership };
}

async function resolveOwedRows(
  input: ExpenseFormValues,
): Promise<{ ok: true; owedByUser: OwedRow[] } | { ok: false; error: string }> {
  const members = await prisma.spaceMember.findMany({
    where: { spaceId: input.spaceId },
    select: { userId: true },
  });
  const memberIds = new Set(members.map((m) => m.userId));

  if (!memberIds.has(input.paidById)) {
    return { ok: false, error: "پرداخت‌کننده عضو این فضا نیست." };
  }

  const selected = input.splits.filter((s) => s.selected);
  if (selected.length === 0) {
    return { ok: false, error: "حداقل یک نفر باید در تسهیم باشد." };
  }

  for (const split of selected) {
    if (!memberIds.has(split.userId)) {
      return { ok: false, error: "یکی از افراد تسهیم عضو فضا نیست." };
    }
  }

  const total = asMoney(input.totalAmount);
  let owedByUser: OwedRow[];

  if (input.splitMode === "EQUAL") {
    const ordered = [...selected].sort((a, b) =>
      a.userId.localeCompare(b.userId),
    );
    const parts = splitEqual(total, ordered.length);
    owedByUser = ordered.map((s, i) => ({
      userId: s.userId,
      owedAmount: parts[i],
    }));
  } else {
    const sum = selected.reduce((acc, s) => acc + s.amount, 0);
    if (sum !== input.totalAmount) {
      return {
        ok: false,
        error: `جمع سهم‌ها (${sum}) باید برابر مبلغ کل باشد.`,
      };
    }
    owedByUser = selected.map((s) => ({
      userId: s.userId,
      owedAmount: s.amount,
    }));
  }

  return { ok: true, owedByUser };
}

export async function addExpense(
  data: ExpenseFormValues,
): Promise<ExpenseActionResult> {
  const session = await requireUser();
  const parsed = expenseSchema.safeParse(data);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

  const input = parsed.data;
  const access = await assertCanMutateExpense(input.spaceId, session.userId);
  if (!access.ok) return access;

  const resolved = await resolveOwedRows(input);
  if (!resolved.ok) return resolved;

  try {
    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          spaceId: input.spaceId,
          title: input.title,
          totalAmount: input.totalAmount,
          paidById: input.paidById,
          date: parseExpenseDateInput(input.date),
        },
      });

      await tx.expenseSplit.createMany({
        data: resolved.owedByUser.map((row) => ({
          expenseId: created.id,
          userId: row.userId,
          owedAmount: row.owedAmount,
        })),
      });

      return created;
    });

    revalidatePath(`/spaces/${input.spaceId}`);
    revalidatePath("/app");

    return { ok: true, expenseId: expense.id };
  } catch {
    return { ok: false, error: "ثبت هزینه ناموفق بود. دوباره تلاش کنید." };
  }
}

export async function updateExpense(
  expenseId: string,
  data: ExpenseFormValues,
): Promise<ExpenseActionResult> {
  const session = await requireUser();
  const parsed = expenseSchema.safeParse(data);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

  const input = parsed.data;
  const access = await assertCanMutateExpense(input.spaceId, session.userId);
  if (!access.ok) return access;

  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, spaceId: input.spaceId },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "هزینه پیدا نشد." };
  }

  const resolved = await resolveOwedRows(input);
  if (!resolved.ok) return resolved;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: expenseId },
        data: {
          title: input.title,
          totalAmount: input.totalAmount,
          paidById: input.paidById,
          date: parseExpenseDateInput(input.date),
        },
      });

      await tx.expenseSplit.deleteMany({ where: { expenseId } });
      await tx.expenseSplit.createMany({
        data: resolved.owedByUser.map((row) => ({
          expenseId,
          userId: row.userId,
          owedAmount: row.owedAmount,
        })),
      });
    });

    revalidatePath(`/spaces/${input.spaceId}`);
    revalidatePath("/app");

    return { ok: true, expenseId };
  } catch {
    return { ok: false, error: "ویرایش هزینه ناموفق بود." };
  }
}

export async function deleteExpense(
  expenseId: string,
  spaceId: string,
): Promise<ExpenseActionResult> {
  const session = await requireUser();
  const access = await assertCanMutateExpense(spaceId, session.userId);
  if (!access.ok) return access;

  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, spaceId },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "هزینه پیدا نشد." };
  }

  try {
    await prisma.expense.delete({ where: { id: expenseId } });
    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath("/app");
    return { ok: true, expenseId };
  } catch {
    return { ok: false, error: "حذف هزینه ناموفق بود." };
  }
}
