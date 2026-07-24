"use client";

import { Calendar, DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import { parseExpenseDateInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import "react-multi-date-picker/styles/colors/teal.css";

type JalaliDatePickerProps = {
  value: string;
  onChange: (isoYmd: string) => void;
  className?: string;
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
 * Inline Shamsi calendar (Calendar, not portaled DatePicker).
 * Portal + Vaul drawer blocked day clicks via body pointer-events.
 */
export function JalaliDatePicker({
  value,
  onChange,
  className,
}: JalaliDatePickerProps) {
  const selected = value ? toPersianDateObject(value) : undefined;
  const label = selected
    ? selected.format("D MMMM YYYY")
    : "یک روز انتخاب کنید";

  return (
    <div className={cn("jalali-date-picker w-full", className)} dir="rtl">
      <p className="mb-2 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-center text-body-sm font-semibold text-foreground">
        {label}
      </p>
      <Calendar
        value={selected}
        onChange={(date) => {
          if (!date || Array.isArray(date)) return;
          onChange(toGregorianIso(date));
        }}
        calendar={persian}
        locale={persian_fa}
        highlightToday
        weekStartDayIndex={6}
        className="teal"
      />
    </div>
  );
}
