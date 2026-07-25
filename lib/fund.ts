/**
 * FUND rotating savings — pure helpers (integers only).
 * Member expected = (shareAmount * defaultShare) / 2
 * because defaultShare is half-units (2 = 1.0×).
 */

export function expectedPaymentForShare(
  shareAmount: number,
  defaultShareHalfUnits: number,
): number {
  if (shareAmount < 0 || defaultShareHalfUnits < 0) return 0;
  return Math.trunc((shareAmount * defaultShareHalfUnits) / 2);
}

export function expectedPoolTotal(
  shareAmount: number,
  members: { defaultShare: number }[],
): number {
  return members.reduce(
    (sum, m) => sum + expectedPaymentForShare(shareAmount, m.defaultShare),
    0,
  );
}

export function collectedTotal(payments: { amount: number }[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}
