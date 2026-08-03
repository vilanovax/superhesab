/**
 * Currency helpers — amounts are always integers in the smallest unit.
 * Never use floating-point arithmetic for money.
 *
 * Share weights are stored as integer half-units (1 = 0.5×, 2 = 1×, 3 = 1.5×).
 * UI steps by one half-unit (+/− ۰٫۵).
 */

export type Money = number & { readonly __brand: "Money" };

/** Minimum weight: 0.5× */
export const MIN_SHARE = 1;
/** Maximum weight: 10× (20 half-units) */
export const MAX_SHARE = 20;
/** Default weight: 1× */
export const DEFAULT_SHARE = 2;
/** One UI step = 0.5× */
export const SHARE_STEP = 1;

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

export type WeightedSplitInput = {
  userId: string;
  share: number;
};

export type WeightedSplitResult = {
  userId: string;
  share: number;
  amount: Money;
};

/**
 * Weighted EQUAL split — integer-only (share = half-units).
 * floor(total * share / totalShares), then +1 remainder round-robin from start.
 * When every share is DEFAULT_SHARE (1×), matches splitEqual for the same order.
 */
export function calculateWeightedSplits(
  totalAmount: number,
  members: WeightedSplitInput[],
): WeightedSplitResult[] {
  if (!Number.isInteger(totalAmount) || totalAmount < 0) {
    throw new Error("totalAmount must be a non-negative integer");
  }
  if (members.length === 0) {
    throw new Error("members must be non-empty");
  }

  for (const m of members) {
    if (
      !Number.isInteger(m.share) ||
      m.share < MIN_SHARE ||
      m.share > MAX_SHARE
    ) {
      throw new Error(
        `share must be an integer ${MIN_SHARE}–${MAX_SHARE} half-units (got ${m.share})`,
      );
    }
  }

  const totalShares = members.reduce((sum, m) => sum + m.share, 0);
  if (totalShares < 1) {
    throw new Error("totalShares must be >= 1");
  }

  const rows = members.map((m) => ({
    userId: m.userId,
    share: m.share,
    amount: Math.floor((totalAmount * m.share) / totalShares),
  }));

  let remainder = totalAmount - rows.reduce((sum, row) => sum + row.amount, 0);
  let i = 0;
  while (remainder > 0 && rows.length > 0) {
    rows[i]!.amount += 1;
    remainder -= 1;
    i = (i + 1) % rows.length;
  }

  return rows.map((row) => ({
    userId: row.userId,
    share: row.share,
    amount: asMoney(row.amount),
  }));
}

export function clampShare(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SHARE;
  return Math.min(MAX_SHARE, Math.max(MIN_SHARE, Math.trunc(value)));
}

/** Format half-unit share for UI: 1 → ۰٫۵، 2 → ۱، 3 → ۱٫۵ */
export function formatShareLabel(halfUnits: number): string {
  const n = clampShare(halfUnits);
  const whole = Math.floor(n / 2);
  const hasHalf = n % 2 === 1;
  const faWhole = new Intl.NumberFormat("fa-IR").format(whole);
  if (!hasHalf) return faWhole;
  if (whole === 0) return "۰٫۵";
  return `${faWhole}٫۵`;
}

export function assertSplitsSumToTotal(total: Money, parts: Money[]): void {
  const sum = parts.reduce((acc, n) => acc + n, 0);
  if (sum !== total) {
    throw new Error(`Split sum ${sum} !== total ${total}`);
  }
}

export type PercentageSplitInput = {
  userId: string;
  /** Whole percent 0–100; selected rows must sum to 100. */
  percent: number;
};

export type PercentageSplitResult = {
  userId: string;
  percent: number;
  amount: Money;
};

/**
 * Percentage split — integer-only.
 * floor(total * percent / 100), then +1 remainder round-robin in input order.
 * Caller must ensure sum(percent) === 100 and stable order (e.g. sort by userId).
 */
export function calculatePercentageSplits(
  totalAmount: number,
  members: PercentageSplitInput[],
): PercentageSplitResult[] {
  if (!Number.isInteger(totalAmount) || totalAmount < 0) {
    throw new Error("totalAmount must be a non-negative integer");
  }
  if (members.length === 0) {
    throw new Error("members must be non-empty");
  }

  let percentSum = 0;
  for (const m of members) {
    if (
      !Number.isInteger(m.percent) ||
      m.percent < 0 ||
      m.percent > 100
    ) {
      throw new Error(
        `percent must be an integer 0–100 (got ${m.percent})`,
      );
    }
    percentSum += m.percent;
  }
  if (percentSum !== 100) {
    throw new Error(`percent sum ${percentSum} !== 100`);
  }

  const rows = members.map((m) => ({
    userId: m.userId,
    percent: m.percent,
    amount: Math.floor((totalAmount * m.percent) / 100),
  }));

  let remainder = totalAmount - rows.reduce((sum, row) => sum + row.amount, 0);
  let i = 0;
  while (remainder > 0 && rows.length > 0) {
    rows[i]!.amount += 1;
    remainder -= 1;
    i = (i + 1) % rows.length;
  }

  return rows.map((row) => ({
    userId: row.userId,
    percent: row.percent,
    amount: asMoney(row.amount),
  }));
}

/** Distribute 100 whole percents across N people (remainder to first slots). */
export function distributeEqualPercents(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(100 / count);
  const rem = 100 % count;
  return Array.from({ length: count }, (_, i) => base + (i < rem ? 1 : 0));
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
