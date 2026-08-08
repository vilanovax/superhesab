"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import type {
  AnnualChargeCalendarDTO,
  ChargePaymentDTO,
} from "@/app/actions/building";
import {
  CHARGE_STATUS_LABELS,
  MONTH_LABELS_FA,
  formatJalaliYear,
  jalaliMonth,
  type ChargeStatusValue,
} from "@/lib/building";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CalendarCellKind =
  | ChargeStatusValue
  | "FUTURE"
  | "MISSING_DUE";

type BuildingAnnualCalendarProps = {
  spaceId: string;
  calendar: AnnualChargeCalendarDTO;
  canMutate: boolean;
  onCellClick?: (args: {
    unitId: string;
    unitName: string;
    month: number;
    monthlyCharge: number;
    payment: ChargePaymentDTO | null;
  }) => void;
  /** Tap unit label → open unit detail sheet. */
  onUnitClick?: (unitId: string) => void;
  /** Export controls — rendered on the same row as the year chip. */
  toolbarEnd?: ReactNode;
};

type CalendarMode = "month" | "grid";

function resolveCellKind(
  payment: ChargePaymentDTO | undefined,
  month: number,
  throughMonth: number,
): CalendarCellKind {
  if (payment) return payment.status;
  if (month > throughMonth) return "FUTURE";
  return "MISSING_DUE";
}

function cellTone(kind: CalendarCellKind): string {
  switch (kind) {
    case "PAID":
    case "WAIVED":
      return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300";
    case "PARTIAL":
      return "bg-amber-500/15 text-amber-800 ring-amber-500/30 dark:text-amber-200";
    case "DUE":
    case "MISSING_DUE":
      return "bg-rose-500/15 text-rose-700 ring-rose-500/25 dark:text-rose-300";
    case "FUTURE":
    default:
      return "bg-muted/60 text-muted-foreground/55 ring-border/30";
  }
}

function cellGlyph(kind: CalendarCellKind): string {
  switch (kind) {
    case "PAID":
      return "✓";
    case "WAIVED":
      return "ـ";
    case "PARTIAL":
      return "½";
    case "DUE":
    case "MISSING_DUE":
      return "!";
    case "FUTURE":
      return "";
    default:
      return "";
  }
}

function cellStatusLabel(kind: CalendarCellKind): string {
  if (kind === "FUTURE") return "آینده";
  if (kind === "MISSING_DUE") return "بدهکار";
  return CHARGE_STATUS_LABELS[kind];
}

function cellTitle(
  kind: CalendarCellKind,
  unitName: string,
  month: number,
): string {
  const monthName = MONTH_LABELS_FA[month] ?? String(month);
  const status =
    kind === "FUTURE"
      ? "آینده"
      : kind === "MISSING_DUE"
        ? "ثبت‌نشده — برای ثبت ضربه بزنید"
        : CHARGE_STATUS_LABELS[kind];
  return `واحد ${unitName} · ${monthName} · ${status}`;
}

/** Deterministic Persian digits — avoids SSR/CSR `toLocaleString("fa-IR")` drift. */
function faDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

function Chevron({
  className,
  dir = "next",
}: {
  className?: string;
  dir?: "prev" | "next";
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {dir === "prev" ? (
        <path d="M9 18l6-6-6-6" />
      ) : (
        <path d="M15 18l-6-6 6-6" />
      )}
    </svg>
  );
}

/**
 * Units × Jalali months — mobile-first:
 * - default «ماه» view: one readable month at a time
 * - optional «شبکه» view: horizontal-scroll year grid with fixed cell size
 */
