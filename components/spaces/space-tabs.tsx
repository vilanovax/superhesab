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
}: SpaceTabsProps) {
  return (
    <Tabs defaultValue="expenses" className="flex min-h-0 flex-1 flex-col">
      <TabsList className="grid h-10 w-full grid-cols-3">
        <TabsTrigger value="expenses">هزینه‌ها</TabsTrigger>
        <TabsTrigger value="balances">ترازها</TabsTrigger>
        <TabsTrigger value="checklist">چک‌لیست</TabsTrigger>
      </TabsList>
      <TabsContent value="expenses" className="mt-3">
        <ExpenseList
          spaceId={spaceId}
          currentUserId={currentUserId}
          members={members}
          expenses={expenses}
          currency={currency}
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
        />
      </TabsContent>
      <TabsContent value="checklist" className="mt-3">
        <SpaceChecklist spaceId={spaceId} items={checklist} />
      </TabsContent>
    </Tabs>
  );
}
