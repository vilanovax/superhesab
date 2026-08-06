"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { formatJalaliYear } from "@/lib/building";
import { cn } from "@/lib/utils";

type BuildingExpenseYearFilterProps = {
  spaceId: string;
  year: number;
};

/**
 * Jalali year chip for BUILDING expenses tab.
 * Navigates via `?year=&tab=expenses`.
 */
export function BuildingExpenseYearFilter({
  spaceId,
  year,
}: BuildingExpenseYearFilterProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(nextYear: number) {
    if (nextYear < 1390 || nextYear > 1500) return;
    const params = new URLSearchParams();
    params.set("year", String(nextYear));
    params.set("tab", "expenses");
    startTransition(() => {
      router.push(`/spaces/${spaceId}?${params.toString()}`, {
        scroll: false,
      });
    });
  }

  return (
    <div
      className={cn(
        "mb-3 flex items-center justify-between gap-2 px-0.5",
        pending && "pointer-events-none opacity-70",
      )}
    >
      <p className="text-caption font-medium text-muted-foreground">
        سال هزینه
      </p>
      <div
        className="flex items-center gap-0.5 rounded-full bg-muted/70 p-0.5 ring-1 ring-border/60"
        role="group"
        aria-label="فیلتر سال شمسی هزینه‌ها"
      >
        <button
          type="button"
          onClick={() => go(year - 1)}
          disabled={year <= 1390 || pending}
          className="rounded-full px-2.5 py-1 text-micro font-semibold text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-40"
          aria-label="سال قبل"
        >
          ‹
        </button>
        <span className="min-w-[2.75rem] text-center text-caption font-bold tabular-nums text-foreground">
          {formatJalaliYear(year)}
        </span>
        <button
          type="button"
          onClick={() => go(year + 1)}
          disabled={year >= 1500 || pending}
          className="rounded-full px-2.5 py-1 text-micro font-semibold text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-40"
          aria-label="سال بعد"
        >
          ›
        </button>
      </div>
    </div>
  );
}
