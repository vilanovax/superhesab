/**
 * BUILDING template helpers — unit charges & dynamic arrears (integers only).
 * multiplier is thousandths: 1000 = 1.0×.
 */

export type ChargeStatusValue = "DUE" | "PARTIAL" | "PAID" | "WAIVED";

export const CHARGE_STATUS_LABELS: Record<ChargeStatusValue, string> = {
  DUE: "بدهکار",
  PARTIAL: "نیمه‌پرداخت",
  PAID: "پرداخت‌شده",
  WAIVED: "معاف",
};

export type SuggestionStatusValue =
  | "OPEN"
  | "IN_PROGRESS"
  | "DONE"
  | "REJECTED";

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatusValue, string> = {
  OPEN: "باز",
  IN_PROGRESS: "در حال پیگیری",
  DONE: "انجام شد",
  REJECTED: "رد شده",
};

export const MONTH_LABELS_FA = [
  "فروردین", // placeholder index 0 unused — months are 1–12
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

function persianParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number.parseInt(
      (parts.find((p) => p.type === type)?.value ?? "").replace(/\D/g, ""),
      10,
    );
  return { year: num("year"), month: num("month"), day: num("day") };
}

/** Jalali (Persian / Shamsi) year in Asia/Tehran — ChargePlan.year key (e.g. 1405). */
export function tehranCivilYear(date: Date = new Date()): number {
  const y = persianParts(date).year;
  // Guard against engines that ignore u-ca-persian and return Gregorian.
  if (y >= 1300 && y <= 1600) return y;
  // Rough civil→Jalali fallback around contemporary years
  const g = date.getFullYear();
  return g - 621;
}

/** Alias — prefer this name in new call sites. */
export const jalaliYear = tehranCivilYear;

/** Jalali month 1–12 in Asia/Tehran. */
export function tehranCivilMonth(date: Date = new Date()): number {
  const m = persianParts(date).month;
  if (m >= 1 && m <= 12) return m;
  return 1;
}

export const jalaliMonth = tehranCivilMonth;

/** Persian digits for a Jalali year badge (۱۴۰۵). */
export function formatJalaliYear(year: number): string {
  return new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(
    Math.trunc(year),
  );
}

/** Monthly charge for a unit: baseCharge × multiplier / 1000 (rounded). */
export function unitMonthlyCharge(
  baseCharge: number,
  multiplierThousandths: number = 1000,
): number {
  if (baseCharge <= 0) return 0;
  const m = multiplierThousandths > 0 ? multiplierThousandths : 1000;
  return Math.round((baseCharge * m) / 1000);
}

export type PaymentSlice = {
  month: number;
  amount: number;
  status: ChargeStatusValue;
};

/**
 * Dynamic arrears for months 1..throughMonth in a plan year.
 * No pre-allocated rows: missing month = full charge owed.
 */
export function unitArrears(input: {
  baseCharge: number;
  multiplier: number;
  throughMonth: number;
  payments: PaymentSlice[];
}): number {
  const charge = unitMonthlyCharge(input.baseCharge, input.multiplier);
  if (charge <= 0 || input.throughMonth < 1) return 0;

  const byMonth = new Map(
    input.payments.map((p) => [p.month, p] as const),
  );
  let debt = 0;
  const last = Math.min(12, Math.max(1, input.throughMonth));

  for (let month = 1; month <= last; month++) {
    const p = byMonth.get(month);
    if (!p) {
      debt += charge;
      continue;
    }
    if (p.status === "PAID" || p.status === "WAIVED") continue;
    if (p.status === "PARTIAL") {
      debt += Math.max(0, charge - p.amount);
      continue;
    }
    // DUE
    debt += Math.max(0, charge - p.amount);
  }

  return debt;
}

/** Collected amount credited toward the year (PAID + PARTIAL + WAIVED as full charge). */
export function unitCollected(input: {
  baseCharge: number;
  multiplier: number;
  payments: PaymentSlice[];
}): number {
  const charge = unitMonthlyCharge(input.baseCharge, input.multiplier);
  let total = 0;
  for (const p of input.payments) {
    if (p.status === "WAIVED") {
      total += charge;
    } else if (p.status === "PAID" || p.status === "PARTIAL") {
      total += p.amount;
    }
  }
  return total;
}

export function monthLabelFa(month: number): string {
  if (month < 1 || month > 12) return String(month);
  return MONTH_LABELS_FA[month] ?? String(month);
}
