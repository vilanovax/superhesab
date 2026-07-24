import Link from "next/link";
import type { BuildingDashboardDTO } from "@/app/actions/building";
import { formatJalaliYear } from "@/lib/building";
import { currencyLabel, type SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
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
    <div className="space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-start">
          <p className="text-[0.6875rem] font-semibold tracking-[0.06em] text-on-hero/55">
            مدیریت ساختمان
          </p>
          <h1 className="mt-1 truncate text-[1.35rem] font-bold leading-tight tracking-tight text-on-hero">
            {spaceName}
          </h1>
          <p className="mt-1.5 text-caption text-on-hero/65">
            {activeUnits > 0 ? `${activeUnits} واحد فعال` : "بدون واحد"}
            {" · "}
            {memberCount} مدیر
            {expenseCount > 0
              ? ` · ${expenseCount} هزینه مشاع`
              : " · دفتر مشاع خالی"}
          </p>
        </div>
        {year != null ? (
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="rounded-full bg-on-hero/12 px-2.5 py-1 text-caption font-semibold tabular-nums text-on-hero/85 ring-1 ring-on-hero/15">
              {formatJalaliYear(year)}
            </span>
            <div className="flex items-center gap-1">
              <Link
                href={`/spaces/${spaceId}?year=${year - 1}&tab=charges`}
                className="rounded-lg bg-on-hero/10 px-2 py-0.5 text-micro font-semibold text-on-hero/80 ring-1 ring-on-hero/10 hover:bg-on-hero/20"
                title="سال قبل"
              >
                {formatJalaliYear(year - 1)}
              </Link>
              <Link
                href={`/spaces/${spaceId}?year=${year + 1}&tab=charges`}
                className="rounded-lg bg-on-hero/10 px-2 py-0.5 text-micro font-semibold text-on-hero/80 ring-1 ring-on-hero/10 hover:bg-on-hero/20"
                title="سال بعد"
              >
                {formatJalaliYear(year + 1)}
              </Link>
            </div>
          </div>
        ) : (
          <span className="shrink-0 rounded-full bg-on-hero/12 px-2.5 py-1 text-caption font-semibold text-on-hero/85 ring-1 ring-on-hero/15">
            —
          </span>
        )}
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
              تعریف پلن شارژ سال{" "}
              {year != null ? formatJalaliYear(year) : ""}
            </span>
            <span className="mt-0.5 block text-caption text-primary/70">
              مبلغ پایه ماهانه و سال پیش‌فرض را در تنظیمات بگذارید
            </span>
          </span>
          <span className="text-body font-bold text-primary/80" aria-hidden>
            ←
          </span>
        </Link>
      ) : (
        <>
          <div className="rounded-2xl bg-black/15 px-3.5 py-3 backdrop-blur-[2px]">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-caption font-medium text-on-hero/70">
                وصول سال تا این ماه
              </p>
              <p className="text-caption font-bold tabular-nums text-on-hero">
                {collectPct}٪
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-on-hero/15">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500 ease-out",
                  arrears > 0 ? "bg-amber-200" : "bg-on-hero",
                )}
                style={{ width: `${collectPct}%` }}
              />
            </div>
            <div className="mt-2.5 flex justify-between gap-2 text-caption text-on-hero/70">
              <span>
                وصول: {formatCurrency(collected, currency)} {unit}
              </span>
              <span>
                معوق: {formatCurrency(arrears, currency)} {unit}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-on-hero-soft px-3 py-2.5">
              <p className="text-caption text-on-hero/65">هزینه مشاع ماه</p>
              <p className="mt-1 text-body font-bold tabular-nums text-on-hero">
                {formatCurrency(monthExpense, currency)}
              </p>
            </div>
            <div className="rounded-xl bg-on-hero-soft px-3 py-2.5">
              <p className="text-caption text-on-hero/65">انتظار تا ماه</p>
              <p className="mt-1 text-body font-bold tabular-nums text-on-hero">
                {formatCurrency(expected, currency)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
