/**
 * Home dashboard aggregation — per-space money headline for the space list plus
 * a cross-space net position, computed in a fixed number of queries (no N+1).
 *
 * Two headline kinds, chosen by template features (never by Space.type):
 *  - `balance`  — settlements templates (سفر / حساب مشترک): the viewer's net
 *                 position, identical formula to `getSpaceBalances`.
 *  - `spend`    — ledger templates (خانه / ساختمان): the space's spend this
 *                 Tehran month, filtered by the viewer's category privacy.
 *
 * Amounts stay integers in each space's own currency; totals are grouped per
 * currency because cross-currency sums would be a lie.
 */

import { expenseCategoryPrivacyWhere } from "@/lib/category-privacy";
import { prisma } from "@/lib/db/prisma";
import type { SpaceCurrency } from "@/lib/format";
import { tehranMonthRange } from "@/lib/personal";
import { canonicalizeSpaceType, getTemplate } from "@/lib/templates/registry";
import type { SpaceRole, SpaceType } from "@/types";

export type HomeSpaceInput = {
  id: string;
  type: SpaceType;
  currency: SpaceCurrency;
  ownerId: string;
  role: SpaceRole;
};

export type HomeSpaceStat =
  /** Viewer's net position: > 0 طلبکار, < 0 بدهکار, 0 تسویه. */
  | { kind: "balance"; amount: number }
  /** Space spend in the current Tehran month. */
  | { kind: "spend"; amount: number }
  /** Template has no meaningful home headline (e.g. FUND). */
  | { kind: "none" };

export type HomeSummary = {
  /** spaceId → headline stat. */
  statBySpace: Record<string, HomeSpaceStat>;
  /**
   * Net position per currency across settlement spaces only.
   * `credit` = total owed to the viewer, `debit` = total the viewer owes.
   */
  netByCurrency: {
    currency: SpaceCurrency;
    credit: number;
    debit: number;
    net: number;
  }[];
  /** Total spend this Tehran month per currency, across ledger spaces. */
  monthSpendByCurrency: { currency: SpaceCurrency; amount: number }[];
  /**
   * Same month spend, split by canonical template so the home widget can
   * name the source (خانه / ساختمان) instead of an unlabeled total.
   */
  monthSpendByTemplate: {
    type: SpaceType;
    currency: SpaceCurrency;
    amount: number;
    spaceCount: number;
  }[];
};

const EMPTY: HomeSummary = {
  statBySpace: {},
  netByCurrency: [],
  monthSpendByCurrency: [],
  monthSpendByTemplate: [],
};

