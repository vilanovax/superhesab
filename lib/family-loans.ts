/**
 * Pure helpers for FAMILY InternalLoan — isolated from Debt & Settlement.
 * Reuses the same remaining/progress math as external debts.
 */

export {
  debtPaidTotal as loanPaidTotal,
  debtRemaining as loanRemaining,
  debtProgressPercent as loanProgressPercent,
  isDebtFullyPaid as isLoanFullyPaid,
  daysUntilDue,
  isDueSoon,
  DEBT_DUE_SOON_DAYS as LOAN_DUE_SOON_DAYS,
} from "@/lib/debts";

export type InternalLoanStatusValue = "ACTIVE" | "SETTLED";
