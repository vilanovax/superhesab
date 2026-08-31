/**
 * Pure helpers for the Debt module (no Prisma).
 * Remaining = initialAmount - sum(payments); never Float.
 */

import { tehranMonthKey } from "@/lib/personal";

export const DEBT_DUE_SOON_DAYS = 3;

export type DebtTypeValue = "LENT" | "BORROWED";
export type DebtStatusValue = "ACTIVE" | "SETTLED";

export function debtPaidTotal(payments: { amount: number }[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

export function debtRemaining(
  initialAmount: number,
  payments: { amount: number }[],
): number {
  return Math.max(0, initialAmount - debtPaidTotal(payments));
}

/** 0–100 progress of repayment. */
export function debtProgressPercent(
  initialAmount: number,
  payments: { amount: number }[],
): number {
  if (initialAmount <= 0) return 100;
  const paid = debtPaidTotal(payments);
  return Math.min(100, Math.round((paid * 100) / initialAmount));
}

export function isDebtFullyPaid(
  initialAmount: number,
  payments: { amount: number }[],
): boolean {
  return debtPaidTotal(payments) >= initialAmount;
}

export function debtStatusAfter(
  initialAmount: number,
  payments: { amount: number }[],
): DebtStatusValue {
  return isDebtFullyPaid(initialAmount, payments) ? "SETTLED" : "ACTIVE";
}

/** Calendar days until due (Tehran-ish via UTC noon compare). Negative = overdue. */
export function daysUntilDue(dueDate: Date | null | undefined, now = new Date()): number | null {
  if (!dueDate) return null;
  const due = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate(),
  );
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((due - today) / (24 * 60 * 60 * 1000));
}

export function isDueSoon(
  dueDate: Date | null | undefined,
  withinDays = DEBT_DUE_SOON_DAYS,
  now = new Date(),
): boolean {
  const days = daysUntilDue(dueDate, now);
  if (days == null) return false;
  return days <= withinDays;
}

export function debtTypeLabel(type: DebtTypeValue): string {
  return type === "LENT" ? "طلب" : "یادم‌باشه";
}

/** Group key — trim, collapse spaces. Persian has no case; keep stable. */
export function counterpartyKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("fa");
}

export type DebtAccountItem = {
  id: string;
  type: DebtTypeValue;
  status: DebtStatusValue;
  counterparty: string;
  remaining: number;
  initialAmount: number;
  paidTotal: number;
  dueDate: string | null;
  createdAt: string;
  payments: { id: string; amount: number; date: string; note: string | null }[];
};

export type DebtAccount<T extends DebtAccountItem = DebtAccountItem> = {
  key: string;
  type: DebtTypeValue;
  counterparty: string;
  remaining: number;
  initialTotal: number;
  paidTotal: number;
  itemCount: number;
  nearestDueDate: string | null;
  debts: T[];
};

function dueSortValue(dueDate: string | null): string {
  return dueDate ?? "9999-99-99";
}

/** Oldest due first; undated last; then oldest created. */
export function sortDebtsForPayment<T extends DebtAccountItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const due = dueSortValue(a.dueDate).localeCompare(dueSortValue(b.dueDate));
    if (due !== 0) return due;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/**
 * Split a payment across open debts (integers only).
 * Fails if amount exceeds combined remaining.
 */
export function allocatePaymentFifo(
  items: Array<{ id: string; remaining: number; dueDate: string | null; createdAt: string }>,
  amount: number,
):
  | { ok: true; splits: { id: string; amount: number }[] }
  | { ok: false; remaining: number } {
  const open = items
    .filter((d) => d.remaining > 0)
    .sort((a, b) => {
      const due = dueSortValue(a.dueDate).localeCompare(dueSortValue(b.dueDate));
      if (due !== 0) return due;
      return a.createdAt.localeCompare(b.createdAt);
    });
  const totalOpen = open.reduce((sum, d) => sum + d.remaining, 0);
  if (amount <= 0 || amount > totalOpen) {
    return { ok: false, remaining: totalOpen };
  }

  const splits: { id: string; amount: number }[] = [];
  let left = amount;
  for (const debt of open) {
    if (left <= 0) break;
    const take = Math.min(debt.remaining, left);
    if (take > 0) {
      splits.push({ id: debt.id, amount: take });
      left -= take;
    }
  }
  return { ok: true, splits };
}

