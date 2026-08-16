"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { rememberBuildingPlanYear } from "@/app/actions/building";
import { formatJalaliYear } from "@/lib/building";
import { cn } from "@/lib/utils";

type BuildingYearNavProps = {
  spaceId: string;
  year: number;
  /** Active space tab to preserve when changing year. */
  tab?: "expenses" | "charges" | "units" | "report";
  /**
   * When true (OWNER/EDITOR), also writes `Space.defaultPlanYear`.
   * Viewers still navigate via URL only.
   */
  canRemember?: boolean;
  /** Visual variant for hero (on dark) vs surface panels. */
  tone?: "hero" | "surface";
  className?: string;
};

/**
 * Prev/next fiscal-year control. Remembers the choice as the building default
 * so the next open (without `?year=`) restores the same year.
 */
export function BuildingYearNav({
  spaceId,
  year,
  tab = "charges",
  canRemember = false,
  tone = "hero",
  className,
}: BuildingYearNavProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(nextYear: number) {
    if (pending) return;
    if (nextYear < 1390 || nextYear > 1500) return;

    startTransition(async () => {
      if (canRemember) {
        await rememberBuildingPlanYear({ spaceId, year: nextYear });
      }
      router.push(`/spaces/${spaceId}?year=${nextYear}&tab=${tab}`);
      router.refresh();
    });
  }

  const isHero = tone === "hero";

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full p-0.5",
        isHero
          ? "bg-on-hero/10 ring-1 ring-on-hero/15"
          : "bg-muted/80 ring-1 ring-border/40",
        className,
      )}
      role="group"
      aria-label="سال مالی"
      aria-busy={pending || undefined}
    >
      <button
        type="button"
        disabled={pending || year <= 1390}
        onClick={() => go(year - 1)}
        className={cn(
          "cursor-pointer rounded-full px-2 py-1 text-micro font-semibold transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isHero
            ? "text-on-hero/65 hover:bg-on-hero/10 hover:text-on-hero"
            : "text-muted-foreground hover:bg-card hover:text-foreground",
        )}
        aria-label="سال قبل"
      >
        ‹
      </button>
      <span
        className={cn(
          "min-w-11 text-center text-caption font-bold tabular-nums",
          isHero ? "text-on-hero" : "text-foreground",
        )}
      >
        {formatJalaliYear(year)}
      </span>
      <button
        type="button"
        disabled={pending || year >= 1500}
        onClick={() => go(year + 1)}
        className={cn(
          "cursor-pointer rounded-full px-2 py-1 text-micro font-semibold transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isHero
            ? "text-on-hero/65 hover:bg-on-hero/10 hover:text-on-hero"
            : "text-muted-foreground hover:bg-card hover:text-foreground",
        )}
        aria-label="سال بعد"
      >
        ›
      </button>
    </div>
  );
}
