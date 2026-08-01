"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";

/** 1 = Farvardin–Shahrivar, 2 = Mehr–Esfand */
type HalfYear = 1 | 2;

function halfYearForMonth(month: number): HalfYear {
  return month <= 6 ? 1 : 2;
}

function monthsForHalf(half: HalfYear): number[] {
  return half === 1
    ? [1, 2, 3, 4, 5, 6]
    : [7, 8, 9, 10, 11, 12];
}

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
};

const MONTH_SHORT = [
  "",
  "فر",
  "ار",
  "خر",
  "تی",
  "مر",
  "شه",
  "مه",
  "آب",
  "آذ",
  "دی",
  "به",
  "اس",
] as const;

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
      return "bg-muted/60 text-muted-foreground/50 ring-border/30";
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

/**
 * Units × Jalali months color grid — mobile-first touch targets & legend.
 */
export function BuildingAnnualCalendar({
  spaceId,
  calendar,
  canMutate,
  onCellClick,
  onUnitClick,
}: BuildingAnnualCalendarProps) {
  const { year, throughMonth, units, byUnitMonth } = calendar;
  const [half, setHalf] = useState<HalfYear>(() =>
    halfYearForMonth(jalaliMonth()),
  );
  const months = monthsForHalf(half);

  const stats = useMemo(() => {
    let paid = 0;
    let due = 0;
    let partial = 0;
    let totalSlots = 0;
    for (const unit of units) {
      for (let m = 1; m <= throughMonth; m++) {
        totalSlots += 1;
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
    return { paid, due, partial, totalSlots };
  }, [units, byUnitMonth, throughMonth]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-body font-bold tracking-tight text-foreground">
            تقویم وصول {formatJalaliYear(year)}
          </h3>
          {throughMonth > 0 ? (
            <p className="mt-0.5 text-caption text-muted-foreground">
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
            <p className="mt-0.5 text-caption text-muted-foreground">
              سال آینده — هنوز موعدی نرسیده
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-muted/80 p-0.5 ring-1 ring-border/40">
          <Link
            href={`/spaces/${spaceId}?year=${year - 1}&tab=charges`}
            className="flex size-8 items-center justify-center rounded-full text-body-sm font-bold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            aria-label="سال قبل"
          >
            ‹
          </Link>
          <span className="min-w-[2.75rem] px-1 text-center text-caption font-bold tabular-nums text-foreground">
            {formatJalaliYear(year)}
          </span>
          <Link
            href={`/spaces/${spaceId}?year=${year + 1}&tab=charges`}
            className="flex size-8 items-center justify-center rounded-full text-body-sm font-bold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            aria-label="سال بعد"
          >
            ›
          </Link>
        </div>
      </div>

      {/* Half-year switcher */}
      <div
        className="grid grid-cols-2 gap-1 rounded-2xl bg-muted/70 p-1 ring-1 ring-border/40"
        role="tablist"
        aria-label="نیم‌سال تقویم"
      >
        {(
          [
            { value: 1 as const, label: "فروردین–شهریور" },
            { value: 2 as const, label: "مهر–اسفند" },
          ] as const
        ).map((opt) => {
          const active = half === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setHalf(opt.value)}
              className={cn(
                "rounded-xl px-2 py-2 text-caption font-semibold transition-[background-color,color,box-shadow] duration-150",
                active
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {units.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-body-sm text-muted-foreground">
          واحد فعالی برای نمایش نیست.
        </div>
      ) : (
        <div className="relative">
          <div className="-mx-0.5 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full min-w-0 border-separate border-spacing-y-1.5 border-spacing-x-1">
              <thead>
                <tr>
                  <th className="sticky start-0 z-10 bg-card pe-2 ps-0.5 text-start">
                    <span className="text-micro font-medium text-muted-foreground">
                      واحد
                    </span>
                  </th>
                  {months.map((m) => {
                    const isCurrent = m === throughMonth;
                    return (
                      <th
                        key={m}
                        className="px-0 text-center"
                        title={MONTH_LABELS_FA[m]}
                      >
                        <span
                          className={cn(
                            "inline-flex min-w-9 flex-col items-center rounded-lg px-0.5 py-0.5 sm:min-w-10",
                            isCurrent && "bg-primary/10",
                          )}
                        >
                          <span
                            className={cn(
                              "text-[10px] font-bold leading-none",
                              isCurrent
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          >
                            {MONTH_SHORT[m]}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 text-micro tabular-nums leading-none",
                              isCurrent
                                ? "font-bold text-primary"
                                : "text-muted-foreground/80",
                            )}
                          >
                            {faDigits(m)}
                          </span>
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr key={unit.id}>
                    <th className="sticky start-0 z-10 bg-card pe-2 ps-0.5 text-start align-middle">
                      {onUnitClick ? (
                        <button
                          type="button"
                          onClick={() => onUnitClick(unit.id)}
                          aria-label={`جزئیات واحد ${unit.name}`}
                          className="inline-flex max-w-[3.25rem] items-center truncate rounded-lg bg-primary/10 px-2 py-1.5 text-caption font-bold text-primary ring-1 ring-primary/25 transition-[transform,background-color] hover:bg-primary/15 active:scale-95"
                        >
                          {unit.name}
                        </button>
                      ) : (
                        <span className="inline-flex max-w-[3.25rem] items-center truncate rounded-lg bg-muted/70 px-2 py-1.5 text-caption font-bold text-foreground ring-1 ring-border/40">
                          {unit.name}
                        </span>
                      )}
                    </th>
                    {months.map((month) => {
                      const payment = byUnitMonth[unit.id]?.[month];
                      const kind = resolveCellKind(
                        payment,
                        month,
                        throughMonth,
                      );
                      const interactive =
                        canMutate &&
                        kind !== "FUTURE" &&
                        Boolean(onCellClick);
                      const isCurrent = month === throughMonth;
                      const glyph = cellGlyph(kind);
                      const title = cellTitle(kind, unit.name, month);

                      const base = cn(
                        "flex size-10 items-center justify-center rounded-full text-sm font-bold leading-none ring-1 transition-[transform,box-shadow]",
                        cellTone(kind),
                        isCurrent && "ring-2 ring-primary/40",
                        interactive &&
                          "cursor-pointer active:scale-95 hover:shadow-sm",
                        !interactive && kind === "FUTURE" && "opacity-40",
                      );

                      if (interactive) {
                        return (
                          <td key={month} className="p-0 align-middle">
                            <button
                              type="button"
                              title={title}
                              aria-label={title}
                              className={cn(base, "mx-auto")}
                              onClick={() =>
                                onCellClick?.({
                                  unitId: unit.id,
                                  unitName: unit.name,
                                  month,
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
                        <td key={month} className="p-0 align-middle">
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
          <p className="mt-1 text-center text-micro text-muted-foreground">
            {onUnitClick ? "روی شماره واحد بزنید برای جزئیات · " : null}
            {canMutate
              ? "روی خانه ماه برای ثبت وصول"
              : "فقط مشاهده"}
          </p>
        </div>
      )}

      {/* Legend with matching glyphs */}
      <ul className="flex flex-wrap justify-center gap-2">
        {(
          [
            {
              kind: "PAID" as const,
              label: "پرداخت",
              glyph: "✓",
            },
            {
              kind: "PARTIAL" as const,
              label: "نیمه",
              glyph: "½",
            },
            {
              kind: "MISSING_DUE" as const,
              label: "بدهکار",
              glyph: "!",
            },
            {
              kind: "FUTURE" as const,
              label: "آینده",
              glyph: "",
            },
          ] as const
        ).map((item) => (
          <li
            key={item.label}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-1 text-micro font-medium text-muted-foreground ring-1 ring-border/40"
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-[10px] font-bold ring-1",
                cellTone(item.kind),
              )}
            >
              {item.glyph || (
                <span className="size-1 rounded-full bg-current opacity-50" />
              )}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