export function groupDebtAccounts<T extends DebtAccountItem>(
  debts: T[],
): DebtAccount<T>[] {
  const map = new Map<string, T[]>();
  for (const debt of debts) {
    const key = `${debt.type}|${counterpartyKey(debt.counterparty)}`;
    const list = map.get(key);
    if (list) list.push(debt);
    else map.set(key, [debt]);
  }

  const accounts: DebtAccount<T>[] = [];
  for (const [key, list] of map) {
    const newest = [...list].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )[0]!;
    const remaining = list.reduce((sum, d) => sum + d.remaining, 0);
    const initialTotal = list.reduce((sum, d) => sum + d.initialAmount, 0);
    const paidTotal = list.reduce((sum, d) => sum + d.paidTotal, 0);
    const activeCount = list.filter((d) => d.status === "ACTIVE").length;
    const dues = list
      .filter((d) => d.status === "ACTIVE")
      .map((d) => d.dueDate)
      .filter((d): d is string => Boolean(d))
      .sort();
    accounts.push({
      key,
      type: newest.type,
      counterparty: newest.counterparty,
      remaining,
      initialTotal,
      paidTotal,
      itemCount: activeCount > 0 ? activeCount : list.length,
      nearestDueDate: dues[0] ?? null,
      debts: sortDebtsForPayment(list),
    });
  }

  return accounts.sort((a, b) => {
    if (a.remaining !== b.remaining) return b.remaining - a.remaining;
    return a.counterparty.localeCompare(b.counterparty, "fa");
  });
}

export type DebtMonthSummary = {
  lentRemaining: number;
  lentOpened: number;
  lentReturned: number;
  borrowedRemaining: number;
  borrowedOpened: number;
  borrowedPaid: number;
};

function inTehranMonth(isoOrDay: string, monthKey: string): boolean {
  const parsed =
    isoOrDay.length <= 10
      ? new Date(`${isoOrDay}T12:00:00+03:30`)
      : new Date(isoOrDay);
  if (!Number.isFinite(parsed.getTime())) return false;
  return tehranMonthKey(parsed) === monthKey;
}

/** Totals for the Tehran calendar month — integers only, no Expense mix-in. */
export function summarizeDebtsForMonth(
  debts: Array<{
    type: DebtTypeValue;
    status: DebtStatusValue;
    initialAmount: number;
    remaining: number;
    createdAt: string;
    payments: { amount: number; date: string }[];
  }>,
  monthKey: string,
): DebtMonthSummary {
  const out: DebtMonthSummary = {
    lentRemaining: 0,
    lentOpened: 0,
    lentReturned: 0,
    borrowedRemaining: 0,
    borrowedOpened: 0,
    borrowedPaid: 0,
  };

  for (const debt of debts) {
    const opened = inTehranMonth(debt.createdAt, monthKey);
    if (debt.type === "LENT") {
      if (debt.status === "ACTIVE") out.lentRemaining += debt.remaining;
      if (opened) out.lentOpened += debt.initialAmount;
      for (const p of debt.payments) {
        if (inTehranMonth(p.date, monthKey)) out.lentReturned += p.amount;
      }
    } else {
      if (debt.status === "ACTIVE") out.borrowedRemaining += debt.remaining;
      if (opened) out.borrowedOpened += debt.initialAmount;
      for (const p of debt.payments) {
        if (inTehranMonth(p.date, monthKey)) out.borrowedPaid += p.amount;
      }
    }
  }

  return out;
}
