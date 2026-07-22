"use client";

import type { ChecklistItemDTO } from "@/app/actions/checklist";
import { ExpenseList, type ExpenseListItem } from "@/components/expenses/expense-list";
import { SpaceBalances, type BalanceMember } from "@/components/SpaceBalances";
import { SpaceChecklist } from "@/components/SpaceChecklist";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { SimplifiedSettlement } from "@/lib/debtSimplification";
import type { SpaceType } from "@/types";
import { cn } from "@/lib/utils";

type SpaceTabsProps = {
  spaceId: string;
  currentUserId: string;
  expenses: ExpenseListItem[];
  members: BalanceMember[];
  balances: Record<string, number>;
  suggestions: SimplifiedSettlement[];
  checklist: ChecklistItemDTO[];
  currency?: "TOMAN" | "RIAL";
  roundUpToThousand?: boolean;
  spaceType?: SpaceType;
  showChecklist?: boolean;
};

export function SpaceTabs({
  spaceId,
  currentUserId,
  expenses,
  members,
  balances,
  suggestions,
  checklist,
  currency = "TOMAN",
  roundUpToThousand = false,
  spaceType = "TRIP",
  showChecklist = true,
}: SpaceTabsProps) {
  const isPartner = spaceType === "PARTNER";
  const tabCount = showChecklist ? 3 : 2;

  return (
    <Tabs defaultValue="expenses" className="flex min-h-0 flex-1 flex-col">
      <TabsList
        className={cn(
          "grid h-10 w-full",
          tabCount === 3 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        <TabsTrigger value="expenses">هزینه‌ها</TabsTrigger>
        <TabsTrigger value="balances">تراز</TabsTrigger>
        {showChecklist ? (
          <TabsTrigger value="checklist">چک‌لیست</TabsTrigger>
        ) : null}
      </TabsList>
      <TabsContent value="expenses" className="mt-3">
        <ExpenseList
          spaceId={spaceId}
          currentUserId={currentUserId}
          members={members}
          expenses={expenses}
          currency={currency}
          spaceType={spaceType}
        />
      </TabsContent>
      <TabsContent value="balances" className="mt-3">
        <SpaceBalances
          spaceId={spaceId}
          currentUserId={currentUserId}
          members={members}
          balances={balances}
          suggestions={suggestions}
          roundUpToThousand={roundUpToThousand}
          variant={isPartner ? "partner" : "default"}
        />
      </TabsContent>
      {showChecklist ? (
        <TabsContent value="checklist" className="mt-3">
          <SpaceChecklist spaceId={spaceId} items={checklist} />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
