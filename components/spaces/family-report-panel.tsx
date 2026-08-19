"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { FamilyFirstRun } from "@/components/spaces/family-first-run";
import { Button } from "@/components/ui/button";
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
import { useUiStore } from "@/lib/stores/ui-store";
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
  canMutate?: boolean;
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

/** Deep-link report payer filter (`?rfilter=`; omit for all). */
function readReportFilter(currentUserId: string, memberIds: Set<string>): string {
  if (typeof window === "undefined") return "all";
  const raw = new URL(window.location.href).searchParams.get("rfilter");
  if (!raw || raw === "all") return "all";
  if (raw === currentUserId || memberIds.has(raw)) return raw;
  return "all";
}

function syncReportFilterQuery(filter: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const prev = `${url.pathname}${url.search}`;
  if (filter === "all") url.searchParams.delete("rfilter");
  else url.searchParams.set("rfilter", filter);
  const next = `${url.pathname}${url.search}`;
  if (prev === next) return;
  window.history.replaceState(null, "", next);
}

export function FamilyReportPanel({
  currentUserId,
  members,
  monthExpenses,
  monthlyBudget,
  currency,
  initialReport,
  categoryBudgets,
  canMutate = true,
}: FamilyReportPanelProps) {
  const memberIds = useMemo(
    () => new Set(members.map((m) => m.userId)),
    [members],
  );
  const [filter, setFilter] = useState<string>(() =>
    readReportFilter(currentUserId, memberIds),
  );
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

  const openExpenseForm = useUiStore((s) => s.openExpenseForm);
  const monthEmpty = monthExpenses.length === 0;
  const showPayerFilter = members.length > 1 && !monthEmpty;

  function selectFilter(next: string) {
    startTransition(() => {
      setFilter(next);
      syncReportFilterQuery(next);
    });
  }

  if (monthEmpty) {
    return (
      <FamilyFirstRun
        icon={<ReportMark />}
        title="سهم دسته‌ها اینجا می‌آید"
        description="با ثبت هزینه، قبض و خرید به‌صورت دایره دیده می‌شود. درآمد در خلاصهٔ بالا می‌ماند."
      >
        {canMutate ? (
          <Button
            type="button"
            className="h-11 w-full rounded-xl text-body-sm font-semibold"
            onClick={() => openExpenseForm({ transactionType: "EXPENSE" })}
          >
            ثبت اولین هزینه
          </Button>
        ) : null}
      </FamilyFirstRun>
    );
  }

  return (
    <div className="space-y-3">
      {showPayerFilter ? (
        <div className="rounded-2xl border border-border/55 bg-card p-3 shadow-sm">
          <h2 className="mb-2 text-pretty text-caption font-semibold text-muted-foreground">
            فیلتر گزارش
          </h2>
          <Select value={filter} onValueChange={selectFilter}>
            <SelectTrigger
              className="h-11 rounded-xl border-border/70 bg-sheet-muted"
              aria-label="فیلتر گزارش بر اساس پرداخت‌کننده"
            >
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
      ) : null}

      {hasBudget ? (
        <div className="rounded-2xl border border-border/55 bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-2 text-body-sm">
            <span className="font-semibold text-foreground">بودجه ماه</span>
            <span className="tabular-nums text-muted-foreground">
              {formatCurrency(expenseTotal, currency)} /{" "}
              {formatCurrency(monthlyBudget!, currency)}
            </span>
          </div>
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.min(100, usedPct!)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="مصرف بودجه ماه"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
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
        emptyTitle="در این نما هزینه‌ای نیست"
        emptyHint="فیلتر را عوض کنید یا هزینهٔ جدیدی ثبت کنید."
      />
    </div>
  );
}

function ReportMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-7" fill="none" aria-hidden="true">
      <circle
        cx="24"
        cy="24"
        r="14"
        stroke="currentColor"
        strokeWidth="2.25"
        opacity="0.35"
      />
      <path
        d="M24 10a14 14 0 0 1 12.1 7M24 10a14 14 0 0 0-10 20.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.18" />
    </svg>
  );
}
