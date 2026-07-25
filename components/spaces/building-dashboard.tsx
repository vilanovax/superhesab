import Link from "next/link";
import type { ReactNode } from "react";
import type { BuildingDashboardDTO } from "@/app/actions/building";
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
  /** OWNER: invite / manage co-managers */
  managersAction?: ReactNode;
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
  managersAction,
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
            <div className="flex items-center gap-1 rounded-full bg-on-hero/10 p-0.5 ring-1 ring-on-hero/15">
              <Link
                href={`/spaces/${spaceId}?year=${year - 1}&tab=charges`}
                className="rounded-full px-2 py-1 text-micro font-semibold text-on-hero/65 hover:bg-on-hero/10 hover:text-on-hero"
                aria-label="سال قبل"
              >
                ‹
              </Link>
              <span className="min-w-[2.75rem] text-center text-caption font-bold tabular-nums text-on-hero">
                {formatJalaliYear(year)}
              </span>
              <Link
                href={`/spaces/${spaceId}?year=${year + 1}&tab=charges`}
                className="rounded-full px-2 py-1 text-micro font-semibold text-on-hero/65 hover:bg-on-hero/10 hover:text-on-hero"
                aria-label="سال بعد"
              >
                ›
              </Link>
            </div>
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
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-on-hero/15">
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
