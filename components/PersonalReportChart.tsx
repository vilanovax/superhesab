"use client";

import { useMemo, useState } from "react";
import {
  CATEGORY_EMOJI,
  type ExpenseCategory,
} from "@/lib/categorizer";
import { formatDateFaShort, type SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import {
  CATEGORY_CHART_COLORS,
  categoryChartLabel,
  type CategoryExpenseRow,
  type ReportExpenseLine,
} from "@/lib/reports";
import { categoryBudgetProgress } from "@/lib/personal";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label, Pie, PieChart, Cell } from "recharts";

type PersonalReportChartProps = {
  data: CategoryExpenseRow[];
  /** Line items for the same period as `data` (category drill-down). */
  expenseLines?: ReportExpenseLine[];
  currency?: SpaceCurrency;
  /** Cap per ExpenseCategory (builtin only). */
  categoryBudgets?: Partial<Record<ExpenseCategory, number>>;
  /** e.g. "سال ۱۴۰۵" or "هزینه ماه" */
  periodLabel?: string;
  emptyTitle?: string;
  emptyHint?: string;
  /** Donut center caption — e.g. "جمع سال" / "جمع ماه" */
  totalCenterLabel?: string;
};

function buildChartConfig(rows: CategoryExpenseRow[]): ChartConfig {
  const config: ChartConfig = {
    amount: { label: "مبلغ" },
  };

  for (const row of rows) {
    const isCustom = row.key.startsWith("custom-");
    config[row.key] = {
      label: isCustom
        ? `🏷️ ${row.label}`
        : `${CATEGORY_EMOJI[row.category]} ${row.label}`,
      color:
        row.fill.startsWith("#")
          ? row.fill
          : (CATEGORY_CHART_COLORS[row.category] ??
            CATEGORY_CHART_COLORS.OTHER ??
            "#64748b"),
    };
  }

  return config;
}

