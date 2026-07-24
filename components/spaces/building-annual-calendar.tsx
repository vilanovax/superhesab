"use client";

import Link from "next/link";
import { useMemo } from "react";
import type {
  AnnualChargeCalendarDTO,
  ChargePaymentDTO,
} from "@/app/actions/building";
import {
  CHARGE_STATUS_LABELS,
  MONTH_LABELS_FA,
  formatJalaliYear,
  type ChargeStatusValue,
} from "@/lib/building";
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

/**
 * Units × Jalali months color grid — mobile-first touch targets & legend.
 */
export function BuildingAnnualCalendar({
  spaceId,
  calendar,
  canMutate,
  onCellClick,
}: BuildingAnnualCalendarProps) {
  const { year, throughMonth, units, byUnitMonth } = calendar;
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

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
                {stats.paid.toLocaleString("fa-IR")} تسویه
              </span>
              {stats.due > 0 ? (
                <>
                  {" · "}
                  <span className="font-semibold text-rose-700 dark:text-rose-400">
                    {stats.due.toLocaleString("fa-IR")} بدهکار
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

      {units.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-body-sm text-muted-foreground">
          واحد فعالی برای نمایش نیست.
        </div>
      ) : (
        <div className="relative">
          {/* Scroll edge fade */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 end-0 z-20 w-6 bg-gradient-to-l from-card to-transparent"
          />
          <div className="-mx-0.5 overflow-x-auto overscroll-x-contain pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-max border-separate border-spacing-y-1.5 border-spacing-x-1">
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
                            "inline-flex min-w-10 flex-col items-center rounded-lg px-0.5 py-0.5",
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
                            {m.toLocaleString("fa-IR")}
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
                      <span className="inline-flex max-w-[3.25rem] items-center truncate rounded-lg bg-muted/70 px-2 py-1.5 text-caption font-bold text-foreground ring-1 ring-border/40">
                        {unit.name}
                      </span>
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
          {canMutate ? (
            <p className="mt-1 text-center text-micro text-muted-foreground">
              برای ثبت یا ویرایش وصول، روی خانه بزنید · به چپ بکشید
            </p>
          ) : (
            <p className="mt-1 text-center text-micro text-muted-foreground">
              برای دیدن ماه‌های بیشتر افقی بکشید
            </p>
          )}
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
