/**
 * BUILDING template helpers — unit charges & dynamic arrears (integers only).
 * multiplier is thousandths: 1000 = 1.0×.
 */

import { jalaliDaysInMonth, jalaliToGregorian } from "@/lib/jalali";

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

/** Jalali day-of-month 1–31 in Asia/Tehran. */
export function tehranCivilDay(date: Date = new Date()): number {
  const d = persianParts(date).day;
  return d >= 1 && d <= 31 ? d : 1;
}

export const jalaliDay = tehranCivilDay;

/**
 * Default ISO (yyyy-mm-dd) for a charge payment in a plan month.
 * Uses today when it falls in that Jalali month; otherwise the 1st of the month
 * — avoids picking "today" in a different Shamsi year than the open plan.
 */
export function defaultChargePaymentIso(
  planYear: number,
  planMonth: number,
): string {
  const last = jalaliDaysInMonth(planYear, planMonth);
  const nowY = tehranCivilYear();
  const nowM = tehranCivilMonth();
  const nowD = tehranCivilDay();
  const jd =
    nowY === planYear && nowM === planMonth
      ? Math.min(Math.max(nowD, 1), last)
      : 1;
  const g = jalaliToGregorian(planYear, planMonth, jd);
  const mm = String(g.gm).padStart(2, "0");
  const dd = String(g.gd).padStart(2, "0");
  return `${g.gy}-${mm}-${dd}`;
}

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

/**
 * Keep PAID/PARTIAL consistent with the amount actually collected.
 * DUE / WAIVED are explicit manager choices and pass through.
 */
export function resolveChargePaymentStatus(
  status: ChargeStatusValue,
  amount: number,
  due: number,
): ChargeStatusValue {
  if (status !== "PAID" && status !== "PARTIAL") return status;
  if (amount <= 0) return "DUE";
  if (due > 0 && amount < due) return "PARTIAL";
  return "PAID";
}

/**
 * Remaining charge for one unit in one month.
 * PAID / WAIVED settle the month. PARTIAL and DUE (or no row) leave
 * max(0, charge − paid).
 */
export function monthChargeRemainder(
  charge: number,
  payment: { status: ChargeStatusValue; amount: number } | null | undefined,
): number {
  if (charge <= 0) return 0;
  if (!payment) return charge;
  if (payment.status === "PAID" || payment.status === "WAIVED") return 0;
  return Math.max(0, charge - payment.amount);
}

const MULT_MIN = 1;
const MULT_MAX = 100_000;
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function clampMultiplier(n: number): number | null {
  if (!Number.isInteger(n) || n < MULT_MIN || n > MULT_MAX) return null;
  return n;
}

/**
 * Parse the unit-charge coefficient field.
 * Stored as thousandths (1000 = 1×). Also accepts a human factor:
 * `1.2` / `۱٫۲` → 1200. Grouped integers (`۱٬۲۰۰`) stay thousandths.
 * Bare 1–9 means N× so `1` → 1000, not 1/1000.
 */
export function parseUnitMultiplierInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let ascii = "";
  for (const ch of trimmed) {
    const p = FA_DIGITS.indexOf(ch);
    if (p >= 0) {
      ascii += String(p);
      continue;
    }
    const a = AR_DIGITS.indexOf(ch);
    if (a >= 0) {
      ascii += String(a);
      continue;
    }
    ascii += ch;
  }
  ascii = ascii.replace(/\s/g, "");
  if (!ascii) return null;

  if (/^\d{1,3}([,٬،]\d{3})+$/.test(ascii)) {
    const n = Number.parseInt(ascii.replace(/[,٬،]/g, ""), 10);
    return Number.isFinite(n) ? clampMultiplier(n) : null;
  }

  const decimal = /^(\d+)[.,٫](\d{1,3})$/.exec(ascii);
  if (decimal) {
    const factor = Number.parseFloat(`${decimal[1]}.${decimal[2]}`);
    if (!Number.isFinite(factor) || factor <= 0) return null;
    return clampMultiplier(Math.round(factor * 1000));
  }

  if (!/^\d+$/.test(ascii)) return null;
  const n = Number.parseInt(ascii, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 10) return clampMultiplier(n * 1000);
  return clampMultiplier(n);
}

