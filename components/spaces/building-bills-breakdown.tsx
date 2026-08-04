"use client";

import { useMemo } from "react";
import { formatMoney, type SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import type { ReportExpenseLine } from "@/lib/reports";
import { cn } from "@/lib/utils";

type BuildingBillsBreakdownProps = {
  expenseLines: ReportExpenseLine[];
  currency: SpaceCurrency;
};

type BillRow = {
  tag: string;
  amount: number;
  count: number;
};

const TAG_META: Record<string, { emoji: string; tone: string }> = {
  آب: { emoji: "💧", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  برق: {
    emoji: "⚡",
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  گاز: {
    emoji: "🔥",
    tone: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  اینترنت: {
    emoji: "📶",
    tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
};

function metaFor(tag: string) {
  return (
    TAG_META[tag] ?? {
      emoji: "🧾",
      tone: "bg-muted text-muted-foreground",
    }
  );
}

/**
 * Compact قبوض breakdown — share bars relative to bill subtotal (not all مشاع).
 */
export function BuildingBillsBreakdown({
  expenseLines,
  currency,
}: BuildingBillsBreakdownProps) {
  const { rows, billsTotal, billsCount } = useMemo(() => {
    const map = new Map<string, BillRow>();
    for (const line of expenseLines) {
      if (line.category !== "BUILDING_BILLS") continue;
      const tag = line.categoryLabel?.trim() || "سایر";
      const prev = map.get(tag) ?? { tag, amount: 0, count: 0 };
      prev.amount += line.totalAmount;
      prev.count += 1;
      map.set(tag, prev);
    }
    const rows = [...map.values()].sort((a, b) => b.amount - a.amount);
    const billsTotal = rows.reduce((s, r) => s + r.amount, 0);
    const billsCount = rows.reduce((s, r) => s + r.count, 0);
    return { rows, billsTotal, billsCount };
  }, [expenseLines]);

  if (rows.length === 0 || billsTotal <= 0) return null;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/45 bg-card shadow-sm animate-fade-up"
      aria-label="قبوض به‌تفکیک"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <p className="text-caption font-semibold text-foreground">قبوض</p>
          <p className="text-[10px] text-muted-foreground">
            {billsCount} مورد · جمع {formatMoney(billsTotal)}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-sky-500/10 px-2 py-1 text-micro font-bold tabular-nums text-sky-700 dark:text-sky-300">
          {formatCurrency(billsTotal, currency)}
        </span>
      </div>

      <ul className="space-y-1.5 px-2.5 pb-2.5">
        {rows.map((row) => {
          const pct =
            billsTotal > 0
              ? Math.max(1, Math.round((row.amount / billsTotal) * 100))
              : 0;
          const meta = metaFor(row.tag);
          return (
            <li
              key={row.tag}
              className="rounded-xl bg-muted/35 px-2 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg text-sm",
                    meta.tone,
                  )}
                  aria-hidden
                >
                  {meta.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-caption font-semibold text-foreground">
                      {row.tag}
                      <span className="ms-1 font-normal text-muted-foreground">
                        · {row.count}
                      </span>
                    </p>
                    <p className="shrink-0 text-caption font-bold tabular-nums text-foreground">
                      {formatCurrency(row.amount, currency)}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div
                      className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border/60"
                      role="presentation"
                    >
                      <div
                        className="h-full rounded-full bg-sky-500/80 transition-[width] duration-300 ease-out"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-end text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {pct}٪
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
