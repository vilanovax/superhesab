"use client";

import { useMemo } from "react";
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
};

type BillTagRow = { tag: string; amount: number; count: number };

/**
 * Compact stats strip for BUILDING report tab — period KPIs, top category,
 * top expenses, and قبوض tag breakdown when present.
 */
export function BuildingReportInsights({
  categoryRows,
  expenseLines,
  currency,
  periodLabel,
}: BuildingReportInsightsProps) {
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
      .slice(0, 5);

    const billMap = new Map<string, BillTagRow>();
    for (const line of expenseLines) {
      if (line.category !== "BUILDING_BILLS") continue;
      const tag = line.categoryLabel?.trim() || "سایر قبوض";
      const prev = billMap.get(tag) ?? { tag, amount: 0, count: 0 };
      prev.amount += line.totalAmount;
      prev.count += 1;
      billMap.set(tag, prev);
    }
    const billTags = [...billMap.values()].sort(
      (a, b) => b.amount - a.amount,
    );

    return {
      total,
      count,
      average,
      topCategory,
      topCategoryPct,
      topExpenses,
      billTags,
    };
  }, [categoryRows, expenseLines]);

  if (stats.count === 0 || stats.total <= 0) return null;

  const unit = currencyLabel(currency);

  return (
    <section
      className="mb-3 space-y-2.5 animate-fade-up"
      aria-label="خلاصه آماری گزارش"
    >
      {/* Period KPIs */}
      <div className="overflow-hidden rounded-2xl border border-border/45 bg-card shadow-sm">
        <div className="flex items-baseline justify-between gap-2 border-b border-border/40 px-3.5 py-2.5">
          <p className="text-body-sm font-semibold text-foreground">
            خلاصه بازه
          </p>
          {periodLabel ? (
            <p className="text-micro text-muted-foreground">{periodLabel}</p>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-px bg-border/40">
          <Kpi
            label="جمع مشاع"
            value={formatMoney(stats.total)}
            hint={unit}
          />
          <Kpi
            label="تعداد"
            value={String(stats.count)}
            hint="تراکنش"
            tone="default"
          />
          <Kpi
            label="میانگین"
            value={formatMoney(stats.average)}
            hint={unit}
          />
        </div>
        {stats.topCategory ? (
          <p className="border-t border-border/40 px-3.5 py-2 text-caption text-muted-foreground">
            بالاترین دسته:{" "}
            <span className="font-semibold text-foreground">
              {stats.topCategory.label}
            </span>
            <span className="tabular-nums text-foreground/80">
              {" "}
              · {stats.topCategoryPct}٪ ·{" "}
              {formatCurrency(stats.topCategory.amount, currency)}
            </span>
          </p>
        ) : null}
      </div>

      {/* Top expenses */}
      <div className="overflow-hidden rounded-2xl border border-border/45 bg-card shadow-sm">
        <div className="border-b border-border/40 px-3.5 py-2.5">
          <p className="text-body-sm font-semibold text-foreground">
            بیشترین هزینه‌ها
          </p>
          <p className="mt-0.5 text-micro text-muted-foreground">
            تا ۵ مورد با بالاترین مبلغ در این بازه
          </p>
        </div>
        <ol className="divide-y divide-border/35">
          {stats.topExpenses.map((line, index) => {
            const catLabel =
              line.category === "OTHER" || line.category === "OTHER_INCOME"
                ? line.categoryLabel?.trim() ||
                  CATEGORY_LABELS[line.category]
                : formatCategoryWithTag(
                    CATEGORY_LABELS[line.category],
                    line.categoryLabel,
                  );
            return (
              <li
                key={line.id}
                className="flex items-center gap-2.5 px-3.5 py-2.5"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg text-micro font-bold tabular-nums",
                    index === 0
                      ? "bg-primary/12 text-primary"
                      : "bg-muted/80 text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-foreground">
                    {line.title}
                  </p>
                  <p className="truncate text-micro text-muted-foreground">
                    {catLabel}
                    {" · "}
                    {formatDateFaShort(line.date)}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-secondary/80 px-2 py-1 text-caption font-bold tabular-nums text-secondary-foreground">
                  {formatCurrency(line.totalAmount, currency)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* قبوض by tag */}
      {stats.billTags.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border/45 bg-card shadow-sm">
          <div className="border-b border-border/40 px-3.5 py-2.5">
            <p className="text-body-sm font-semibold text-foreground">
              قبوض به‌تفکیک
            </p>
            <p className="mt-0.5 text-micro text-muted-foreground">
              آب، برق، گاز و تگ‌های ثبت‌شده
            </p>
          </div>
          <ul className="divide-y divide-border/35">
            {stats.billTags.map((row) => {
              const share =
                stats.total > 0
                  ? Math.round((row.amount / stats.total) * 100)
                  : 0;
              return (
                <li
                  key={row.tag}
                  className="flex items-center justify-between gap-2 px-3.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-caption font-semibold text-foreground">
                      {row.tag}
                    </p>
                    <p className="text-micro text-muted-foreground">
                      {row.count} مورد · {share}٪ از کل مشاع
                    </p>
                  </div>
                  <span className="shrink-0 text-caption font-bold tabular-nums text-foreground">
                    {formatCurrency(row.amount, currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "muted";
}) {
  return (
    <div className="bg-card px-2 py-2.5 text-center">
      <p className="text-[10px] font-semibold text-foreground/50">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-[13px] font-bold tabular-nums tracking-tight text-foreground",
          tone === "muted" && "text-foreground/80",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-foreground/40">{hint}</p>
    </div>
  );
}
