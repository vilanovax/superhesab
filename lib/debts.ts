/**
 * Pure helpers for the Debt module (no Prisma).
 * Remaining = initialAmount - sum(payments); never Float.
 */

export const DEBT_DUE_SOON_DAYS = 3;

export type DebtTypeValue = "LENT" | "BORROWED";
export type DebtStatusValue = "ACTIVE" | "SETTLED";

export function debtPaidTotal(payments: { amount: number }[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

export function debtRemaining(
  initialAmount: number,
  payments: { amount: number }[],
): number {
  return Math.max(0, initialAmount - debtPaidTotal(payments));
}

/** 0–100 progress of repayment. */
export function debtProgressPercent(
  initialAmount: number,
  payments: { amount: number }[],
): number {
  if (initialAmount <= 0) return 100;
  const paid = debtPaidTotal(payments);
  return Math.min(100, Math.round((paid * 100) / initialAmount));
}

export function isDebtFullyPaid(
  initialAmount: number,
  payments: { amount: number }[],
): boolean {
  return debtPaidTotal(payments) >= initialAmount;
}

/** Calendar days until due (Tehran-ish via UTC noon compare). Negative = overdue. */
export function daysUntilDue(dueDate: Date | null | undefined, now = new Date()): number | null {
  if (!dueDate) return null;
  const due = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate(),
  );
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((due - today) / (24 * 60 * 60 * 1000));
}

export function isDueSoon(
  dueDate: Date | null | undefined,
  withinDays = DEBT_DUE_SOON_DAYS,
  now = new Date(),
): boolean {
  const days = daysUntilDue(dueDate, now);
  if (days == null) return false;
  return days <= withinDays;
}

export function debtTypeLabel(type: DebtTypeValue): string {
  return type === "LENT" ? "طلب" : "بدهی";
}
