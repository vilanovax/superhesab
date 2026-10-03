"use client";

import { useEffect, useState } from "react";
import {
  applyExpenseLedgerDelta,
  type ExpenseLedgerDelta,
} from "@/components/spaces/use-deferred-space-tabs";
import { formatFaDigits, type SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";

type SpaceHeroExpenseMetaProps = {
  memberCount: number;
  expenseCount: number;
  totalExpenses: number;
  currency: SpaceCurrency;
};

/** Trip/partner subtitle — updates instantly on add/edit/delete. */
export function SpaceHeroExpenseMeta({
  memberCount,
  expenseCount,
  totalExpenses,
  currency,
}: SpaceHeroExpenseMetaProps) {
  const [ledger, setLedger] = useState({
    count: expenseCount,
    total: totalExpenses,
  });

  useEffect(() => {
    setLedger({ count: expenseCount, total: totalExpenses });
  }, [expenseCount, totalExpenses]);

  useEffect(() => {
    function onMutated(event: Event) {
      const delta = (event as CustomEvent<ExpenseLedgerDelta | undefined>)
        .detail;
      setLedger((prev) => {
        const next = applyExpenseLedgerDelta(prev.count, prev.total, delta);
        return { count: next.count, total: next.total };
      });
    }
    window.addEventListener("superhesab:expenses-mutated", onMutated);
    return () =>
      window.removeEventListener("superhesab:expenses-mutated", onMutated);
  }, []);

  return (
    <>
      {formatFaDigits(memberCount)} عضو · {formatFaDigits(ledger.count)} هزینه
      {ledger.total > 0 ? (
        <> · جمع {formatCurrency(ledger.total, currency)}</>
      ) : null}
    </>
  );
}
