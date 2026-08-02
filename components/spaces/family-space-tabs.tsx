"use client";

import dynamic from "next/dynamic";
import type { SpaceTabId } from "@/lib/spaces/space-tab-data";
import { ExpenseList } from "@/components/expenses/expense-list";
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
import { getTemplate } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";

const FamilyReportPanel = dynamic(
  () =>
    import("@/components/spaces/family-report-panel").then(
      (m) => m.FamilyReportPanel,
    ),
  { loading: () => <SpacePanelFallback rows={4} /> },
);

const DebtPanel = dynamic(
  () =>
    import("@/components/spaces/debt-panel").then((m) => m.DebtPanel),
  { loading: () => <SpacePanelFallback rows={3} /> },
);

const FamilySavingsLoanPanel = dynamic(
  () =>
    import("@/components/spaces/family-savings-loan-panel").then(
      (m) => m.FamilySavingsLoanPanel,
    ),
  { loading: () => <SpacePanelFallback rows={4} /> },
);

/** FAMILY / خانه — ledger + debts + savings/loans (no BUILDING panels). */
export function FamilySpaceTabs({
  spaceId,
  spaceName,
  currentUserId,
  currentUserRole,
  expenses,
  expensesHasMore = false,
  members,
  inviteMembers,
  currency = "TOMAN",
  spaceType = "FAMILY",
  canMutate = true,
  personalReportData: reportProp = [],
  reportExpenseLines: reportLinesProp = [],
  familyMonthExpenses = [],
  familyReportMembers = [],
  monthlyBudget = null,
  debts: debtsProp = [],
  savingsPots: potsProp = [],
  internalLoans: loansProp = [],
  fundMembers = [],
  currentFundMemberId = null,
  categoryBudgets: budgetsProp,
  initialTab,
  loadedTabs,
  tabLoadContext,
}: SpaceTabsProps) {
  const features = getTemplate(spaceType).features;
  const showDebts = features.debts;
  const showFamilyFunds = Boolean(
    features.savingsPot || features.internalLoans,
  );

  const defaultTab: SpaceTabId =
    initialTab === "report" ||
    initialTab === "expenses" ||
    initialTab === "debts" ||
    initialTab === "funds"
      ? initialTab
      : "expenses";

  const { tab, deferred, tabBusy, onTabChange } = useDeferredSpaceTabs({
    spaceId,
    defaultTab,
    loadedTabs,
    tabLoadContext,
    initial: {
      personalReportData: reportProp,
      reportExpenseLines: reportLinesProp,
      debts: debtsProp,
      savingsPots: potsProp,
      internalLoans: loansProp,
      checklist: [],
      chargeProofs: [],
      categoryBudgets: budgetsProp ?? {},
    },
  });

  const extraTabs = (showDebts ? 1 : 0) + (showFamilyFunds ? 1 : 0);
  const tabCount = 2 + extraTabs;

  return (
    <Tabs
      value={tab}
      defaultValue={defaultTab}
      onValueChange={onTabChange}
      className="flex min-h-0 flex-1 flex-col"
    >
      <TabsList
        className={cn(
          "grid h-11 w-full rounded-2xl bg-muted/70 p-1",
          tabCount >= 4
            ? "grid-cols-4"
            : tabCount === 3
              ? "grid-cols-3"
              : "grid-cols-2",
        )}
      >
        <TabsTrigger value="expenses" className="rounded-xl">
          تراکنش‌ها
        </TabsTrigger>
        <TabsTrigger value="report" className="rounded-xl">
          گزارش
        </TabsTrigger>
        {showDebts ? (
          <TabsTrigger value="debts" className="rounded-xl">
            بدهی / طلب
          </TabsTrigger>
        ) : null}
        {showFamilyFunds ? (
          <TabsTrigger value="funds" className="rounded-xl">
            صندوق و وام
          </TabsTrigger>
        ) : null}
      </TabsList>
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
      <TabsContent value="report" className="mt-3">
        {tabBusy && tab === "report" ? (
          <SpacePanelFallback rows={4} />
        ) : (
          <>
            <ReportExportButtons spaceId={spaceId} />
            <FamilyReportPanel
              currentUserId={currentUserId}
              members={familyReportMembers}
              monthExpenses={familyMonthExpenses}
              monthlyBudget={monthlyBudget}
              currency={currency}
              initialReport={deferred.personalReportData}
              categoryBudgets={deferred.categoryBudgets}
            />
          </>
        )}
      </TabsContent>
      {showDebts ? (
        <TabsContent value="debts" className="mt-3">
          {tabBusy && tab === "debts" ? (
            <SpacePanelFallback rows={3} />
          ) : (
            <DebtPanel
              spaceId={spaceId}
              debts={deferred.debts}
              currency={currency}
              canMutate={canMutate}
              sharedHousehold
            />
          )}
        </TabsContent>
      ) : null}
      {showFamilyFunds ? (
        <TabsContent value="funds" className="mt-3">
          {tabBusy && tab === "funds" ? (
            <SpacePanelFallback rows={4} />
          ) : (
            <FamilySavingsLoanPanel
              spaceId={spaceId}
              pots={deferred.savingsPots}
              loans={deferred.internalLoans}
              members={fundMembers}
              currentMemberId={currentFundMemberId}
              currency={currency}
              canMutate={canMutate}
              showSavings
              showLoans
            />
          )}
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
