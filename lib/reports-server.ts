import "server-only";

import type { ExpenseCategory } from "@/lib/categorizer";
import { prisma } from "@/lib/db/prisma";
import { tehranMonthRange } from "@/lib/personal";
import {
  CATEGORY_CHART_COLORS,
  categoryChartKey,
  categoryChartLabel,
  colorForCustomLabel,
  customCategoryChartKey,
  expenseChartKey,
  type CategoryExpenseRow,
  type ReportExpenseLine,
} from "@/lib/reports";

function aggregateCategoryRows(
  rows: {
    category: ExpenseCategory;
    categoryLabel: string | null;
    totalAmount: number;
  }[],
): CategoryExpenseRow[] {
  type Acc = {
    category: ExpenseCategory;
    amount: number;
    label: string;
    key: string;
    fill: string;
  };

  const totals = new Map<string, Acc>();
  for (const row of rows) {
    const custom = row.categoryLabel?.trim();
    const key = custom
      ? customCategoryChartKey(custom)
      : categoryChartKey(row.category);
    const existing = totals.get(key);
    if (existing) {
      existing.amount += row.totalAmount;
      continue;
    }
    totals.set(key, {
      category: row.category,
      amount: row.totalAmount,
      label: custom ?? categoryChartLabel(row.category),
      key,
      fill: custom
        ? colorForCustomLabel(custom)
        : `var(--color-${categoryChartKey(row.category)})`,
    });
  }

  return [...totals.values()]
    .filter((row) => row.amount > 0)
    .map((row) => ({
      category: row.category,
      amount: row.amount,
      fill:
        row.fill.startsWith("var(")
          ? row.fill
          : row.fill ||
            CATEGORY_CHART_COLORS[row.category] ||
            CATEGORY_CHART_COLORS.OTHER ||
            "#64748b",
      key: row.key,
      label: row.label,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Aggregate EXPENSE transactions for a space in an explicit date window.
 * Server-only — must not be imported from Client Components.
 */
export async function getExpensesByCategoryInRange(
  spaceId: string,
  start: Date,
  end: Date,
  paidById?: string | null,
  categoryNotIn?: ExpenseCategory[] | null,
): Promise<CategoryExpenseRow[]> {
  const rows = await prisma.expense.findMany({
    where: {
      spaceId,
      transactionType: "EXPENSE",
      date: { gte: start, lte: end },
      ...(paidById ? { paidById } : {}),
      ...(categoryNotIn && categoryNotIn.length > 0
        ? { category: { notIn: categoryNotIn } }
        : {}),
    },
    select: {
      category: true,
      categoryLabel: true,
      totalAmount: true,
    },
  });

  return aggregateCategoryRows(rows);
}

/** Derive category chart rows from already-fetched report lines (one DB round-trip). */
export function categoryRowsFromExpenseLines(
  lines: {
    category: ExpenseCategory;
    categoryLabel: string | null;
    totalAmount: number;
  }[],
): CategoryExpenseRow[] {
  return aggregateCategoryRows(lines);
}

/**
 * Expense line items in a date window (for report category drill-down).
 */
export async function getExpenseLinesInRange(
  spaceId: string,
  start: Date,
  end: Date,
  paidById?: string | null,
  categoryNotIn?: ExpenseCategory[] | null,
): Promise<ReportExpenseLine[]> {
  const rows = await prisma.expense.findMany({
    where: {
      spaceId,
      transactionType: "EXPENSE",
      date: { gte: start, lte: end },
      ...(paidById ? { paidById } : {}),
      ...(categoryNotIn && categoryNotIn.length > 0
        ? { category: { notIn: categoryNotIn } }
        : {}),
    },
    select: {
      id: true,
      title: true,
      totalAmount: true,
      date: true,
      category: true,
      categoryLabel: true,
    },
    orderBy: { date: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    totalAmount: row.totalAmount,
    date: row.date.toISOString(),
    category: row.category,
    categoryLabel: row.categoryLabel,
    chartKey: expenseChartKey(row.category, row.categoryLabel),
  }));
}

/**
 * Aggregate EXPENSE transactions for a space in the given Gregorian
 * calendar month (Asia/Tehran), grouped by category.
 */
export async function getExpensesByCategory(
  spaceId: string,
  month: Date = new Date(),
  paidById?: string | null,
  categoryNotIn?: ExpenseCategory[] | null,
): Promise<CategoryExpenseRow[]> {
  const { start, end } = tehranMonthRange(month);
  return getExpensesByCategoryInRange(
    spaceId,
    start,
    end,
    paidById,
    categoryNotIn,
  );
}

export async function getExpenseLinesForMonth(
  spaceId: string,
  month: Date = new Date(),
  paidById?: string | null,
  categoryNotIn?: ExpenseCategory[] | null,
): Promise<ReportExpenseLine[]> {
  const { start, end } = tehranMonthRange(month);
  return getExpenseLinesInRange(
    spaceId,
    start,
    end,
    paidById,
    categoryNotIn,
  );
}
