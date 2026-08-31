"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { BuildingAllExpensesDrawer } from "@/components/spaces/building-all-expenses-drawer";
import { formatCategoryWithTag } from "@/lib/building-bill-tags";
import { CATEGORY_EMOJI, CATEGORY_LABELS } from "@/lib/categorizer";
import {
  currencyLabel,
  formatDateFaShort,
  formatFaDigits,
  formatMoney,
  type SpaceCurrency,
} from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import type { CategoryExpenseRow, ReportExpenseLine } from "@/lib/reports";
import { cn } from "@/lib/utils";

type BuildingReportInsightsProps = {
  categoryRows: CategoryExpenseRow[];
  expenseLines: ReportExpenseLine[];
  currency: SpaceCurrency;
  periodLabel?: string;
  /** Optional slot (e.g. export) in the summary header. */
  headerAction?: ReactNode;
  /**
   * summary — slim KPIs (above chart)
   * rankings — top expenses (below chart)
   */
  section?: "summary" | "rankings" | "all";
};

const TOP_PREVIEW = 3;
const TOP_MAX = 5;

/**
 * Dense building-report stats — slim summary + rankings.
 * قبوض live in `BuildingBillsBreakdown`.
 */
export function BuildingReportInsights({
  categoryRows,
  expenseLines,
  currency,
  periodLabel,
  headerAction,
  section = "all",
}: BuildingReportInsightsProps) {
  const [topsOpen, setTopsOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);

  const stats = useMemo(() => {
    const total = expenseLines.reduce((s, e) => s + e.totalAmount, 0);
    const count = expenseLines.length;

    const topCategory = [...categoryRows].sort(
      (a, b) => b.amount - a.amount,
    )[0];
    const topCategoryPct =
      topCategory && total > 0
        ? Math.round((topCategory.amount / total) * 100)
        : 0;

    const topExpenses = [...expenseLines]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, TOP_MAX);

    return {
      total,
      count,
      topCategory,
      topCategoryPct,
      topExpenses,
    };
  }, [categoryRows, expenseLines]);

  if (stats.count === 0 || stats.total <= 0) return null;

  const unit = currencyLabel(currency);
  const showSummary = section === "summary" || section === "all";
  const showRankings = section === "rankings" || section === "all";
  const visibleTops = topsOpen
    ? stats.topExpenses
    : stats.topExpenses.slice(0, TOP_PREVIEW);
  const hasMoreTops = stats.topExpenses.length > TOP_PREVIEW;

  return (
    <div className="space-y-2 animate-fade-up" aria-label="خلاصه آماری گزارش">
      {showSummary ? (
        <section
          className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm"
          aria-label="خلاصه بازه"
        >
          <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
            <div className="min-w-0">
              <h2 className="text-pretty text-caption font-bold text-foreground">
                خلاصه بازه
              </h2>
              {periodLabel ? (
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {periodLabel}
                  {stats.count > 0
                    ? ` · ${formatFaDigits(stats.count)} هزینه`
                    : ""}
                </p>
              ) : stats.count > 0 ? (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatFaDigits(stats.count)} هزینه
                </p>
              ) : null}
            </div>
            {headerAction ? (
              <div className="shrink-0">{headerAction}</div>
            ) : null}
          </div>

          <div className="mx-2.5 mt-2 flex items-end justify-between gap-3 rounded-2xl bg-linear-to-br from-primary/12 via-primary/6 to-transparent px-3.5 py-2.5 ring-1 ring-primary/15">
            <div className="min-w-0">
              <p className="text-micro font-semibold text-primary/90">
                جمع مشاع
              </p>
              <p className="mt-0.5 text-[1.25rem] font-bold leading-none tracking-tight tabular-nums text-foreground">
                {formatMoney(stats.total)}
              </p>
              <p className="mt-0.5 text-micro font-medium text-muted-foreground">
                {unit}
              </p>
            </div>
            {stats.topCategory ? (
              <div className="min-w-0 max-w-[48%] text-end">
                <p className="text-[10px] font-semibold text-muted-foreground">
                  بالاترین دسته
                </p>
                <p className="mt-0.5 truncate text-caption font-bold text-foreground">
                  <span aria-hidden className="me-0.5">
                    {CATEGORY_EMOJI[stats.topCategory.category] ?? "📦"}
                  </span>
                  {stats.topCategory.label}
                </p>
                <p className="text-[10px] font-bold tabular-nums text-primary">
                  {formatFaDigits(stats.topCategoryPct)}٪
                </p>
              </div>
            ) : null}
          </div>

          {stats.topCategory ? (
            <div className="mx-2.5 mb-2.5 mt-2">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-border/70"
                role="progressbar"
                aria-valuenow={stats.topCategoryPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`سهم ${stats.topCategory.label} از جمع مشاع`}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                  style={{
                    width: `${Math.min(100, Math.max(2, stats.topCategoryPct))}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="h-2.5" />
          )}
        </section>
      ) : null}

      {showRankings ? (
        <>
          <section className="overflow-hidden rounded-2xl border border-border/45 bg-card shadow-sm">
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <h2 className="text-pretty text-caption font-semibold text-foreground">
                  بیشترین هزینه‌ها
                </h2>
                <p className="text-[10px] text-muted-foreground">
                  تا {formatFaDigits(TOP_MAX)} مورد برتر این بازه
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAllOpen(true)}
                aria-haspopup="dialog"
                className="shrink-0 rounded-xl bg-primary/10 px-2.5 py-1.5 text-micro font-bold text-primary transition-colors hover:bg-primary/15 active:scale-[0.98]"
              >
                همه ({formatFaDigits(expenseLines.length)})
              </button>
            </div>
            <ol className="divide-y divide-border/30">
              {visibleTops.map((line, index) => {
                const catLabel =
                  line.category === "OTHER" ||
                  line.category === "OTHER_INCOME"
                    ? line.categoryLabel?.trim() ||
                      CATEGORY_LABELS[line.category]
                    : formatCategoryWithTag(
                        CATEGORY_LABELS[line.category],
                        line.categoryLabel,
                      );
                return (
                  <li
                    key={line.id}
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums",
                        index === 0
                          ? "bg-primary/12 text-primary"
                          : "bg-muted/70 text-muted-foreground",
                      )}
                    >
                      {formatFaDigits(index + 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-caption font-semibold text-foreground">
                        {line.title}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {catLabel} · {formatDateFaShort(line.date)}
                      </p>
                    </div>
                    <span className="shrink-0 text-caption font-bold tabular-nums text-foreground">
                      {formatCurrency(line.totalAmount, currency)}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="flex border-t border-border/35">
              {hasMoreTops ? (
                <button
                  type="button"
                  aria-expanded={topsOpen}
                  onClick={() => setTopsOpen((o) => !o)}
                  className="flex-1 py-2 text-micro font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  {topsOpen
                    ? "کمتر"
                    : `+${formatFaDigits(stats.topExpenses.length - TOP_PREVIEW)} برتر`}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setAllOpen(true)}
                aria-haspopup="dialog"
                className={cn(
                  "py-2 text-micro font-semibold text-primary transition-colors hover:bg-primary/6",
                  hasMoreTops ? "flex-1 border-s border-border/35" : "w-full",
                )}
              >
                همه هزینه‌ها · سورت
              </button>
            </div>
          </section>

          <BuildingAllExpensesDrawer
            open={allOpen}
            onOpenChange={setAllOpen}
            expenseLines={expenseLines}
            currency={currency}
            periodLabel={periodLabel}
          />
        </>
      ) : null}
    </div>
  );
}
