"use client";

import DatePicker, { DateObject } from "react-multi-date-picker";
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

/** Shamsi date picker — value is Gregorian yyyy-mm-dd. */
export function JalaliDatePicker({
  value,
  onChange,
  className,
}: JalaliDatePickerProps) {
  return (
    <div className={cn("jalali-date-picker w-full", className)} dir="rtl">
      <DatePicker
        value={value ? toPersianDateObject(value) : null}
        onChange={(date) => {
          if (!date || Array.isArray(date)) return;
          onChange(toGregorianIso(date));
        }}
        calendar={persian}
        locale={persian_fa}
        format="D MMMM YYYY"
        editable={false}
        highlightToday
        weekStartDayIndex={6}
        className="teal"
        containerClassName="w-full"
        inputClass={cn(
          "rmdp-input h-11 w-full rounded-xl! border border-border/70 bg-white px-3!",
          "text-[13px]! font-semibold text-foreground outline-none",
        )}
        calendarPosition="bottom-center"
        portal
        zIndex={200}
      />
    </div>
  );
}
