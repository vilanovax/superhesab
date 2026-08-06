import { prisma } from "@/lib/db/prisma";
import type { ExpenseCategory } from "@/lib/generated/prisma/enums";

/** Initial + "load more" page size for space expense lists. */
export const EXPENSE_PAGE_SIZE = 30;

const expenseMemberSelect = {
  id: true,
  name: true,
  phone: true,
  isVirtual: true,
} as const;

/**
 * List/ledger paint select — omits splits (loaded on edit open).
 * Keeps paidBy / createdBy / updatedBy for row attribution.
 */
export const expenseListSelect = {
  id: true,
  title: true,
  totalAmount: true,
  date: true,
  createdAt: true,
  updatedAt: true,
  paidById: true,
  transactionType: true,
  category: true,
  categoryLabel: true,
  isCategoryLocked: true,
  splitMode: true,
  spaceId: true,
  paidBy: { select: expenseMemberSelect },
  createdBy: { select: expenseMemberSelect },
  updatedBy: { select: expenseMemberSelect },
} as const;

/** Full expense + splits for the edit form. */
export const expenseEditSelect = {
  id: true,
  title: true,
  totalAmount: true,
  date: true,
  paidById: true,
  transactionType: true,
  category: true,
  categoryLabel: true,
  splitMode: true,
  createdById: true,
  spaceId: true,
  splits: {
    select: {
      userId: true,
      owedAmount: true,
      share: true,
      percent: true,
    },
  },
} as const;

export type ExpenseLedgerCursor = {
  date: Date;
  id: string;
};

function categoryPrivacyFilter(hidden: ExpenseCategory[]) {
  return hidden.length > 0 ? { category: { notIn: hidden } } : {};
}

/**
 * Keyset page of expenses (newest first). Fetches pageSize+1 to detect hasMore.
 * Optional dateFrom/dateTo bound the ledger (e.g. Jalali year for BUILDING).
 */
export async function queryExpenseLedgerPage(args: {
  spaceId: string;
  hiddenCategories: ExpenseCategory[];
  cursor?: ExpenseLedgerCursor | null;
  pageSize?: number;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const pageSize = args.pageSize ?? EXPENSE_PAGE_SIZE;
  const privacy = categoryPrivacyFilter(args.hiddenCategories);
  const dateWhere =
    args.dateFrom || args.dateTo
      ? {
          date: {
            ...(args.dateFrom ? { gte: args.dateFrom } : {}),
            ...(args.dateTo ? { lte: args.dateTo } : {}),
          },
        }
      : {};
  const cursorWhere = args.cursor
    ? {
        OR: [
          { date: { lt: args.cursor.date } },
          {
            AND: [
              { date: args.cursor.date },
              { id: { lt: args.cursor.id } },
            ],
          },
        ],
      }
    : {};

  const rows = await prisma.expense.findMany({
    where: {
      spaceId: args.spaceId,
      ...privacy,
      ...dateWhere,
      ...cursorWhere,
    },
    select: expenseListSelect,
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: pageSize + 1,
  });

  const hasMore = rows.length > pageSize;
  const expenses = hasMore ? rows.slice(0, pageSize) : rows;
  return { expenses, hasMore };
}