export function BuildingAnnualCalendar({
  spaceId,
  calendar,
  canMutate,
  onCellClick,
  onUnitClick,
  toolbarEnd,
}: BuildingAnnualCalendarProps) {
  const { year, throughMonth, units, byUnitMonth } = calendar;
  const [mode, setMode] = useState<CalendarMode>("month");
  const [month, setMonth] = useState(() => {
    const now = jalaliMonth();
    if (throughMonth > 0) return Math.min(Math.max(now, 1), 12);
    return Math.min(Math.max(now, 1), 12);
  });

  const stats = useMemo(() => {
    let paid = 0;
    let due = 0;
    let partial = 0;
    for (const unit of units) {
      for (let m = 1; m <= throughMonth; m++) {
        const kind = resolveCellKind(
          byUnitMonth[unit.id]?.[m],
          m,
          throughMonth,
        );
        if (kind === "PAID" || kind === "WAIVED") paid += 1;
        else if (kind === "PARTIAL") partial += 1;
        else due += 1;
      }
    }
    return { paid, due, partial };
  }, [units, byUnitMonth, throughMonth]);

  const monthStats = useMemo(() => {
    let paid = 0;
    let due = 0;
    let partial = 0;
    for (const unit of units) {
      const kind = resolveCellKind(
        byUnitMonth[unit.id]?.[month],
        month,
        throughMonth,
      );
      if (kind === "FUTURE") continue;
      if (kind === "PAID" || kind === "WAIVED") paid += 1;
      else if (kind === "PARTIAL") partial += 1;
      else due += 1;
    }
    return { paid, due, partial };
  }, [units, byUnitMonth, month, throughMonth]);

  const allMonths = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i + 1),
    [],
  );

  function goMonth(delta: number) {
    setMonth((m) => Math.min(12, Math.max(1, m + delta)));
  }

  return (
    <div className="space-y-4">
      {/* Header: title · year + export on one baseline */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-body font-bold tracking-tight text-foreground">
            تقویم وصول
          </h3>
          {throughMonth > 0 ? (
            <p className="mt-0.5 whitespace-nowrap text-caption text-muted-foreground">
              تا {MONTH_LABELS_FA[throughMonth]}:{" "}
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {faDigits(stats.paid)} تسویه
              </span>
              {stats.due > 0 ? (
                <>
                  {" · "}
                  <span className="font-semibold text-rose-700 dark:text-rose-400">
                    {faDigits(stats.due)} بدهکار
                  </span>
                </>
              ) : null}
            </p>
          ) : (
            <p className="mt-0.5 whitespace-nowrap text-caption text-muted-foreground">
              سال آینده — هنوز موعدی نرسیده
            </p>
          )}
        </div>
        <div className="flex h-9 shrink-0 items-center gap-1.5 self-start">
          <div
            className="flex h-9 items-center gap-0.5 rounded-xl bg-muted/80 p-0.5 ring-1 ring-border/40"
            role="group"
            aria-label="سال تقویم"
          >
            <Link
              href={`/spaces/${spaceId}?year=${year - 1}&tab=charges`}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-body-sm font-bold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              aria-label="سال قبل"
            >
              ‹
            </Link>
            <span className="min-w-11 px-1 text-center text-caption font-bold tabular-nums text-foreground">
              {formatJalaliYear(year)}
            </span>
            <Link
              href={`/spaces/${spaceId}?year=${year + 1}&tab=charges`}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-body-sm font-bold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              aria-label="سال بعد"
            >
              ›
            </Link>
          </div>
          {toolbarEnd}
        </div>
      </div>

      {/* Mode switch — month-first for mobile readability */}
      <div
        className="grid grid-cols-2 gap-1 rounded-[1.15rem] border border-border/45 bg-card p-1 shadow-sm"
        role="tablist"
        aria-label="حالت تقویم"
      >
        {(
          [
            { value: "month" as const, label: "ماه به ماه", hint: "خوانا" },
            { value: "grid" as const, label: "نمای سال", hint: "اسکرول" },
          ] as const
        ).map((opt) => {
          const active = mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(opt.value)}
              className={cn(
                "flex h-11 cursor-pointer flex-col items-center justify-center rounded-xl px-2 transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <span className="text-body-sm font-semibold leading-none">
                {opt.label}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[10px] leading-none",
                  active
                    ? "text-primary-foreground/72"
                    : "text-muted-foreground/70",
                )}
              >
                {opt.hint}
              </span>
            </button>
          );
        })}
      </div>

      {units.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-body-sm text-muted-foreground">
          واحد فعالی برای نمایش نیست.
        </div>
      ) : mode === "month" ? (
        <MonthPagerView
          month={month}
          setMonth={setMonth}
          goMonth={goMonth}
          allMonths={allMonths}
          throughMonth={throughMonth}
          units={units}
          byUnitMonth={byUnitMonth}
          monthStats={monthStats}
          canMutate={canMutate}
          onCellClick={onCellClick}
          onUnitClick={onUnitClick}
        />
      ) : (
        <YearGridView
          months={allMonths}
          throughMonth={throughMonth}
          units={units}
          byUnitMonth={byUnitMonth}
          canMutate={canMutate}
          onCellClick={onCellClick}
          onUnitClick={onUnitClick}
          onMonthHeaderClick={(m) => {
            setMonth(m);
            setMode("month");
          }}
        />
      )}

      {/* Legend */}
      <ul className="flex flex-wrap justify-center gap-2">
        {(
          [
            { kind: "PAID" as const, label: "پرداخت", glyph: "✓" },
            { kind: "PARTIAL" as const, label: "نیمه", glyph: "½" },
            { kind: "MISSING_DUE" as const, label: "بدهکار", glyph: "!" },
            { kind: "FUTURE" as const, label: "آینده", glyph: "" },
          ] as const
        ).map((item) => (
          <li
            key={item.label}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1.5 text-caption font-medium text-muted-foreground ring-1 ring-border/40"
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[11px] font-bold ring-1",
                cellTone(item.kind),
              )}
            >
              {item.glyph || (
                <span className="size-1.5 rounded-full bg-current opacity-50" />
              )}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MonthPagerView({
  month,
  setMonth,
  goMonth,
  allMonths,
  throughMonth,
  units,
  byUnitMonth,
  monthStats,
  canMutate,
  onCellClick,
  onUnitClick,
}: {
  month: number;
  setMonth: (m: number) => void;
  goMonth: (delta: number) => void;
  allMonths: number[];
  throughMonth: number;
  units: AnnualChargeCalendarDTO["units"];
  byUnitMonth: AnnualChargeCalendarDTO["byUnitMonth"];
  monthStats: { paid: number; due: number; partial: number };
  canMutate: boolean;
  onCellClick?: BuildingAnnualCalendarProps["onCellClick"];
  onUnitClick?: BuildingAnnualCalendarProps["onUnitClick"];
}) {
  const isFutureMonth = month > throughMonth;

  return (
    <div className="space-y-3">
      {/* Month pager */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          disabled={month <= 1}
          aria-label="ماه قبل"
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-border/55 bg-card text-foreground shadow-sm transition-colors hover:border-primary/25 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Chevron dir="prev" className="size-5 text-muted-foreground" />
        </button>
        <div className="min-w-0 flex-1 rounded-2xl border border-border/45 bg-muted/40 px-3 py-2.5 text-center">
          <p className="text-body font-bold text-foreground">
            {MONTH_LABELS_FA[month]}
          </p>
          {!isFutureMonth ? (
            <p className="mt-0.5 text-caption text-muted-foreground">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {faDigits(monthStats.paid)} تسویه
              </span>
              {monthStats.due > 0 ? (
                <>
                  {" · "}
                  <span className="font-semibold text-rose-700 dark:text-rose-400">
                    {faDigits(monthStats.due)} بدهکار
                  </span>
                </>
              ) : null}
            </p>
          ) : (
            <p className="mt-0.5 text-caption text-muted-foreground">
              هنوز موعد نرسیده
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => goMonth(1)}
          disabled={month >= 12}
          aria-label="ماه بعد"
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-border/55 bg-card text-foreground shadow-sm transition-colors hover:border-primary/25 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Chevron dir="next" className="size-5 text-muted-foreground" />
        </button>
      </div>

      {/* Month chips — horizontal scroll, full names */}
      <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-0.5 scrollbar-none">
        <div className="flex w-max gap-1.5">
          {allMonths.map((m) => {
            const active = m === month;
            const isCurrent = m === throughMonth;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMonth(m)}
                className={cn(
                  "inline-flex h-10 min-w-16 cursor-pointer items-center justify-center rounded-full px-3 text-caption font-semibold transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isCurrent
                      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                      : "bg-muted/70 text-muted-foreground hover:text-foreground",
                )}
              >
                {MONTH_LABELS_FA[m]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Unit rows — large touch targets */}
      <ul className="space-y-2">
        {units.map((unit) => {
          const payment = byUnitMonth[unit.id]?.[month];
          const kind = resolveCellKind(payment, month, throughMonth);
          const interactive =
            canMutate && kind !== "FUTURE" && Boolean(onCellClick);
          const title = cellTitle(kind, unit.name, month);
          const amount =
            payment?.amount ??
            (kind === "MISSING_DUE" || kind === "DUE"
              ? unit.monthlyCharge
              : 0);

          return (
            <li key={unit.id}>
              <div className="flex items-stretch gap-2 rounded-[1.15rem] border border-border/45 bg-card p-2 shadow-sm">
                {onUnitClick ? (
                  <button
                    type="button"
                    onClick={() => onUnitClick(unit.id)}
                    aria-label={`جزئیات واحد ${unit.name}`}
                    className="flex min-w-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl bg-primary/10 px-2.5 py-2 text-primary ring-1 ring-primary/20 transition-colors hover:bg-primary/15"
                  >
                    <span className="text-body-sm font-bold leading-none">
                      {unit.name}
                    </span>
                    <span className="mt-1 text-micro text-primary/70">واحد</span>
                  </button>
                ) : (
                  <div className="flex min-w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-muted/70 px-2.5 py-2 ring-1 ring-border/40">
                    <span className="text-body-sm font-bold leading-none text-foreground">
                      {unit.name}
                    </span>
                    <span className="mt-1 text-micro text-muted-foreground">
                      واحد
                    </span>
                  </div>
                )}

                {interactive ? (
                  <button
                    type="button"
                    title={title}
                    aria-label={title}
                    onClick={() =>
                      onCellClick?.({
                        unitId: unit.id,
                        unitName: unit.name,
                        month,
                        monthlyCharge: unit.monthlyCharge,
                        payment: payment ?? null,
                      })
                    }
                    className={cn(
                      "flex min-h-14 flex-1 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition-[transform,box-shadow] active:scale-[0.99]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      cellTone(kind),
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card/50 text-base font-bold ring-1 ring-current/15">
                      {cellGlyph(kind) || (
                        <span className="size-2 rounded-full bg-current opacity-40" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 text-start">
                      <span className="block text-body-sm font-bold leading-tight">
                        {cellStatusLabel(kind)}
                      </span>
                      {amount > 0 ? (
                        <span className="mt-0.5 block text-caption tabular-nums opacity-80">
                          {formatMoney(amount)}
                        </span>
                      ) : null}
                    </span>
                    <Chevron dir="next" className="size-4 shrink-0 opacity-50" />
                  </button>
                ) : (
                  <div
                    title={title}
                    className={cn(
                      "flex min-h-14 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 ring-1",
                      cellTone(kind),
                      kind === "FUTURE" && "opacity-55",
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card/50 text-base font-bold ring-1 ring-current/15">
                      {cellGlyph(kind) || (
                        <span className="size-2 rounded-full bg-current opacity-40" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 text-start">
                      <span className="block text-body-sm font-bold leading-tight">
                        {cellStatusLabel(kind)}
                      </span>
                      {amount > 0 && kind !== "FUTURE" ? (
                        <span className="mt-0.5 block text-caption tabular-nums opacity-80">
                          {formatMoney(amount)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-center text-caption text-muted-foreground">
        {onUnitClick ? "روی شماره واحد برای جزئیات · " : null}
        {canMutate && !isFutureMonth
          ? "روی وضعیت برای ثبت وصول"
          : isFutureMonth
            ? "این ماه هنوز موعد ندارد"
            : "فقط مشاهده"}
      </p>
    </div>
  );
}

function YearGridView({
  months,
  throughMonth,
  units,
  byUnitMonth,
  canMutate,
  onCellClick,
  onUnitClick,
  onMonthHeaderClick,
}: {
  months: number[];
  throughMonth: number;
  units: AnnualChargeCalendarDTO["units"];
  byUnitMonth: AnnualChargeCalendarDTO["byUnitMonth"];
  canMutate: boolean;
  onCellClick?: BuildingAnnualCalendarProps["onCellClick"];
  onUnitClick?: BuildingAnnualCalendarProps["onUnitClick"];
  onMonthHeaderClick: (month: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-caption text-muted-foreground">
        برای خواندن راحت‌تر به چپ/راست بکشید · روی نام ماه برای نمای ماهانه
      </p>
      <div className="-mx-1 overflow-x-auto overscroll-x-contain pb-1">
        <table className="w-max border-separate border-spacing-x-1.5 border-spacing-y-2">
          <thead>
            <tr>
              <th className="sticky inset-s-0 z-10 bg-card pe-2 ps-0.5 text-start">
                <span className="text-caption font-medium text-muted-foreground">
                  واحد
                </span>
              </th>
              {months.map((m) => {
                const isCurrent = m === throughMonth;
                return (
                  <th key={m} className="px-0 text-center">
                    <button
                      type="button"
                      title={MONTH_LABELS_FA[m]}
                      onClick={() => onMonthHeaderClick(m)}
                      className={cn(
                        "inline-flex min-w-12 cursor-pointer flex-col items-center rounded-xl px-1.5 py-1.5 transition-colors",
                        isCurrent
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <span className="text-caption font-bold leading-none">
                        {MONTH_LABELS_FA[m]}
                      </span>
                      <span className="mt-0.5 text-micro tabular-nums leading-none opacity-80">
                        {faDigits(m)}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id}>
                <th className="sticky inset-s-0 z-10 bg-card pe-2 ps-0.5 text-start align-middle">
                  {onUnitClick ? (
                    <button
                      type="button"
                      onClick={() => onUnitClick(unit.id)}
                      aria-label={`جزئیات واحد ${unit.name}`}
                      className="inline-flex min-w-14 max-w-20 cursor-pointer items-center truncate rounded-xl bg-primary/10 px-2.5 py-2 text-caption font-bold text-primary ring-1 ring-primary/25 transition-colors hover:bg-primary/15"
                    >
                      {unit.name}
                    </button>
                  ) : (
                    <span className="inline-flex min-w-14 max-w-20 items-center truncate rounded-xl bg-muted/70 px-2.5 py-2 text-caption font-bold text-foreground ring-1 ring-border/40">
                      {unit.name}
                    </span>
                  )}
                </th>
                {months.map((m) => {
                  const payment = byUnitMonth[unit.id]?.[m];
                  const kind = resolveCellKind(payment, m, throughMonth);
                  const interactive =
                    canMutate && kind !== "FUTURE" && Boolean(onCellClick);
                  const isCurrent = m === throughMonth;
                  const glyph = cellGlyph(kind);
                  const title = cellTitle(kind, unit.name, m);

                  const base = cn(
                    "flex size-11 items-center justify-center rounded-full text-sm font-bold leading-none ring-1 transition-[transform,box-shadow]",
                    cellTone(kind),
                    isCurrent && "ring-2 ring-primary/40",
                    interactive &&
                      "cursor-pointer active:scale-95 hover:shadow-sm",
                    !interactive && kind === "FUTURE" && "opacity-40",
                  );

                  if (interactive) {
                    return (
                      <td key={m} className="p-0 align-middle">
                        <button
                          type="button"
                          title={title}
                          aria-label={title}
                          className={cn(base, "mx-auto")}
                          onClick={() =>
                            onCellClick?.({
                              unitId: unit.id,
                              unitName: unit.name,
                              month: m,
                              monthlyCharge: unit.monthlyCharge,
                              payment: payment ?? null,
                            })
                          }
                        >
                          {glyph || (
                            <span className="size-1.5 rounded-full bg-current opacity-40" />
                          )}
                        </button>
                      </td>
                    );
                  }

                  return (
                    <td key={m} className="p-0 align-middle">
                      <div
                        title={title}
                        className={cn(base, "mx-auto")}
                        aria-hidden={kind === "FUTURE"}
                      >
                        {glyph || (
                          <span className="size-1.5 rounded-full bg-current opacity-40" />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
