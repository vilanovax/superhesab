"use client";

import dynamic from "next/dynamic";
import type { SpaceTabId } from "@/lib/spaces/space-tab-data";
import { SpaceBalances } from "@/components/SpaceBalances";
import { SpaceChecklist } from "@/components/SpaceChecklist";
import { ReportExportButtons } from "@/components/spaces/report-export-buttons";
import { SpacePanelFallback } from "@/components/spaces/space-panel-fallback";
import type { SpaceTabsProps } from "@/components/spaces/space-tabs-types";
import { useDeferredSpaceTabs } from "@/components/spaces/use-deferred-space-tabs";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const ExpenseList = dynamic(
  () =>
    import("@/components/expenses/expense-list").then((m) => m.ExpenseList),
  { loading: () => <SpacePanelFallback rows={4} /> },
);

/** TRIP / PARTNER — settlements tabs only (no BUILDING / FAMILY panel graph). */
export function TripSpaceTabs({
  spaceId,
  spaceName,
  currentUserId,
  currentUserRole,
  expenses,
  expensesHasMore = false,
  members,
  inviteMembers,
  balances,
  suggestions,
  checklist: checklistProp,
  currency = "TOMAN",
  roundUpToThousand = false,
  spaceType = "TRIP",
  showChecklist = true,
  canMutate = true,
  initialTab,
  loadedTabs,
  tabLoadContext,
}: SpaceTabsProps) {
  const defaultTab: SpaceTabId =
    initialTab === "balances" ||
    (initialTab === "checklist" && showChecklist)
      ? (initialTab as SpaceTabId)
      : "expenses";

  const { tab, deferred, tabBusy, onTabChange } = useDeferredSpaceTabs({
    spaceId,
    defaultTab,
    loadedTabs,
    tabLoadContext,
    initial: {
      personalReportData: [],
      reportExpenseLines: [],
      debts: [],
      savingsPots: [],
      internalLoans: [],
      checklist: checklistProp,
      chargeProofs: [],
      categoryBudgets: {},
      expenses,
      expensesHasMore,
      buildingDashboard: null,
      buildingCalendar: null,
      buildingUnits: [],
    },
  });

  const tabCount = showChecklist ? 3 : 2;
  const isPartner = spaceType === "PARTNER";
  const showExport = tab === "expenses" || tab === "balances";

  return (
    <Tabs
      value={tab}
      defaultValue={defaultTab}
      onValueChange={onTabChange}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex items-center gap-2">
        <TabsList
          className={cn(
            "grid h-10 min-w-0 flex-1",
            tabCount === 3 ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          <TabsTrigger value="expenses">هزینه‌ها</TabsTrigger>
          <TabsTrigger value="balances">تراز</TabsTrigger>
          {showChecklist ? (
            <TabsTrigger value="checklist">چک‌لیست</TabsTrigger>
          ) : null}
        </TabsList>
        {showExport ? <ReportExportButtons spaceId={spaceId} /> : null}
      </div>

      <TabsContent value="expenses" className="mt-3">
        <ExpenseList
          spaceId={spaceId}
          spaceName={spaceName}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          members={members}
          inviteMembers={inviteMembers}
          expenses={expenses}
          expensesHasMore={expensesHasMore}
          currency={currency}
          spaceType={spaceType}
          canMutate={canMutate}
        />
      </TabsContent>
      <TabsContent value="balances" className="mt-3">
        <SpaceBalances
          spaceId={spaceId}
          currentUserId={currentUserId}
          members={members}
          balances={balances}
          suggestions={suggestions}
          currency={currency}
          roundUpToThousand={roundUpToThousand}
          variant={isPartner ? "partner" : "default"}
          canMutate={canMutate}
        />
      </TabsContent>
      {showChecklist ? (
        <TabsContent value="checklist" className="mt-3">
          {tabBusy && tab === "checklist" ? (
            <SpacePanelFallback rows={3} />
          ) : (
            <SpaceChecklist
              spaceId={spaceId}
              items={deferred.checklist}
              canMutate={canMutate}
            />
          )}
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
