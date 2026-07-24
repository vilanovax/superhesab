"use client";

import {
  CATEGORY_EMOJI,
  type ExpenseCategory,
} from "@/lib/categorizer";
import type { SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import {
  CATEGORY_CHART_COLORS,
  categoryChartLabel,
  type CategoryExpenseRow,
} from "@/lib/reports";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Label, Pie, PieChart, Cell } from "recharts";

type PersonalReportChartProps = {
  data: CategoryExpenseRow[];
  currency?: SpaceCurrency;
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
  currency = "TOMAN",
}: PersonalReportChartProps) {
  const total = data.reduce((sum, row) => sum + row.amount, 0);

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
          گزارش ماه خالی است
        </p>
        <p className="mx-auto mt-1 max-w-[16rem] text-body-sm leading-relaxed text-muted-foreground">
          با ثبت چند هزینه، سهم هر دسته به‌صورت دایره‌ای اینجا می‌آید.
        </p>
      </div>
    );
  }

  const chartConfig = buildChartConfig(data);

  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm">
      <div className="border-b border-border/45 px-4 py-3">
        <h2 className="text-body-sm font-semibold text-foreground">
          سهم دسته‌ها
        </h2>
        <p className="mt-0.5 text-caption text-muted-foreground">
          هزینه ماه · {formatCurrency(total, currency)}
        </p>
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
                        جمع ماه
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
          return (
            <li
              key={row.key}
              className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-2.5 py-2 text-body-sm"
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color as string }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {isCustom ? "🏷️" : CATEGORY_EMOJI[row.category]} {row.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {pct}%
              </span>
              <span className="shrink-0 tabular-nums font-semibold text-foreground">
                {formatCurrency(row.amount, currency)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
