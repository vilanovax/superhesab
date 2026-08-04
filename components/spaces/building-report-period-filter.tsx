"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { formatJalaliYear, monthLabelFa } from "@/lib/building";
import { cn } from "@/lib/utils";

type BuildingReportPeriodFilterProps = {
  spaceId: string;
  year: number;
  /** `null` = full Jalali year. */
  month: number | null;
};

/**
 * Minimal Jalali period chips for building shared-cost reports.
 * Navigates via `?year=&tab=report&rm=` (rm omitted = whole year).
 */
export function BuildingReportPeriodFilter({
  spaceId,
  year,
  month,
}: BuildingReportPeriodFilterProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <p className="text-caption font-medium text-muted-foreground">
          بازه گزارش
        </p>
        <p className="text-micro text-muted-foreground">
          {formatJalaliYear(year)}
        </p>
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
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const on = month === m;
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
              )}
            >
              {monthLabelFa(m)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
