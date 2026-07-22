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

/**
 * Round magnitude up to the nearest thousand (e.g. 296666 → 297000).
 * Preserves sign. Zero stays zero.
 */
export function ceilToThousand(amount: number): number {
  if (!Number.isFinite(amount) || amount === 0) return 0;
  const sign = amount < 0 ? -1 : 1;
  const abs = Math.abs(Math.trunc(amount));
  return sign * Math.ceil(abs / 1000) * 1000;
}

export function maybeCeilToThousand(
  amount: number,
  enabled: boolean,
): number {
  return enabled ? ceilToThousand(amount) : amount;
}
