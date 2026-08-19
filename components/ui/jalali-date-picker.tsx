"use client";

import { useEffect, useState } from "react";
import { Calendar, DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import { parseExpenseDateInput, todayIsoDateTehran } from "@/lib/format";
import { cn } from "@/lib/utils";
import "react-multi-date-picker/styles/colors/teal.css";

type JalaliDatePickerProps = {
  value: string;
  onChange: (isoYmd: string) => void;
  className?: string;
  id?: string;
  /**
   * `inline` — always-open calendar (expense forms).
   * `compact` — closed by default; tap label to expand (drawers).
   */
  variant?: "inline" | "compact";
};

function toPersianDateObject(isoYmd: string): DateObject {
  return new DateObject({
    date: parseExpenseDateInput(isoYmd || "1970-01-01"),
    calendar: persian,
    locale: persian_fa,
  });
}

function toGregorianIso(date: DateObject): string {
  const g = date.convert(gregorian);
  const y = g.year;
  const m = String(g.month.number).padStart(2, "0");
  const d = String(g.day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Shamsi calendar (Calendar, not portaled DatePicker).
 * Portal + Vaul drawer blocked day clicks via body pointer-events.
 */
export function JalaliDatePicker({
  value,
  onChange,
  className,
  id,
  variant = "inline",
}: JalaliDatePickerProps) {
  const selected = value ? toPersianDateObject(value) : undefined;
  const formatted = selected
    ? selected.format("D MMMM YYYY")
    : "یک روز انتخاب کنید";
  const isToday = Boolean(value) && value === todayIsoDateTehran();
  const label = isToday ? `امروز · ${formatted}` : formatted;
  const [open, setOpen] = useState(variant === "inline");

  useEffect(() => {
    if (variant === "inline") setOpen(true);
  }, [variant]);

  // Reset compact picker when the bound date changes from outside.
  useEffect(() => {
    if (variant === "compact") setOpen(false);
  }, [variant, value]);

  return (
    <div
      className={cn(
        "jalali-date-picker w-full",
        variant === "compact" && "jalali-date-picker--compact",
        className,
      )}
      dir="rtl"
    >
      {variant === "compact" ? (
        <button
          type="button"
          id={id}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={cn(
            "flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-border/60 bg-card px-3 text-start transition-colors",
            open
              ? "border-primary/40 ring-2 ring-primary/20"
              : "hover:bg-muted/40",
          )}
        >
          <span className="min-w-0 truncate text-body-sm font-medium text-foreground">
            {label}
          </span>
          <span
            className="text-caption text-muted-foreground"
            aria-hidden
          >
            {open ? "▴" : "▾"}
          </span>
        </button>
      ) : (
        <p className="mb-2 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-center text-body-sm font-semibold text-foreground">
          {label}
        </p>
      )}

      {open ? (
        <div className={cn(variant === "compact" && "mt-2")}>
          <Calendar
            value={selected}
            onChange={(date) => {
              if (!date || Array.isArray(date)) return;
              onChange(toGregorianIso(date));
              if (variant === "compact") setOpen(false);
            }}
            calendar={persian}
            locale={persian_fa}
            highlightToday
            weekStartDayIndex={6}
            className="teal"
          />
        </div>
      ) : null}
    </div>
  );
}