export type ChargeBaseOverrideSlice = {
  fromMonth: number;
  toMonth: number;
  baseCharge: number;
};

/**
 * Build effective monthly bases [1..12] for a plan year.
 * Later overrides in the array win on overlap (writer should keep ranges disjoint).
 */
export function buildBasesByMonth(
  planBase: number,
  overrides: ChargeBaseOverrideSlice[] = [],
): number[] {
  const bases = Array.from({ length: 13 }, () =>
    planBase > 0 ? Math.trunc(planBase) : 0,
  );
  for (const o of overrides) {
    const from = Math.min(12, Math.max(1, Math.trunc(o.fromMonth)));
    const to = Math.min(12, Math.max(from, Math.trunc(o.toMonth)));
    const base = o.baseCharge > 0 ? Math.trunc(o.baseCharge) : 0;
    for (let m = from; m <= to; m++) {
      bases[m] = base;
    }
  }
  return bases;
}

export function effectiveBaseForMonth(
  basesByMonth: number[],
  month: number,
): number {
  if (month < 1 || month > 12) return 0;
  return basesByMonth[month] ?? 0;
}

export type PaymentSlice = {
  month: number;
  amount: number;
  status: ChargeStatusValue;
};

/**
 * Dynamic arrears for months 1..throughMonth in a plan year.
 * No pre-allocated rows: missing month = full charge owed.
 * `basesByMonth` index 1..12 = effective base that month (after overrides).
 */
export function unitArrears(input: {
  /** @deprecated Prefer basesByMonth — flat base for all months. */
  baseCharge?: number;
  basesByMonth?: number[];
  multiplier: number;
  throughMonth: number;
  payments: PaymentSlice[];
}): number {
  const bases =
    input.basesByMonth ??
    buildBasesByMonth(input.baseCharge ?? 0, []);
  if (input.throughMonth < 1) return 0;

  const byMonth = new Map(
    input.payments.map((p) => [p.month, p] as const),
  );
  let debt = 0;
  const last = Math.min(12, Math.max(1, input.throughMonth));

  for (let month = 1; month <= last; month++) {
    const charge = unitMonthlyCharge(bases[month] ?? 0, input.multiplier);
    if (charge <= 0) continue;
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

/** Collected amount credited toward the year (PAID + PARTIAL + WAIVED as full month charge). */
export function unitCollected(input: {
  /** @deprecated Prefer basesByMonth. */
  baseCharge?: number;
  basesByMonth?: number[];
  multiplier: number;
  payments: PaymentSlice[];
}): number {
  const bases =
    input.basesByMonth ??
    buildBasesByMonth(input.baseCharge ?? 0, []);
  let total = 0;
  for (const p of input.payments) {
    const charge = unitMonthlyCharge(bases[p.month] ?? 0, input.multiplier);
    if (p.status === "WAIVED") {
      total += charge;
    } else if (p.status === "PAID" || p.status === "PARTIAL") {
      total += p.amount;
    }
  }
  return total;
}

/** Expected YTD: sum of monthly charges for months 1..throughMonth. */
export function unitExpectedYtd(input: {
  basesByMonth: number[];
  multiplier: number;
  throughMonth: number;
}): number {
  const last = Math.min(12, Math.max(0, input.throughMonth));
  let total = 0;
  for (let month = 1; month <= last; month++) {
    total += unitMonthlyCharge(
      input.basesByMonth[month] ?? 0,
      input.multiplier,
    );
  }
  return total;
}

export function monthLabelFa(month: number): string {
  if (month < 1 || month > 12) return String(month);
  return MONTH_LABELS_FA[month] ?? String(month);
}
