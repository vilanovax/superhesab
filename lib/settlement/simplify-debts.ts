/**
 * @deprecated Prefer `lib/debtSimplification.ts` (`Record<string, number>` API).
 */
import {
  simplifyDebts as simplifyDebtsRecord,
  type SimplifiedSettlement,
} from "@/lib/debtSimplification";
import type { NetBalance, SuggestedSettlement } from "@/types";

export function simplifyDebts(balances: NetBalance[]): SuggestedSettlement[] {
  const record: Record<string, number> = {};
  for (const row of balances) {
    record[row.userId] = row.amount;
  }
  return simplifyDebtsRecord(record) as SimplifiedSettlement[];
}
