/**
 * Personal template helpers — month windows + budget progress (integers only).
 */

/** Calendar month key in Asia/Tehran (yyyy-mm). */
export function tehranMonthKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

/**
 * Inclusive month bounds as Date objects for Prisma filters.
 * Uses noon Tehran on first/last day to avoid DST edge issues on day keys.
 */
export function tehranMonthRange(date: Date = new Date()): {
  start: Date;
  end: Date;
  key: string;
} {
  const key = tehranMonthKey(date);
  const [y, m] = key.split("-").map(Number) as [number, number];
  const start = new Date(`${key}-01T00:00:00+03:30`);
  // Day 0 of next month = last day of this month
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = new Date(
    `${key}-${String(lastDay).padStart(2, "0")}T23:59:59.999+03:30`,
  );
  return { start, end, key };
}

export function isInTehranMonth(date: Date, monthKey: string): boolean {
  return tehranMonthKey(date) === monthKey;
}

/** 0–100 integer percent of budget used (expenses / budget). */
export function budgetUsedPercent(
  expenses: number,
  monthlyBudget: number | null | undefined,
): number | null {
  if (monthlyBudget == null || monthlyBudget <= 0) return null;
  return Math.min(999, Math.round((expenses * 100) / monthlyBudget));
}

export function budgetRemaining(
  expenses: number,
  monthlyBudget: number | null | undefined,
): number | null {
  if (monthlyBudget == null) return null;
  return monthlyBudget - expenses;
}
