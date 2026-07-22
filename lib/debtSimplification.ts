export type SimplifiedSettlement = {
  fromUserId: string;
  toUserId: string;
  amount: number;
};

/**
 * Greedy debt simplification.
 * Positive balance = creditor (others owe them).
 * Negative balance = debtor (they owe others).
 */
export function simplifyDebts(
  balances: Record<string, number>,
): SimplifiedSettlement[] {
  const debtors = Object.entries(balances)
    .filter(([, amount]) => amount < 0)
    .map(([userId, amount]) => ({ userId, amount: Math.abs(amount) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = Object.entries(balances)
    .filter(([, amount]) => amount > 0)
    .map(([userId, amount]) => ({ userId, amount }))
    .sort((a, b) => b.amount - a.amount);

  const suggestions: SimplifiedSettlement[] = [];
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
