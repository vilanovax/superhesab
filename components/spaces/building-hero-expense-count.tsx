"use client";

import { useEffect, useState } from "react";
import {
  applyExpenseLedgerDelta,
  type ExpenseLedgerDelta,
} from "@/components/spaces/use-deferred-space-tabs";
import { formatFaDigits } from "@/lib/format";

/** Building hero « · N هزینه» — updates instantly on add/delete. */
export function BuildingHeroExpenseCount({
  expenseCount,
}: {
  expenseCount: number;
}) {
  const [count, setCount] = useState(expenseCount);
  const [serverCount, setServerCount] = useState(expenseCount);
  if (serverCount !== expenseCount) {
    setServerCount(expenseCount);
    setCount(expenseCount);
  }

  useEffect(() => {
    function onMutated(event: Event) {
      const delta = (event as CustomEvent<ExpenseLedgerDelta | undefined>)
        .detail;
      setCount((prev) => applyExpenseLedgerDelta(prev, 0, delta).count);
    }
    window.addEventListener("superhesab:expenses-mutated", onMutated);
    return () =>
      window.removeEventListener("superhesab:expenses-mutated", onMutated);
  }, []);

  if (count <= 0) return null;
  return <> · {formatFaDigits(count)} هزینه</>;
}
