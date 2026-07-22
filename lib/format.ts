export type SpaceCurrency = "TOMAN" | "RIAL";

export const CURRENCY_LABELS: Record<SpaceCurrency, string> = {
  TOMAN: "تومان",
  RIAL: "ریال",
};

export function currencyLabel(currency: SpaceCurrency): string {
  return CURRENCY_LABELS[currency] ?? CURRENCY_LABELS.TOMAN;
}

/** Format integer amount with Persian digits + thousand separators. */
export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "۰";
  return new Intl.NumberFormat("fa-IR").format(Math.trunc(amount));
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

/** Strip separators and normalize Eastern digits → ASCII digits string. */
export function normalizeDigits(input: string): string {
  return input
    .split("")
    .map((ch) => {
      const p = PERSIAN_DIGITS.indexOf(ch);
      if (p >= 0) return String(p);
      const a = ARABIC_DIGITS.indexOf(ch);
      if (a >= 0) return String(a);
      return ch;
    })
    .join("")
    .replace(/\D/g, "");
}

/** Parse a formatted money string into an integer (0 if empty). */
export function parseMoneyInput(input: string): number {
  const digits = normalizeDigits(input);
  if (!digits) return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

export function formatDateFa(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Tehran",
  }).format(d);
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
  const base = user.name?.trim() || (user.isVirtual ? "همسفر" : user.phone);
  return user.isVirtual ? `${base} (دستی)` : base;
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
