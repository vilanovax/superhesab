"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import {
  simplifyDebts,
  type SimplifiedSettlement,
} from "@/lib/debtSimplification";
import { canMutateMoney } from "@/lib/rbac";
import { getTemplate } from "@/lib/templates/registry";

export type SpaceBalancesResult = {
  balances: Record<string, number>;
  suggestions: SimplifiedSettlement[];
};

export type SettlementActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Net balances via DB aggregates — O(members) rows, not O(expenses × splits).
 * Same semantics as the previous full-ledger scan.
 */
export async function getSpaceBalances(
  spaceId: string,
): Promise<SpaceBalancesResult> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return { balances: {}, suggestions: [] };
  }

  const [members, paid, owed, settledFrom, settledTo] = await Promise.all([
    prisma.spaceMember.findMany({
      where: { spaceId },
      select: { userId: true },
    }),
    prisma.expense.groupBy({
      by: ["paidById"],
      where: {
        spaceId,
        transactionType: "EXPENSE",
      },
      _sum: { totalAmount: true },
    }),
    prisma.expenseSplit.groupBy({
      by: ["userId"],
      where: {
        expense: {
          spaceId,
          transactionType: "EXPENSE",
        },
      },
      _sum: { owedAmount: true },
    }),
    prisma.settlement.groupBy({
      by: ["fromUserId"],
      where: { spaceId, status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.settlement.groupBy({
      by: ["toUserId"],
      where: { spaceId, status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);

  const balances: Record<string, number> = {};
  for (const m of members) {
    balances[m.userId] = 0;
  }

  for (const row of paid) {
    balances[row.paidById] =
      (balances[row.paidById] ?? 0) + (row._sum.totalAmount ?? 0);
  }
  for (const row of owed) {
    balances[row.userId] =
      (balances[row.userId] ?? 0) - (row._sum.owedAmount ?? 0);
  }
  for (const row of settledFrom) {
    balances[row.fromUserId] =
      (balances[row.fromUserId] ?? 0) + (row._sum.amount ?? 0);
  }
  for (const row of settledTo) {
    balances[row.toUserId] =
      (balances[row.toUserId] ?? 0) - (row._sum.amount ?? 0);
  }

  const suggestions = simplifyDebts(balances);
  return { balances, suggestions };
}

export async function settleDebt(
  spaceId: string,
  fromUserId: string,
  toUserId: string,
  amount: number,
): Promise<SettlementActionResult> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "به این فضا دسترسی ندارید." };
  }
  if (!canMutateMoney(membership.role)) {
    return { ok: false, error: "نقش ناظر اجازه ثبت تسویه ندارد." };
  }

  if (!getTemplate(membership.space.type).features.settlements) {
    return { ok: false, error: "این فضا تسویه ندارد." };
  }

  if (!Number.isInteger(amount) || amount < 1) {
    return { ok: false, error: "مبلغ تسویه نامعتبر است." };
  }

  if (fromUserId === toUserId) {
    return { ok: false, error: "فرستنده و گیرنده نمی‌توانند یکسان باشند." };
  }

  const [fromMember, toMember] = await Promise.all([
    prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: fromUserId } },
    }),
    prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: toUserId } },
    }),
  ]);

  if (!fromMember || !toMember) {
    return { ok: false, error: "هر دو طرف باید عضو فضا باشند." };
  }

  try {
    await prisma.settlement.create({
      data: {
        spaceId,
        fromUserId,
        toUserId,
        amount,
        status: "COMPLETED",
      },
    });

    revalidatePath(`/spaces/${spaceId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "ثبت تسویه ناموفق بود." };
  }
}
