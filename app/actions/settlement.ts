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

export async function getSpaceBalances(
  spaceId: string,
): Promise<SpaceBalancesResult> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return { balances: {}, suggestions: [] };
  }

  const members = await prisma.spaceMember.findMany({
    where: { spaceId },
    select: { userId: true },
  });

  const balances: Record<string, number> = {};
  for (const m of members) {
    balances[m.userId] = 0;
  }

  const expenses = await prisma.expense.findMany({
    where: {
      spaceId,
      /** Income must not skew multiplayer net balances / settlements. */
      transactionType: "EXPENSE",
    },
    select: {
      paidById: true,
      totalAmount: true,
      splits: {
        select: { userId: true, owedAmount: true },
      },
    },
  });

  for (const expense of expenses) {
    if (balances[expense.paidById] === undefined) {
      balances[expense.paidById] = 0;
    }
    balances[expense.paidById] += expense.totalAmount;

    for (const split of expense.splits) {
      if (balances[split.userId] === undefined) {
        balances[split.userId] = 0;
      }
      balances[split.userId] -= split.owedAmount;
    }
  }

  const settlements = await prisma.settlement.findMany({
    where: { spaceId, status: "COMPLETED" },
    select: { fromUserId: true, toUserId: true, amount: true },
  });

  for (const settlement of settlements) {
    if (balances[settlement.fromUserId] === undefined) {
      balances[settlement.fromUserId] = 0;
    }
    if (balances[settlement.toUserId] === undefined) {
      balances[settlement.toUserId] = 0;
    }
    // from paid a debt → their net improves; to received → their credit decreases
    balances[settlement.fromUserId] += settlement.amount;
    balances[settlement.toUserId] -= settlement.amount;
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

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { type: true },
  });
  if (!space) {
    return { ok: false, error: "فضا پیدا نشد." };
  }
  if (!getTemplate(space.type).features.settlements) {
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
