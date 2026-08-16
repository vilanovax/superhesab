import Link from "next/link";
import type { ReactNode } from "react";
import type { BuildingDashboardDTO } from "@/app/actions/building";
import { BuildingYearNav } from "@/components/spaces/building-year-nav";
import { formatJalaliYear } from "@/lib/building";
import { currencyLabel, formatMoney, type SpaceCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type BuildingMonthHeroProps = {
  spaceId: string;
  spaceName: string;
  memberCount: number;
  expenseCount: number;
  monthExpense: number;
  dashboard: BuildingDashboardDTO | null;
  currency: SpaceCurrency;
  settingsHref: string;
  isOwner: boolean;
  /** OWNER/EDITOR: persist year chip as Space.defaultPlanYear */
  canRememberYear?: boolean;
  /** OWNER: invite / manage co-managers */
  managersAction?: ReactNode;
  /** Preserve active tab when changing year in the hero chip. */
  yearNavTab?: "expenses" | "charges" | "units" | "report";
  /**
   * Slim one-line وصول strip (bar + % + معوق).
   * Full 3-up KPIs stay on تب شارژ (building balance surface).
   */
  compactStats?: boolean;
};

export function BuildingMonthHero({
  spaceId,
  spaceName,
  memberCount,
  expenseCount,
  monthExpense,
  dashboard,
  currency,
  settingsHref,
  isOwner,
  canRememberYear = false,
  managersAction,
  yearNavTab = "charges",
  compactStats = false,
}: BuildingMonthHeroProps) {
  const unit = currencyLabel(currency);
  const activeUnits = dashboard?.totals.activeUnits ?? 0;
  const arrears = dashboard?.totals.arrearsTotal ?? 0;
  const collected = dashboard?.totals.collectedYtd ?? 0;
  const expected = dashboard?.totals.expectedYtd ?? 0;
  const hasPlan = Boolean(dashboard?.plan);
  const year = dashboard?.year;
  const collectPct =
    expected > 0 ? Math.min(100, Math.round((collected * 100) / expected)) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-start">
          <p className="text-micro font-semibold tracking-[0.08em] text-on-hero/55">
            مدیریت ساختمان
          </p>
          <h1 className="mt-1 truncate text-[1.35rem] font-bold leading-none tracking-tight text-on-hero">
            {spaceName}
          </h1>
          <p className="mt-1.5 text-caption text-on-hero/65">
            {activeUnits > 0 ? `${activeUnits} واحد` : "بدون واحد"}
            {" · "}
            {memberCount} مدیر
            {expenseCount > 0 ? ` · ${expenseCount} هزینه` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {managersAction}
          {year != null ? (
            <BuildingYearNav
              spaceId={spaceId}
              year={year}
              tab={yearNavTab}
              canRemember={canRememberYear}
              tone="hero"
            />
          ) : null}
        </div>
      </div>

      {!hasPlan ? (
        <Link
          href={settingsHref}
          className={cn(
            "group flex items-center gap-3 rounded-2xl bg-on-hero px-3.5 py-3 text-primary shadow-sm",
            "transition-[transform,opacity] active:scale-[0.98] hover:opacity-95",
            !isOwner && "pointer-events-none opacity-80",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-lg font-bold text-primary">
            ٪
          </span>
          <span className="min-w-0 flex-1 text-start">
            <span className="block text-body-sm font-bold text-primary">
              تعریف پلن شارژ{" "}
              {year != null ? formatJalaliYear(year) : ""}
            </span>
            <span className="mt-0.5 block text-caption text-primary/70">
              مبلغ پایه و سال پیش‌فرض در تنظیمات
            </span>
          </span>
          <span className="text-body font-bold text-primary/80" aria-hidden>
            ←
          </span>
        </Link>
      ) : compactStats ? (
        <div
          className="flex items-center gap-2.5 rounded-xl bg-black/15 px-3 py-2 backdrop-blur-[2px]"
          aria-label="پیشرفت وصول سال"
        >
          <div
            className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-on-hero/15"
            role="progressbar"
            aria-valuenow={collectPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${collectPct}٪ پیشرفت وصول سال`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-out",
                arrears > 0 ? "bg-amber-200" : "bg-on-hero",
              )}
              style={{ width: `${collectPct}%` }}
            />
          </div>
          <p className="shrink-0 text-micro font-bold tabular-nums text-on-hero">
            {collectPct}٪ وصول
          </p>
          {arrears > 0 ? (
            <p className="shrink-0 text-micro tabular-nums text-amber-100/95">
              معوق {formatMoney(arrears)}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl bg-black/15 px-3.5 py-3 backdrop-blur-[2px]">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-caption font-medium text-on-hero/70">
              پیشرفت وصول سال
            </p>
            <p className="text-caption font-bold tabular-nums text-on-hero">
              {collectPct}٪
            </p>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-on-hero/15"
            role="progressbar"
            aria-valuenow={collectPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${collectPct}٪ پیشرفت وصول سال`}
            aria-label="پیشرفت وصول سال"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-out",
                arrears > 0 ? "bg-amber-200" : "bg-on-hero",
              )}
              style={{ width: `${collectPct}%` }}
            />
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <HeroMini
              label="وصول"
              value={formatMoney(collected)}
              unit={unit}
            />
            <HeroMini
              label="معوق"
              value={formatMoney(arrears)}
              unit={unit}
              warn={arrears > 0}
            />
            <HeroMini
              label="مشاع ماه"
              value={formatMoney(monthExpense)}
              unit={unit}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function HeroMini({
  label,
  value,
  unit,
  warn,
}: {
  label: string;
  value: string;
  unit: string;
  warn?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-on-hero/10 px-2 py-2 text-center">
      <p className="text-micro text-on-hero/60">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate text-caption font-bold tabular-nums text-on-hero",
          warn && "text-amber-100",
        )}
      >
        {value}
      </p>
      <p className="truncate text-micro text-on-hero/50">{unit}</p>
    </div>
  );
}
