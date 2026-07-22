/**
 * Currency helpers — amounts are always integers in the smallest unit.
 * Never use floating-point arithmetic for money.
 */

export type Money = number & { readonly __brand: "Money" };

export function asMoney(value: number): Money {
  if (!Number.isInteger(value)) {
    throw new Error(`Money must be an integer (got ${value})`);
  }
  return value as Money;
}

/** Split total into N equal integer parts; remainder goes to the first `rem` recipients. */
export function splitEqual(total: Money, participantCount: number): Money[] {
  if (participantCount <= 0) {
    throw new Error("participantCount must be > 0");
  }
  const base = Math.floor(total / participantCount);
  const remainder = total % participantCount;
  return Array.from({ length: participantCount }, (_, i) =>
    asMoney(base + (i < remainder ? 1 : 0)),
  );
}

export function assertSplitsSumToTotal(total: Money, parts: Money[]): void {
  const sum = parts.reduce((acc, n) => acc + n, 0);
  if (sum !== total) {
    throw new Error(`Split sum ${sum} !== total ${total}`);
  }
}
