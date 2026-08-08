import {
  CATEGORY_LABELS,
  type ExpenseCategory,
} from "@/lib/categorizer";

/** CSS token key for ChartStyle `--color-*` (e.g. FOOD → food). */
export function categoryChartKey(category: ExpenseCategory): string {
  return category.toLowerCase();
}

/**
 * Vibrant category palette — Tailwind-aligned hex used by chart config
 * and resolved into `var(--color-food)` etc. via ChartContainer.
 */
export const CATEGORY_CHART_COLORS: Partial<
  Record<ExpenseCategory, string>
> = {
  FOOD: "#2563eb",
  TRANSPORT: "#ea580c",
  ACCOMMODATION: "#0d9488",
  ENTERTAINMENT: "#db2777",
  SHOPPING: "#ca8a04",
  OTHER: "#64748b",
  BUILDING_BILLS: "#0284c7",
  BUILDING_ELEVATOR: "#7c3aed",
  BUILDING_CLEANING: "#059669",
  BUILDING_MAINTENANCE: "#d97706",
  BUILDING_GARDENING: "#65a30d",
  BUILDING_SALARY: "#475569",
};

const CUSTOM_PALETTE = [
  "#7c3aed",
  "#0891b2",
  "#be185d",
  "#4d7c0f",
  "#b45309",
  "#4338ca",
];

export type CategoryExpenseRow = {
  category: ExpenseCategory;
  amount: number;
  fill: string;
  /** Unique chart key (builtin lowercase or custom slug). */
  key: string;
  /** Display label (builtin Persian name or custom label). */
  label: string;
};

/** Line item for category drill-down in reports (serializable). */
export type ReportExpenseLine = {
  id: string;
  title: string;
  totalAmount: number;
  /** ISO date string */
  date: string;
  category: ExpenseCategory;
  categoryLabel: string | null;
  /** Same key as CategoryExpenseRow.key */
  chartKey: string;
};

/** Chart bucket key matching aggregateCategoryRows. */
export function expenseChartKey(
  category: ExpenseCategory,
  categoryLabel: string | null | undefined,
): string {
  const custom = categoryLabel?.trim();
  return custom
    ? customCategoryChartKey(custom)
    : categoryChartKey(category);
}

export function categoryChartLabel(category: ExpenseCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function customCategoryChartKey(label: string): string {
  return `custom-${label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 24)}`;
}

export function colorForCustomLabel(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return CUSTOM_PALETTE[hash % CUSTOM_PALETTE.length]!;
}

/**
 * Building report: roll bill tags (آب/برق/…) into one «قبوض» slice so the
 * donut doesn't duplicate `BuildingBillsBreakdown`.
 */
export function collapseBuildingBillsForChart(
  rows: CategoryExpenseRow[],
): CategoryExpenseRow[] {
  const billsKey = categoryChartKey("BUILDING_BILLS");
  let billsAmount = 0;
  const others: CategoryExpenseRow[] = [];

  for (const row of rows) {
    if (row.category === "BUILDING_BILLS") {
      billsAmount += row.amount;
      continue;
    }
    others.push(row);
  }

  if (billsAmount <= 0) return others;

  const collapsed: CategoryExpenseRow = {
    category: "BUILDING_BILLS",
    amount: billsAmount,
    key: billsKey,
    label: categoryChartLabel("BUILDING_BILLS"),
    fill:
      CATEGORY_CHART_COLORS.BUILDING_BILLS ??
      `var(--color-${billsKey})`,
  };

  return [...others, collapsed].sort((a, b) => b.amount - a.amount);
}
