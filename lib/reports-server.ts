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
  type CategoryExpenseRow,
} from "@/lib/reports";

/**
 * Aggregate EXPENSE transactions for a space in the given calendar month
 * (Asia/Tehran), grouped by ExpenseCategory or custom categoryLabel.
 * Server-only — must not be imported from Client Components.
 */
export async function getExpensesByCategory(
  spaceId: string,
  month: Date = new Date(),
  paidById?: string | null,
): Promise<CategoryExpenseRow[]> {
  const { start, end } = tehranMonthRange(month);

  const rows = await prisma.expense.findMany({
    where: {
      spaceId,
      transactionType: "EXPENSE",
      date: { gte: start, lte: end },
      ...(paidById ? { paidById } : {}),
    },
    select: {
      category: true,
      categoryLabel: true,
      totalAmount: true,
    },
  });

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
