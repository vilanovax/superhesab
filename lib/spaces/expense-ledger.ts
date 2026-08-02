import { prisma } from "@/lib/db/prisma";
import type { ExpenseCategory } from "@/lib/generated/prisma/enums";

/** Initial + "load more" page size for space expense lists. */
export const EXPENSE_PAGE_SIZE = 30;

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
  spaceId: true,
  paidBy: {
    select: {
      id: true,
      name: true,
      phone: true,
      isVirtual: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      phone: true,
      isVirtual: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      name: true,
      phone: true,
      isVirtual: true,
    },
  },
  splits: {
    select: {
      userId: true,
      owedAmount: true,
      share: true,
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
 */
export async function queryExpenseLedgerPage(args: {
  spaceId: string;
  hiddenCategories: ExpenseCategory[];
  cursor?: ExpenseLedgerCursor | null;
  pageSize?: number;
}) {
  const pageSize = args.pageSize ?? EXPENSE_PAGE_SIZE;
  const privacy = categoryPrivacyFilter(args.hiddenCategories);
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
