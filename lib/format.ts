import {
  jalaliDay,
  jalaliMonth,
  jalaliYear,
  monthLabelFa,
} from "@/lib/building";

export type SpaceCurrency = "TOMAN" | "RIAL" | "USD" | "AED" | "EUR";

export const SPACE_CURRENCIES = [
  "TOMAN",
  "RIAL",
  "USD",
  "AED",
  "EUR",
] as const satisfies readonly SpaceCurrency[];

export const CURRENCY_LABELS: Record<SpaceCurrency, string> = {
  TOMAN: "تومان",
  RIAL: "ریال",
  USD: "دلار",
  AED: "درهم",
  EUR: "یورو",
};

export function isSpaceCurrency(value: string): value is SpaceCurrency {
  return (SPACE_CURRENCIES as readonly string[]).includes(value);
}

export function currencyLabel(currency: SpaceCurrency): string {
  return CURRENCY_LABELS[currency] ?? CURRENCY_LABELS.TOMAN;
}

const FA_DIGIT = "۰۱۲۳۴۵۶۷۸۹";

/**
 * Deterministic Persian digits (no Intl) — same SSR/CSR output everywhere.
 * Avoids hydration drift from Node vs browser `fa-IR` ICU data.
 */
export function formatFaDigits(n: number): string {
  if (!Number.isFinite(n)) return "۰";
  const neg = n < 0;
  const abs = Math.abs(Math.trunc(n));
  const fa = String(abs).replace(/\d/g, (d) => FA_DIGIT[Number(d)]!);
  return neg ? `−${fa}` : fa;
}

/** Format integer amount with Persian digits + thousand separators. */
export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "۰";
  const neg = amount < 0;
  const abs = Math.abs(Math.trunc(amount));
  const grouped = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  const fa = grouped.replace(/\d/g, (d) => FA_DIGIT[Number(d)]!);
  return neg ? `−${fa}` : fa;
}

export function formatMoneyWithCurrency(
  amount: number,
  currency: SpaceCurrency,
): string {
  return `${formatMoney(amount)} ${currencyLabel(currency)}`;
}

export { formatCurrency } from "@/lib/formatters";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Map Persian/Arabic-Indic digits to ASCII 0–9; leave other chars unchanged. */
export function toAsciiDigits(input: string): string {
  return input
    .split("")
    .map((ch) => {
      const p = PERSIAN_DIGITS.indexOf(ch);
      if (p >= 0) return String(p);
      const a = ARABIC_DIGITS.indexOf(ch);
      if (a >= 0) return String(a);
      return ch;
    })
    .join("");
}

/** Strip separators and normalize Eastern digits → ASCII digits string. */
export function normalizeDigits(input: string): string {
  return toAsciiDigits(input).replace(/\D/g, "");
}

/**
 * Canonical phone for auth lookup/storage.
 * Eastern digits → ASCII; drop spaces/dashes/parens; keep leading `+`.
 */
export function normalizePhone(input: string): string {
  return toAsciiDigits(input).replace(/[\s\-()]/g, "").trim();
}

/** Parse a formatted money string into an integer (0 if empty). */
export function parseMoneyInput(input: string): number {
  const digits = normalizeDigits(input);
  if (!digits) return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Shamsi date labels — deterministic (no Intl fa-IR drift between Node/browser).
 */
export function formatDateFa(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = jalaliYear(d);
  const m = jalaliMonth(d);
  const day = jalaliDay(d);
  return `${formatFaDigits(day)} ${monthLabelFa(m)} ${formatFaDigits(y)}`;
}

/** Short Shamsi date (e.g. ۲ مرداد ۱۴۰۵). Same string as long — month names are short. */
export function formatDateFaShort(date: Date | string): string {
  return formatDateFa(date);
}

/** Calendar day key in Tehran (yyyy-mm-dd) for grouping. */
export function expenseDayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Today's date as yyyy-mm-dd in Asia/Tehran. */
export function todayIsoDateTehran(): string {
  return expenseDayKey(new Date());
}

/** Parse form date (yyyy-mm-dd) to a stable DateTime (noon Tehran). */
export function parseExpenseDateInput(isoYmd: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYmd.trim());
  if (!match) return new Date();
  const [, y, m, d] = match;
  return new Date(`${y}-${m}-${d}T12:00:00+03:30`);
}

export function memberLabel(user: {
  name: string | null;
  phone: string;
  isVirtual?: boolean;
}): string {
  const raw = user.name?.trim() || (user.isVirtual ? "همسفر" : user.phone);
  if (!user.isVirtual) return raw;
  // Seed / typed names may already include the tag — never double it.
  const base = raw.replace(/\s*\(دستی\)\s*$/u, "").trim() || "همسفر";
  return `${base} (دستی)`;
}

/** Short payer label for lists — never a phone number. */
export function payerName(
  user: { name: string | null; phone?: string; isVirtual?: boolean },
  options?: { isCurrentUser?: boolean },
): string {
  if (options?.isCurrentUser) return "من";
  const name = user.name?.trim();
  if (name) return name.split(/\s+/)[0] ?? name;
  if (user.isVirtual) return "همسفر";
  return "بدون نام";
}
