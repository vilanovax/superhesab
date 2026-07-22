/**
 * Format a monetary amount with Persian digits, thousand separators, and تومان.
 */
export const formatCurrency = (
  amount: number | null | undefined,
): string => {
  if (amount == null || isNaN(amount)) return "۰ تومان";
  return new Intl.NumberFormat("fa-IR").format(amount) + " تومان";
};
