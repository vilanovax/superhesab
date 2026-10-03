import {
  jalaliDay,
  jalaliMonth,
  jalaliYear,
  monthLabelFa,
} from "@/lib/building";
import { MAX_MONEY_AMOUNT } from "@/lib/money";

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

const MONEY_MINUS = /[-−–—]/;
/** Grouping: ASCII comma, Arabic thousands ٬, Arabic comma ،, ٫/`.` when 3+ digits follow. */
const MONEY_GROUP_SEP = /[,٬،.٫]/g;
const MONEY_JUNK =
  /[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\u00A0\u202F\u2009\u200A\u2011]/g;

/**
 * Fold Arabic/Persian lookalikes so search for «کی» matches «كي».
 */
export function foldPersian(input: string): string {
  return input
    .replace(/ي/g, "ی")
    .replace(/ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

/** Fold + collapse spaces — duplicate-name checks for FUND members. */
export function memberNameKey(name: string): string {
  return foldPersian(name).replace(/\s+/g, " ").trim();
}

export function memberDisplayNameTaken(
  candidate: string,
  existingNames: Iterable<string | null | undefined>,
): boolean {
  const key = memberNameKey(candidate);
  if (!key) return false;
  for (const n of existingNames) {
    if (!n) continue;
    if (memberNameKey(n) === key) return true;
  }
  return false;
}

export type MoneyInputInterpret =
  | { status: "empty" }
  | { status: "ok"; value: number }
  | {
      status: "error";
      code: "negative" | "decimal" | "invalid" | "too_large";
    };

/**
 * Integer money parse. Does not glue digits across a decimal mark
 * (`375.5` is rejected, not 3755). A trailing 1–2-digit group after a
 * thousand-separator is treated as a decimal (`۱۲۳۴٬۵۶`).
 */
export function interpretMoneyInput(input: string): MoneyInputInterpret {
  const trimmed = input.replace(MONEY_JUNK, "").trim();
  if (!trimmed) return { status: "empty" };

  const ascii = toAsciiDigits(trimmed);
  if (MONEY_MINUS.test(ascii)) return { status: "error", code: "negative" };

  const compact = ascii.replace(/[+\s]/g, "");
  if (!compact) return { status: "empty" };

  const lastSep = Math.max(
    compact.lastIndexOf(","),
    compact.lastIndexOf("٬"),
    compact.lastIndexOf("،"),
    compact.lastIndexOf("."),
    compact.lastIndexOf("٫"),
  );
  if (lastSep >= 0) {
    const frac = compact.slice(lastSep + 1);
    // 1–2 digits after a separator = decimal (۱۲۳۴٫۵۶ / 375.5), not 250.000.
    if (/^\d{1,2}$/.test(frac)) {
      return { status: "error", code: "decimal" };
    }
  }

  const digits = compact.replace(MONEY_GROUP_SEP, "");
  if (!/^\d+$/.test(digits)) return { status: "error", code: "invalid" };

  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n)) return { status: "error", code: "invalid" };
  if (n > MAX_MONEY_AMOUNT) return { status: "error", code: "too_large" };
  return { status: "ok", value: n };
}

/** Parse a formatted money string into an integer (0 if empty or invalid). */
export function parseMoneyInput(input: string): number {
  const parsed = interpretMoneyInput(input);
  return parsed.status === "ok" ? parsed.value : 0;
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
