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