export function PersonalReportChart({
  data,
  expenseLines = [],
  currency = "TOMAN",
  categoryBudgets,
  periodLabel = "هزینه ماه",
  emptyTitle = "گزارش ماه خالی است",
  emptyHint = "با ثبت چند هزینه، سهم هر دسته به‌صورت دایره‌ای اینجا می‌آید.",
  totalCenterLabel = "جمع ماه",
}: PersonalReportChartProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const total = data.reduce((sum, row) => sum + row.amount, 0);
  const canDrill = expenseLines.length > 0;

  const activeRow = useMemo(
    () => data.find((r) => r.key === activeKey) ?? null,
    [data, activeKey],
  );

  const activeLines = useMemo(() => {
    if (!activeKey) return [];
    return expenseLines.filter((line) => line.chartKey === activeKey);
  }, [expenseLines, activeKey]);

  if (total <= 0 || data.length === 0) {
    return (
      <div className="animate-fade-up rounded-2xl border border-dashed border-border/70 bg-card/70 px-5 py-10 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/8 text-primary">
          <svg viewBox="0 0 48 48" className="size-8" fill="none" aria-hidden>
            <circle
              cx="24"
              cy="24"
              r="14"
              stroke="currentColor"
              strokeWidth="2.25"
              opacity="0.35"
            />
            <path
              d="M24 10a14 14 0 0 1 14 14"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="mt-3 text-body font-semibold text-foreground">
          {emptyTitle}
        </p>
        <p className="mx-auto mt-1 max-w-[16rem] text-body-sm leading-relaxed text-muted-foreground">
          {emptyHint}
        </p>
      </div>
    );
  }

  const chartConfig = buildChartConfig(data);

  function openCategory(key: string) {
    if (!canDrill) return;
    setActiveKey(key);
  }

  return (
    <>
      <div className="animate-fade-up overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm">
        <div className="border-b border-border/45 px-4 py-3">
          <h2 className="text-body-sm font-semibold text-foreground">
            سهم دسته‌ها
          </h2>
          <p className="mt-0.5 text-caption text-muted-foreground">
            {periodLabel} · {formatCurrency(total, currency)}
          </p>
          {canDrill ? (
            <p className="mt-1 text-micro text-muted-foreground">
              روی هر دسته بزنید تا جزئیات را ببینید
            </p>
          ) : null}
        </div>

        <div className="px-2 pb-2 pt-4 sm:px-4">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[260px] w-full"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    nameKey="key"
                    formatter={(value, name) => {
                      const amount =
                        typeof value === "number"
                          ? value
                          : Number(value ?? 0);
                      const label =
                        chartConfig[String(name)]?.label ??
                        categoryChartLabel(
                          String(name).toUpperCase() as ExpenseCategory,
                        );
                      return (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-semibold tabular-nums text-foreground">
                            {formatCurrency(amount, currency)}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Pie
                data={data}
                dataKey="amount"
                nameKey="key"
                innerRadius={68}
                outerRadius={100}
                strokeWidth={3}
                stroke="var(--card)"
                className={canDrill ? "cursor-pointer outline-none" : undefined}
                onClick={(_, index) => {
                  const row = data[index];
                  if (row) openCategory(row.key);
                }}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={
                      entry.fill.startsWith("var(")
                        ? entry.fill
                        : entry.fill
                    }
                  />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (
                      !viewBox ||
                      !("cx" in viewBox) ||
                      !("cy" in viewBox)
                    ) {
                      return null;
                    }
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) - 10}
                          className="fill-muted-foreground text-[11px]"
                        >
                          {totalCenterLabel}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 12}
                          className="fill-foreground text-sm font-bold"
                        >
                          {formatCurrency(total, currency)}
                        </tspan>
                      </text>
                    );
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>

        <ul className="space-y-2 border-t border-border/45 px-4 py-4">
          {data.map((row) => {
            const pct = Math.round((row.amount * 100) / total);
            const color =
              chartConfig[row.key]?.color ??
              CATEGORY_CHART_COLORS[row.category] ??
              "#64748b";
            const isCustom = row.key.startsWith("custom-");
            const cap =
              !isCustom && categoryBudgets
                ? categoryBudgets[row.category]
                : undefined;
            const progress =
              cap != null && cap > 0
                ? categoryBudgetProgress(row.amount, cap)
                : null;
            return (
              <li key={row.key}>
                <button
                  type="button"
                  disabled={!canDrill}
                  onClick={() => openCategory(row.key)}
                  className={cn(
                    "w-full rounded-xl bg-muted/40 px-2.5 py-2 text-start text-body-sm transition-colors",
                    canDrill &&
                      "hover:bg-muted/70 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    !canDrill && "cursor-default",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color as string }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {isCustom ? "🏷️" : CATEGORY_EMOJI[row.category]}{" "}
                      {row.label}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {pct}%
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold text-foreground">
                      {formatCurrency(row.amount, currency)}
                    </span>
                    {canDrill ? (
                      <span
                        className="shrink-0 text-caption text-muted-foreground"
                        aria-hidden
                      >
                        ‹
                      </span>
                    ) : null}
                  </div>
                  {progress ? (
                    <div className="mt-2 ps-5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width]",
                            progress.over ? "bg-destructive" : "bg-primary",
                          )}
                          style={{
                            width: `${Math.min(100, progress.percent)}%`,
                          }}
                        />
                      </div>
                      <p
                        className={cn(
                          "mt-1 text-micro",
                          progress.over
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {progress.over
                          ? `${formatCurrency(Math.abs(progress.remaining), currency)} بیش از سقف ${formatCurrency(cap!, currency)}`
                          : `${formatCurrency(progress.remaining, currency)} باقی از ${formatCurrency(cap!, currency)} · ${progress.percent}٪`}
                      </p>
                    </div>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <Drawer
        open={Boolean(activeRow)}
        onOpenChange={(open) => {
          if (!open) setActiveKey(null);
        }}
      >
        <DrawerContent className="mt-0! h-auto max-h-[85dvh] gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero shrink-0 px-4 pb-2.5 pt-1">
            <DrawerHeader className="space-y-0 p-0 text-start">
              <DrawerTitle className="text-body font-bold text-on-hero">
                {activeRow
                  ? `${activeRow.key.startsWith("custom-") ? "🏷️" : CATEGORY_EMOJI[activeRow.category]} ${activeRow.label}`
                  : "جزئیات دسته"}
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-caption text-on-hero/70">
                {periodLabel}
                {activeRow
                  ? ` · ${formatCurrency(activeRow.amount, currency)} · ${activeLines.length.toLocaleString("fa-IR")} مورد`
                  : ""}
              </DrawerDescription>
            </DrawerHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {activeLines.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/60 px-3 py-8 text-center text-body-sm text-muted-foreground">
                موردی در این بازه نیست.
              </p>
            ) : (
              <ul className="space-y-2">
                {activeLines.map((line) => (
                  <li
                    key={line.id}
                    className="rounded-xl border border-border/50 bg-card px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm font-semibold text-foreground">
                          {line.title}
                        </p>
                        <p className="mt-0.5 text-caption text-muted-foreground">
                          {formatDateFaShort(line.date)}
                        </p>
                      </div>
                      <p className="shrink-0 tabular-nums text-body-sm font-bold text-foreground">
                        {formatCurrency(line.totalAmount, currency)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
