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

export type FundTurnAssignment = {
  periodIndex: number;
  winnerMemberId: string | null;
};

/**
 * Map memberId → periodIndex where they already won (ASSIGNED with winner).
 * Only the first period is kept if duplicates somehow exist.
 */
export function winnerPeriodByMember(
  turns: FundTurnAssignment[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of turns) {
    if (!t.winnerMemberId) continue;
    if (!map.has(t.winnerMemberId)) {
      map.set(t.winnerMemberId, t.periodIndex);
    }
  }
  return map;
}

/**
 * Period where this member already won, excluding `currentPeriodIndex`.
 * Null = free to assign here.
 */
export function findConflictingWinnerPeriod(
  turns: FundTurnAssignment[],
  winnerMemberId: string,
  currentPeriodIndex: number,
): number | null {
  for (const t of turns) {
    if (
      t.winnerMemberId === winnerMemberId &&
      t.periodIndex !== currentPeriodIndex
    ) {
      return t.periodIndex;
    }
  }
  return null;
}

export type AssignWinnerCheck =
  | { ok: true }
  | { ok: false; error: string; conflictingPeriod?: number };

/** ROSCA rule: one member wins at most one period per cycle. */
export function assertUniqueWinnerAssignment(
  turns: FundTurnAssignment[],
  winnerMemberId: string | null,
  currentPeriodIndex: number,
): AssignWinnerCheck {
  if (!winnerMemberId) return { ok: true };
  const conflict = findConflictingWinnerPeriod(
    turns,
    winnerMemberId,
    currentPeriodIndex,
  );
  if (conflict != null) {
    return {
      ok: false,
      error: `این عضو قبلاً برندهٔ دورهٔ ${conflict} است.`,
      conflictingPeriod: conflict,
    };
  }
  return { ok: true };
}

export type PaymentAmountCheck =
  | { ok: true; amount: number }
  | { ok: false; error: string };

/** Paid tick must equal expected share exactly (no float; no silent override). */
export function assertFundPaymentAmount(
  expectedAmount: number,
  amount: number | undefined,
): PaymentAmountCheck {
  if (expectedAmount < 1) {
    return {
      ok: false,
      error: "سهم مورد انتظار این عضو نامعتبر است (ضریب یا پلن را بررسی کنید).",
    };
  }
  const resolved = amount ?? expectedAmount;
  if (!Number.isInteger(resolved) || resolved < 1) {
    return { ok: false, error: "مبلغ پرداخت باید عدد صحیح مثبت باشد." };
  }
  if (resolved !== expectedAmount) {
    return {
      ok: false,
      error: "مبلغ باید دقیقاً برابر سهم مورد انتظار دوره باشد.",
    };
  }
  return { ok: true, amount: resolved };
}

export function assertPeriodInPlan(
  periodIndex: number,
  periodCount: number,
): { ok: true } | { ok: false; error: string } {
  if (
    !Number.isInteger(periodIndex) ||
    periodIndex < 1 ||
    periodIndex > periodCount
  ) {
    return { ok: false, error: "شماره دوره نامعتبر است." };
  }
  return { ok: true };
}

export type FundPeriodReport = {
  periodIndex: number;
  expectedTotal: number;
  collectedTotal: number;
  shortfall: number;
  progressPercent: number;
  paidCount: number;
  unpaidCount: number;
  isComplete: boolean;
  unpaidNames: string[];
  winnerName: string | null;
  status: "OPEN" | "ASSIGNED" | null;
};

export function buildPeriodReport(input: {
  periodIndex: number;
  expectedTotal: number;
  collectedTotal: number;
  members: { name: string; paid: boolean }[];
  winnerName: string | null;
  status: "OPEN" | "ASSIGNED" | null;
}): FundPeriodReport {
  const paidCount = input.members.filter((m) => m.paid).length;
  const unpaid = input.members.filter((m) => !m.paid);
  const shortfall = Math.max(0, input.expectedTotal - input.collectedTotal);
  const progressPercent =
    input.expectedTotal > 0
      ? Math.min(
          100,
          Math.round((input.collectedTotal * 100) / input.expectedTotal),
        )
      : 0;

  return {
    periodIndex: input.periodIndex,
    expectedTotal: input.expectedTotal,
    collectedTotal: input.collectedTotal,
    shortfall,
    progressPercent,
    paidCount,
    unpaidCount: unpaid.length,
    isComplete: input.members.length > 0 && unpaid.length === 0,
    unpaidNames: unpaid.map((m) => m.name),
    winnerName: input.winnerName,
    status: input.status,
  };
}

export type FundCycleIntegrity = {
  assignedCount: number;
  openCount: number;
  uniqueWinners: number;
  /** memberId → periods (length > 1 means integrity breach) */
  duplicateWinnerPeriods: { memberId: string; periods: number[] }[];
};

export function buildCycleIntegrity(
  turns: FundTurnAssignment[],
): FundCycleIntegrity {
  const byMember = new Map<string, number[]>();
  let assignedCount = 0;
  let openCount = 0;

  for (const t of turns) {
    if (t.winnerMemberId) {
      assignedCount += 1;
      const list = byMember.get(t.winnerMemberId) ?? [];
      list.push(t.periodIndex);
      byMember.set(t.winnerMemberId, list);
    } else {
      openCount += 1;
    }
  }

  const duplicateWinnerPeriods: { memberId: string; periods: number[] }[] = [];
  for (const [memberId, periods] of byMember) {
    if (periods.length > 1) {
      duplicateWinnerPeriods.push({
        memberId,
        periods: [...periods].sort((a, b) => a - b),
      });
    }
  }

  return {
    assignedCount,
    openCount,
    uniqueWinners: byMember.size,
    duplicateWinnerPeriods,
  };
}
