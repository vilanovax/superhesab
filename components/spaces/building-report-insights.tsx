"use client";

import { useMemo, useState } from "react";
import { BuildingAllExpensesDrawer } from "@/components/spaces/building-all-expenses-drawer";
import { formatCategoryWithTag } from "@/lib/building-bill-tags";
import { CATEGORY_LABELS } from "@/lib/categorizer";
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
        <section className="overflow-hidden rounded-2xl border border-border/45 bg-card shadow-sm">
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <p className="text-caption font-semibold text-foreground">
              خلاصه بازه
            </p>
            {periodLabel ? (
              <p className="truncate text-micro text-muted-foreground">
                {periodLabel}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-1 px-2 pb-2">
            <Kpi
              label="جمع"
              value={formatMoney(stats.total)}
              hint={unit}
              emphasize
            />
            <Kpi label="تعداد" value={String(stats.count)} hint="تراکنش" />
            <Kpi
              label="میانگین"
              value={formatMoney(stats.average)}
              hint={unit}
            />
          </div>

          {stats.topCategory ? (
            <div className="mx-2 mb-2 flex items-center gap-2 rounded-xl bg-primary/6 px-2.5 py-1.5">
              <span className="shrink-0 text-micro font-medium text-primary">
                بالاترین
              </span>
              <span className="min-w-0 flex-1 truncate text-caption font-semibold text-foreground">
                {stats.topCategory.label}
              </span>
              <span className="shrink-0 text-micro font-bold tabular-nums text-foreground">
                {stats.topCategoryPct}٪
              </span>
            </div>
          ) : null}
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

function Kpi({
  label,
  value,
  hint,
  emphasize = false,
}: {
  label: string;
  value: string;
  hint: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-1.5 py-2 text-center",
        emphasize ? "bg-primary/6" : "bg-muted/40",
      )}
    >
      <p className="text-[10px] font-semibold text-foreground/50">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-[12px] font-bold leading-tight tabular-nums tracking-tight",
          emphasize ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[9px] text-foreground/40">{hint}</p>
    </div>
  );
}
