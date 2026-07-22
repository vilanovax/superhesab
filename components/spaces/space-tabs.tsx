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
    <Tabs defaultValue="expenses">
      <TabsList className="grid h-12 grid-cols-3">
        <TabsTrigger value="expenses">هزینه‌ها</TabsTrigger>
        <TabsTrigger value="balances">ترازها</TabsTrigger>
        <TabsTrigger value="checklist">چک‌لیست</TabsTrigger>
      </TabsList>
      <TabsContent value="expenses">
        <ExpenseList expenses={expenses} />
      </TabsContent>
      <TabsContent value="balances">
        <SpaceBalances
          spaceId={spaceId}
          members={members}
          balances={balances}
          suggestions={suggestions}
        />
      </TabsContent>
      <TabsContent value="checklist">
        <SpaceChecklist spaceId={spaceId} items={checklist} />
      </TabsContent>
    </Tabs>
  );
}
