"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { budgetUsedPercent } from "@/lib/personal";
import {
  CATEGORY_CHART_COLORS,
  categoryChartKey,
  categoryChartLabel,
  colorForCustomLabel,
  customCategoryChartKey,
  type CategoryExpenseRow,
} from "@/lib/reports";
import type { ExpenseCategory } from "@/lib/categorizer";
import { cn } from "@/lib/utils";

const PersonalReportChart = dynamic(
  () =>
    import("@/components/PersonalReportChart").then(
      (m) => m.PersonalReportChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 animate-pulse rounded-2xl bg-muted/40" />
    ),
  },
);

export type FamilyReportMember = {
  userId: string;
  name: string;
};

export type FamilyMonthExpenseRow = {
  category: ExpenseCategory;
  categoryLabel: string | null;
  totalAmount: number;
  paidById: string;
};

type FamilyReportPanelProps = {
  currentUserId: string;
  members: FamilyReportMember[];
  monthExpenses: FamilyMonthExpenseRow[];
  monthlyBudget: number | null;
  currency: SpaceCurrency;
  /** Precomputed full-family chart (server). */
  initialReport: CategoryExpenseRow[];
  categoryBudgets?: Partial<Record<ExpenseCategory, number>>;
};

function aggregateRows(
  rows: FamilyMonthExpenseRow[],
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
    .filter((r) => r.amount > 0)
    .map((r) => ({
      category: r.category,
      amount: r.amount,
      fill: r.fill.startsWith("#")
        ? r.fill
        : r.fill ||
          CATEGORY_CHART_COLORS[r.category] ||
          "#64748b",
      key: r.key,
      label: r.label,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function FamilyReportPanel({
  currentUserId,
  members,
  monthExpenses,
  monthlyBudget,
  currency,
  initialReport,
  categoryBudgets,
}: FamilyReportPanelProps) {
  const [filter, setFilter] = useState<string>("all");
  const [, startTransition] = useTransition();

  const reportData = useMemo(() => {
    if (filter === "all") return initialReport;
    const filtered = monthExpenses.filter((r) => r.paidById === filter);
    return aggregateRows(filtered);
  }, [filter, initialReport, monthExpenses]);

  const expenseTotal = useMemo(
    () =>
      (filter === "all"
        ? monthExpenses
        : monthExpenses.filter((r) => r.paidById === filter)
      ).reduce((s, r) => s + r.totalAmount, 0),
    [filter, monthExpenses],
  );

  const usedPct =
    filter === "all"
      ? budgetUsedPercent(expenseTotal, monthlyBudget)
      : null;
  const hasBudget =
    filter === "all" &&
    monthlyBudget != null &&
    monthlyBudget > 0 &&
    usedPct != null;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/55 bg-card p-3 shadow-sm">
        <p className="mb-2 text-caption font-semibold text-muted-foreground">
          فیلتر گزارش
        </p>
        <Select
          value={filter}
          onValueChange={(v) => startTransition(() => setFilter(v))}
        >
          <SelectTrigger className="h-11 rounded-xl border-border/70 bg-sheet-muted">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">گزارش کل خانواده</SelectItem>
            <SelectItem value={currentUserId}>پرداختی‌های من</SelectItem>
            {members
              .filter((m) => m.userId !== currentUserId)
              .map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  پرداختی‌های {m.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {hasBudget ? (
        <div className="rounded-2xl border border-border/55 bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-2 text-body-sm">
            <span className="font-semibold text-foreground">بودجه ماه</span>
            <span className="tabular-nums text-muted-foreground">
              {formatCurrency(expenseTotal, currency)} /{" "}
              {formatCurrency(monthlyBudget!, currency)}
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                usedPct! > 100 ? "bg-destructive" : "bg-primary",
              )}
              style={{ width: `${Math.min(100, usedPct!)}%` }}
            />
          </div>
          <p className="mt-1.5 text-caption text-muted-foreground">
            {usedPct! > 100
              ? `${usedPct! - 100}٪ بیش از سقف`
              : `${usedPct!}٪ مصرف‌شده`}
          </p>
        </div>
      ) : null}

      <PersonalReportChart
        data={reportData}
        currency={currency}
        categoryBudgets={categoryBudgets}
      />
    </div>
  );
}
