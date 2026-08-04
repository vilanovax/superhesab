"use client";

import dynamic from "next/dynamic";
import type { InternalLoanDTO } from "@/app/actions/internalLoan";
import type { SavingsPotDTO } from "@/app/actions/savingsPot";
import type { FundMemberOption } from "@/components/spaces/savings-pot-panel";
import { SpacePanelFallback } from "@/components/spaces/space-panel-fallback";
import type { SpaceCurrency } from "@/lib/format";

const SavingsPotPanel = dynamic(
  () =>
    import("@/components/spaces/savings-pot-panel").then(
      (m) => m.SavingsPotPanel,
    ),
  { loading: () => <SpacePanelFallback rows={3} /> },
);

const InternalLoanPanel = dynamic(
  () =>
    import("@/components/spaces/internal-loan-panel").then(
      (m) => m.InternalLoanPanel,
    ),
  { loading: () => <SpacePanelFallback rows={3} /> },
);

type FamilySavingsLoanPanelProps = {
  spaceId: string;
  pots: SavingsPotDTO[];
  loans: InternalLoanDTO[];
  members: FundMemberOption[];
  currentMemberId: string | null;
  currency: SpaceCurrency;
  canMutate: boolean;
  showSavings: boolean;
  showLoans: boolean;
};

export function FamilySavingsLoanPanel({
  spaceId,
  pots,
  loans,
  members,
  currentMemberId,
  currency,
  canMutate,
  showSavings,
  showLoans,
}: FamilySavingsLoanPanelProps) {
  return (
    <div className="animate-fade-up space-y-6">
      {showSavings ? (
        <SavingsPotPanel
          spaceId={spaceId}
          pots={pots}
          members={members}
          currentMemberId={currentMemberId}
          currency={currency}
          canMutate={canMutate}
        />
      ) : null}
      {showSavings && showLoans ? (
        <div className="h-px bg-border/50" />
      ) : null}
      {showLoans ? (
        <InternalLoanPanel
          spaceId={spaceId}
          loans={loans}
          members={members}
          currentMemberId={currentMemberId}
          currency={currency}
          canMutate={canMutate}
        />
      ) : null}
    </div>
  );
}
