/**
 * Personal template helpers — month windows, budget progress, run-rate (integers only).
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

/** Day of month (1–31) in Asia/Tehran. */
export function tehranDayOfMonth(date: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tehran",
      day: "numeric",
    }).format(date),
  );
}

/** Number of days in the Tehran calendar month containing `date`. */
export function tehranDaysInMonth(date: Date = new Date()): number {
  const key = tehranMonthKey(date);
  const [y, m] = key.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
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

/**
 * Project full-month spend from pace so far.
 * dayOfMonth clamped to ≥1 to avoid divide-by-zero on edge cases.
 */
export function projectedMonthSpend(
  expensesSoFar: number,
  date: Date = new Date(),
): number {
  const day = Math.max(1, tehranDayOfMonth(date));
  const days = tehranDaysInMonth(date);
  return Math.round((expensesSoFar * days) / day);
}

export type PaceVsBudget = {
  projected: number;
  overBudget: boolean;
  /** projected - budget; positive means projected overspend */
  overBy: number | null;
};

export function paceVsBudget(
  expensesSoFar: number,
  monthlyBudget: number | null | undefined,
  date: Date = new Date(),
): PaceVsBudget {
  const projected = projectedMonthSpend(expensesSoFar, date);
  if (monthlyBudget == null || monthlyBudget <= 0) {
    return { projected, overBudget: false, overBy: null };
  }
  const overBy = projected - monthlyBudget;
  return {
    projected,
    overBudget: overBy > 0,
    overBy,
  };
}

/** Spent vs category cap for one category this month. */
export function categoryBudgetProgress(
  spent: number,
  cap: number,
): { percent: number; remaining: number; over: boolean } {
  const percent =
    cap <= 0 ? 100 : Math.min(999, Math.round((spent * 100) / cap));
  const remaining = cap - spent;
  return { percent, remaining, over: remaining < 0 };
}
