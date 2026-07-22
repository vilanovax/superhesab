/**
 * Domain stubs — implement in later tasks.
 * Keep debt math pure and unit-testable.
 */

import type { NetBalance, SuggestedSettlement } from "@/types";

export function simplifyDebts(balances: NetBalance[]): SuggestedSettlement[] {
  const debtors = balances
    .filter((b) => b.amount < 0)
    .map((b) => ({ userId: b.userId, amount: -b.amount }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter((b) => b.amount > 0)
    .map((b) => ({ userId: b.userId, amount: b.amount }))
    .sort((a, b) => b.amount - a.amount);

  const suggestions: SuggestedSettlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 0) {
      suggestions.push({
        fromUserId: debtors[i].userId,
        toUserId: creditors[j].userId,
        amount: pay,
      });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount === 0) i += 1;
    if (creditors[j].amount === 0) j += 1;
  }

  return suggestions;
}
