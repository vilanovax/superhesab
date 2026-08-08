"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type PartnerHeroStatsProps = {
  myBalance: number;
  currency: SpaceCurrency;
  initialTab?: string;
  /** Shown on تراز; hidden on هزینه‌ها. */
  membersSlot?: ReactNode;
};

/**
 * Partner hero: slim balance on expenses; members only on تراز
 * (balance detail lives in the balances tab — no triple repeat).
 */
export function PartnerHeroStats({
  myBalance,
  currency,
  initialTab = "expenses",
  membersSlot,
}: PartnerHeroStatsProps) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    const onTab = (event: Event) => {
      const next = (event as CustomEvent<{ tab?: string }>).detail?.tab;
      if (typeof next === "string" && next.length > 0) setTab(next);
    };
    window.addEventListener("superhesab:space-tab", onTab);
    return () => window.removeEventListener("superhesab:space-tab", onTab);
  }, []);

  const onExpenses = tab === "expenses";
  const onBalances = tab === "balances";

  return (
    <>
      {onBalances && membersSlot ? membersSlot : null}
      {onExpenses ? (
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
              ? "صاف"
              : `${myBalance > 0 ? "+" : "−"}${formatCurrency(Math.abs(myBalance), currency)}`}
          </p>
        </div>
      ) : null}
    </>
  );
}
