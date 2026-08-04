"use client";

import { useMemo, useState } from "react";
import { BuildingAllExpensesDrawer } from "@/components/spaces/building-all-expenses-drawer";
import { formatCategoryWithTag } from "@/lib/building-bill-tags";
import { CATEGORY_EMOJI, CATEGORY_LABELS } from "@/lib/categorizer";
import {
  currencyLabel,
  formatDateFaShort,
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
  /**
   * summary — KPIs (above chart)
   * rankings — top expenses (below chart)
   */
  section?: "summary" | "rankings" | "all";
};

const TOP_PREVIEW = 3;
const TOP_MAX = 5;

/**
 * Dense building-report stats — split so the donut can sit between
 * summary KPIs and the rankings list without a wall of cards.
 * قبوض live in `BuildingBillsBreakdown`.
 */
export function BuildingReportInsights({
  categoryRows,
  expenseLines,
  currency,
  periodLabel,
  section = "all",
}: BuildingReportInsightsProps) {
  const [topsOpen, setTopsOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);

  const stats = useMemo(() => {
    const total = expenseLines.reduce((s, e) => s + e.totalAmount, 0);
    const count = expenseLines.length;
    const average = count > 0 ? Math.trunc(total / count) : 0;

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
      average,
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
            <p className="text-caption font-bold text-foreground">خلاصه بازه</p>
            {periodLabel ? (
              <span className="truncate rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-semibold text-foreground/70">
                {periodLabel}
              </span>
            ) : null}
          </div>

          {/* Hero total — primary scan target */}
          <div className="mx-2.5 mt-2.5 rounded-2xl bg-linear-to-br from-primary/12 via-primary/6 to-transparent px-3.5 py-3 ring-1 ring-primary/15">
            <p className="text-micro font-semibold text-primary/90">
              جمع مشاع
            </p>
            <p className="mt-0.5 text-[1.35rem] font-bold leading-none tracking-tight tabular-nums text-foreground">
              {formatMoney(stats.total)}
            </p>
            <p className="mt-1 text-micro font-medium text-muted-foreground">
              {unit}
            </p>
          </div>

          {/* Secondary metrics */}
          <div className="mt-2 grid grid-cols-2 gap-1.5 px-2.5">
            <div className="rounded-xl bg-muted/50 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-foreground/55">
                تعداد تراکنش
              </p>
              <p className="mt-0.5 text-body font-bold tabular-nums text-foreground">
                {formatMoney(stats.count)}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-foreground/55">
                میانگین هر هزینه
              </p>
              <p className="mt-0.5 text-body font-bold tabular-nums text-foreground">
                {formatMoney(stats.average)}
              </p>
              <p className="text-[10px] text-foreground/45">{unit}</p>
            </div>
          </div>

          {/* Top category with share bar — clarifies the % relationship */}
          {stats.topCategory ? (
            <div className="m-2.5 mt-2 rounded-2xl border border-border/40 bg-muted/30 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    بالاترین دسته
                  </p>
                  <p className="mt-0.5 truncate text-caption font-bold text-foreground">
                    <span aria-hidden className="me-1">
                      {CATEGORY_EMOJI[stats.topCategory.category] ?? "📦"}
                    </span>
                    {stats.topCategory.label}
                  </p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="text-caption font-bold tabular-nums text-primary">
                    {stats.topCategoryPct}٪
                  </p>
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    {formatCurrency(stats.topCategory.amount, currency)}
                  </p>
                </div>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-border/70"
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
                <p className="text-caption font-semibold text-foreground">
                  بیشترین هزینه‌ها
                </p>
                <p className="text-[10px] text-muted-foreground">
                  تا {TOP_MAX} مورد برتر این بازه
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAllOpen(true)}
                className="shrink-0 rounded-xl bg-primary/10 px-2.5 py-1.5 text-micro font-bold text-primary transition-colors hover:bg-primary/15 active:scale-[0.98]"
              >
                همه ({expenseLines.length})
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
                      {index + 1}
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
                  onClick={() => setTopsOpen((o) => !o)}
                  className="flex-1 py-2 text-micro font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  {topsOpen
                    ? "کمتر"
                    : `+${stats.topExpenses.length - TOP_PREVIEW} برتر`}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setAllOpen(true)}
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

