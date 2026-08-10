import {
  currencyLabel,
  formatMoney,
  type SpaceCurrency,
} from "@/lib/format";

/**
 * Format a monetary amount with Persian digits, thousand separators, and currency label.
 * Amounts are integers in the space's unit (never Float).
 * Uses deterministic digits (same SSR/CSR) — see `formatMoney`.
 */
export const formatCurrency = (
  amount: number | null | undefined,
  currency: SpaceCurrency = "TOMAN",
): string => {
  if (amount == null || isNaN(amount)) {
    return `۰ ${currencyLabel(currency)}`;
  }
  return `${formatMoney(amount)} ${currencyLabel(currency)}`;
};
