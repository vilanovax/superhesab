"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type TripHeroStatsProps = {
  myBalance: number;
  openSettlementAmount: number;
  currency: SpaceCurrency;
  /** When zero, balance “settled” reads as empty — not “all paid up”. */
  expenseCount?: number;
  /** Server-resolved tab on first paint. */
  initialTab?: string;
  /** Member avatars + invite — hidden on expenses to free the first viewport. */
  membersSlot?: ReactNode;
};

/**
 * Trip hero KPIs: slim on هزینه‌ها / چک‌لیست; full 2-up on تراز.
 * Listens to `superhesab:space-tab` so client tab switches update instantly.
 */
export function TripHeroStats({
  myBalance,
  openSettlementAmount,
  currency,
  expenseCount = 0,
  initialTab = "expenses",
  membersSlot,
}: TripHeroStatsProps) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    const onTab = (event: Event) => {
      const next = (event as CustomEvent<{ tab?: string }>).detail?.tab;
      if (typeof next === "string" && next.length > 0) setTab(next);
    };
    window.addEventListener("superhesab:space-tab", onTab);
    return () => window.removeEventListener("superhesab:space-tab", onTab);
  }, []);

  /** Checklist: max list space. Expenses: slim KPI + members. Balances: full 2-up. */
  const compact = tab === "expenses" || tab === "checklist";
  const showMembers =
    (tab === "balances" || tab === "expenses") && Boolean(membersSlot);
  const zeroBalanceLabel =
    expenseCount === 0 ? "بدون هزینه" : "تسویه‌شده";

  return (
    <>
      {showMembers ? membersSlot : null}
      {compact ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-on-hero/10 px-3.5 py-2.5 ring-1 ring-on-hero/10">
          <p className="text-caption font-medium text-on-hero/70">مانده شما</p>
          <p
            className={cn(
              "text-body font-bold tabular-nums",
              myBalance > 0
                ? "text-emerald-100"
                : myBalance < 0
                  ? "text-rose-100"
                  : "text-on-hero",
            )}
          >
            {myBalance === 0
              ? zeroBalanceLabel
              : `${myBalance > 0 ? "+" : "−"}${formatCurrency(Math.abs(myBalance), currency)}`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <HeroMini label="مانده شما">
            {myBalance === 0 ? (
              <span className="text-on-hero/90">{zeroBalanceLabel}</span>
            ) : (
              <span
                className={
                  myBalance > 0 ? "text-emerald-100" : "text-rose-100"
                }
              >
                {myBalance > 0 ? "+" : "−"}
                {formatCurrency(Math.abs(myBalance), currency)}
              </span>
            )}
          </HeroMini>
          <HeroMini label="تسویه باز">
            {openSettlementAmount === 0
              ? "صفر"
              : formatCurrency(openSettlementAmount, currency)}
          </HeroMini>
        </div>
      )}
    </>
  );
}

function HeroMini({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-on-hero/10 px-3 py-2.5 ring-1 ring-on-hero/10">
      <p className="text-caption font-medium text-on-hero/70">{label}</p>
      <p className="mt-1 text-body-sm font-bold tabular-nums text-on-hero">
        {children}
      </p>
    </div>
  );
}
