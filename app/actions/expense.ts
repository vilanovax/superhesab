"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { asMoney, splitEqual } from "@/lib/money";
import {
  expenseSchema,
  type ExpenseFormValues,
} from "@/lib/validations/expense";

export type ExpenseActionResult =
  | { ok: true; expenseId: string }
  | { ok: false; error: string };

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
  const membership = await requireSpaceMember(input.spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "به این فضا دسترسی ندارید." };
  }

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
  let owedByUser: { userId: string; owedAmount: number }[];

  if (input.splitMode === "EQUAL") {
    // Stable order for remainder assignment
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

  try {
    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          spaceId: input.spaceId,
          title: input.title,
          totalAmount: input.totalAmount,
          paidById: input.paidById,
          date: new Date(),
        },
      });

      await tx.expenseSplit.createMany({
        data: owedByUser.map((row) => ({
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