export async function getHomeSummary(
  userId: string,
  spaces: HomeSpaceInput[],
): Promise<HomeSummary> {
  if (spaces.length === 0) return EMPTY;

  const balanceSpaces = spaces.filter(
    (s) => getTemplate(s.type).features.settlements,
  );
  /** VIEWER (resident/member portals) must not see the whole-space total. */
  const spendSpaces = spaces.filter(
    (s) =>
      getTemplate(s.type).features.incomeExpense && s.role !== "VIEWER",
  );

  const balanceIds = balanceSpaces.map((s) => s.id);
  const spendIds = spendSpaces.map((s) => s.id);
  const month = tehranMonthRange();

  /**
   * Owners (and space ownerId match) never hide categories from themselves —
   * skip the privacy round-trip on the common home path.
   */
  const needsPrivacyLookup = spendSpaces.some(
    (s) => s.role !== "OWNER" && s.ownerId !== userId,
  );

  /**
   * Wave 1 — balances + optional privacy + unfiltered month spend in parallel.
   * A second spend query only runs when privacy actually hides categories.
   */
  const [paidByMe, owedByMe, settledOut, settledIn, privacyPolicies, simpleMonthSpend] =
    await Promise.all([
      balanceIds.length > 0
        ? prisma.expense.groupBy({
            by: ["spaceId"],
            where: {
              spaceId: { in: balanceIds },
              paidById: userId,
              transactionType: "EXPENSE",
            },
            _sum: { totalAmount: true },
          })
        : [],
      /**
       * ExpenseSplit has no spaceId, and Prisma cannot group by a relation
       * field — but this reads only the viewer's own split rows, not the whole
       * space ledger, so it stays small.
       */
      balanceIds.length > 0
        ? prisma.expenseSplit.findMany({
            where: {
              userId,
              expense: {
                spaceId: { in: balanceIds },
                transactionType: "EXPENSE",
              },
            },
            select: {
              owedAmount: true,
              expense: { select: { spaceId: true } },
            },
          })
        : [],
      balanceIds.length > 0
        ? prisma.settlement.groupBy({
            by: ["spaceId"],
            where: {
              spaceId: { in: balanceIds },
              status: "COMPLETED",
              fromUserId: userId,
            },
            _sum: { amount: true },
          })
        : [],
      balanceIds.length > 0
        ? prisma.settlement.groupBy({
            by: ["spaceId"],
            where: {
              spaceId: { in: balanceIds },
              status: "COMPLETED",
              toUserId: userId,
            },
            _sum: { amount: true },
          })
        : [],
      needsPrivacyLookup
        ? prisma.spaceCategoryPolicy.findMany({
            where: { spaceId: { in: spendIds }, visibility: "PRIVATE" },
            select: {
              spaceId: true,
              category: true,
              visibility: true,
              ownerUserId: true,
            },
          })
        : [],
      spendIds.length > 0
        ? prisma.expense.groupBy({
            by: ["spaceId"],
            where: {
              spaceId: { in: spendIds },
              transactionType: "EXPENSE",
              date: { gte: month.start, lte: month.end },
            },
            _sum: { totalAmount: true },
          })
        : [],
    ]);

  const spendWhereOr = spendSpaces.map((s) => ({
    spaceId: s.id,
    ...expenseCategoryPrivacyWhere(
      privacyPolicies.filter((p) => p.spaceId === s.id),
      userId,
      { spaceOwnerId: s.ownerId, viewerIsSpaceOwner: s.role === "OWNER" },
    ),
  }));
  const privacyHidesCategories = spendWhereOr.some(
    (w) => w.category?.notIn && w.category.notIn.length > 0,
  );

  const monthSpend =
    privacyHidesCategories
      ? await prisma.expense.groupBy({
          by: ["spaceId"],
          where: {
            OR: spendWhereOr,
            transactionType: "EXPENSE",
            date: { gte: month.start, lte: month.end },
          },
          _sum: { totalAmount: true },
        })
      : simpleMonthSpend;
  const balanceBySpace: Record<string, number> = Object.fromEntries(
    balanceIds.map((id) => [id, 0]),
  );
  for (const row of paidByMe) {
    balanceBySpace[row.spaceId] =
      (balanceBySpace[row.spaceId] ?? 0) + (row._sum.totalAmount ?? 0);
  }
  for (const split of owedByMe) {
    const spaceId = split.expense.spaceId;
    balanceBySpace[spaceId] = (balanceBySpace[spaceId] ?? 0) - split.owedAmount;
  }
  // Paying a debt improves your net; receiving one reduces your credit.
  for (const row of settledOut) {
    balanceBySpace[row.spaceId] =
      (balanceBySpace[row.spaceId] ?? 0) + (row._sum.amount ?? 0);
  }
  for (const row of settledIn) {
    balanceBySpace[row.spaceId] =
      (balanceBySpace[row.spaceId] ?? 0) - (row._sum.amount ?? 0);
  }

  const spendBySpace: Record<string, number> = Object.fromEntries(
    spendIds.map((id) => [id, 0]),
  );
  for (const row of monthSpend) {
    spendBySpace[row.spaceId] = row._sum.totalAmount ?? 0;
  }

  const statBySpace: Record<string, HomeSpaceStat> = {};
  for (const space of spaces) {
    if (space.id in balanceBySpace) {
      statBySpace[space.id] = {
        kind: "balance",
        amount: balanceBySpace[space.id] ?? 0,
      };
    } else if (space.id in spendBySpace) {
      statBySpace[space.id] = {
        kind: "spend",
        amount: spendBySpace[space.id] ?? 0,
      };
    } else {
      statBySpace[space.id] = { kind: "none" };
    }
  }

  const netMap = new Map<
    SpaceCurrency,
    { currency: SpaceCurrency; credit: number; debit: number; net: number }
  >();
  for (const space of balanceSpaces) {
    const amount = balanceBySpace[space.id] ?? 0;
    if (amount === 0) continue;
    const row = netMap.get(space.currency) ?? {
      currency: space.currency,
      credit: 0,
      debit: 0,
      net: 0,
    };
    if (amount > 0) row.credit += amount;
    else row.debit += -amount;
    row.net += amount;
    netMap.set(space.currency, row);
  }

  const spendMap = new Map<SpaceCurrency, number>();
  const templateSpendMap = new Map<
    string,
    {
      type: SpaceType;
      currency: SpaceCurrency;
      amount: number;
      spaceCount: number;
    }
  >();
  for (const space of spendSpaces) {
    const amount = spendBySpace[space.id] ?? 0;
    if (amount === 0) continue;
    spendMap.set(space.currency, (spendMap.get(space.currency) ?? 0) + amount);
    const type = canonicalizeSpaceType(space.type);
    const key = `${type}:${space.currency}`;
    const row = templateSpendMap.get(key);
    if (row) {
      row.amount += amount;
      row.spaceCount += 1;
    } else {
      templateSpendMap.set(key, {
        type,
        currency: space.currency,
        amount,
        spaceCount: 1,
      });
    }
  }

  return {
    statBySpace,
    netByCurrency: [...netMap.values()].sort(
      (a, b) => Math.abs(b.net) - Math.abs(a.net),
    ),
    monthSpendByCurrency: [...spendMap.entries()]
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((a, b) => b.amount - a.amount),
    monthSpendByTemplate: [...templateSpendMap.values()].sort(
      (a, b) => b.amount - a.amount,
    ),
  };
}
