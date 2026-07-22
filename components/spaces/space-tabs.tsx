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
  expenses: ExpenseListItem[];
  members: BalanceMember[];
  balances: Record<string, number>;
  suggestions: SimplifiedSettlement[];
  checklist: ChecklistItemDTO[];
};

export function SpaceTabs({
  spaceId,
  expenses,
  members,
  balances,
  suggestions,
  checklist,
}: SpaceTabsProps) {
  return (
    <Tabs defaultValue="expenses" className="flex min-h-0 flex-1 flex-col">
      <TabsList className="grid h-10 w-full grid-cols-3">
        <TabsTrigger value="expenses">هزینه‌ها</TabsTrigger>
        <TabsTrigger value="balances">ترازها</TabsTrigger>
        <TabsTrigger value="checklist">چک‌لیست</TabsTrigger>
      </TabsList>
      <TabsContent value="expenses" className="mt-3">
        <ExpenseList expenses={expenses} />
      </TabsContent>
      <TabsContent value="balances" className="mt-3">
        <SpaceBalances
          spaceId={spaceId}
          members={members}
          balances={balances}
          suggestions={suggestions}
        />
      </TabsContent>
      <TabsContent value="checklist" className="mt-3">
        <SpaceChecklist spaceId={spaceId} items={checklist} />
      </TabsContent>
    </Tabs>
  );
}
