/**
 * Pure helpers for FAMILY SavingsPot — isolated from Expense.
 * Balance = deposits − withdrawals (integers only).
 */

export type SavingsPotStatusValue = "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type SavingsTransactionTypeValue = "DEPOSIT" | "WITHDRAWAL";

export function savingsNetBalance(
  transactions: { amount: number; type: SavingsTransactionTypeValue }[],
): number {
  let net = 0;
  for (const t of transactions) {
    if (t.type === "DEPOSIT") net += t.amount;
    else net -= t.amount;
  }
  return net;
}

/** 0–100 progress toward target (capped). */
export function savingsProgressPercent(
  targetAmount: number,
  balance: number,
): number {
  if (targetAmount <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((balance * 100) / targetAmount)));
}

export function savingsRemainingToTarget(
  targetAmount: number,
  balance: number,
): number {
  return Math.max(0, targetAmount - balance);
}
