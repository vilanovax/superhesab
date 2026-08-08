"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  formatJalaliYear,
  jalaliMonth,
  jalaliYear,
  monthLabelFa,
} from "@/lib/building";
import { cn } from "@/lib/utils";

type BuildingReportPeriodFilterProps = {
  spaceId: string;
  year: number;
  /** `null` = full Jalali year. */
  month: number | null;
  /** Aligned with the «بازه گزارش» label row (e.g. Excel/PDF). */
  actions?: ReactNode;
};

/**
 * Compact Jalali period chips — current/selected month + neighbors,
 * with «بیشتر» to expand all 12. Navigates via `?year=&tab=report&rm=`.
 */
export function BuildingReportPeriodFilter({
  spaceId,
  year,
  month,
  actions,
}: BuildingReportPeriodFilterProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const nowY = jalaliYear();
  const nowM = jalaliMonth();

  const visibleMonths = useMemo(() => {
    if (expanded) {
      return Array.from({ length: 12 }, (_, i) => i + 1);
    }
    const focus =
      month ?? (year === nowY ? nowM : Math.min(12, Math.max(1, nowM)));
    const set = new Set<number>();
    for (let d = -1; d <= 1; d++) {
      const m = focus + d;
      if (m >= 1 && m <= 12) set.add(m);
    }
    if (year === nowY) set.add(nowM);
    if (month != null) set.add(month);
    return [...set].sort((a, b) => a - b);
  }, [expanded, month, year, nowY, nowM]);

  const showToggle = expanded || visibleMonths.length < 12;

  function go(nextMonth: number | null) {
    const params = new URLSearchParams();
    params.set("year", String(year));
    params.set("tab", "report");
    if (nextMonth != null) params.set("rm", String(nextMonth));
    startTransition(() => {
      router.push(`/spaces/${spaceId}?${params.toString()}`, {
        scroll: false,
      });
    });
  }

  return (
    <div
      className={cn(
        "space-y-1.5",
        pending && "pointer-events-none opacity-70",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0 flex items-baseline gap-2">
          <p className="text-caption font-medium text-muted-foreground">
            بازه گزارش
          </p>
          <p className="text-micro text-muted-foreground">
            {formatJalaliYear(year)}
          </p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div
        role="radiogroup"
        aria-label="فیلتر بازه زمانی شمسی"
        className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          role="radio"
          aria-checked={month == null}
          onClick={() => go(null)}
          className={cn(
            "shrink-0 rounded-xl px-2.5 py-1.5 text-caption font-semibold transition-colors",
            month == null
              ? "bg-primary text-primary-foreground"
              : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          کل سال
        </button>
        {visibleMonths.map((m) => {
          const on = month === m;
          const isNow = year === nowY && m === nowM;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => go(m)}
              className={cn(
                "shrink-0 rounded-xl px-2.5 py-1.5 text-caption font-semibold transition-colors",
                on
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
                !on && isNow && "ring-1 ring-primary/35",
              )}
            >
              {monthLabelFa(m)}
            </button>
          );
        })}
        {showToggle ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="shrink-0 rounded-xl px-2.5 py-1.5 text-caption font-semibold text-primary/90 transition-colors hover:bg-primary/10"
          >
            {expanded ? "کمتر" : "بیشتر"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
