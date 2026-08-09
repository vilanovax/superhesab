"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
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
  const familyReportMembers = members.map((m) => ({
    userId: m.userId,
    name:
      m.userId === currentUserId
        ? "من"
        : m.name?.trim().split(/\s+/)[0] || m.phone || "عضو",
  }));

  const defaultTab: SpaceTabId =
    initialTab === "report" ||
    initialTab === "expenses" ||
    initialTab === "debts" ||
    initialTab === "funds"
      ? initialTab
      : "expenses";

  const {
    tab,
    deferred,
    loaded,
    tabBusy,
    onTabChange,
    prefetchTab,
  } = useDeferredSpaceTabs({
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
      expenses: defaultTab === "expenses" ? expenses : [],
      expensesHasMore: defaultTab === "expenses" ? expensesHasMore : false,
      buildingDashboard: null,
      buildingCalendar: null,
      buildingUnits: [],
    },
  });

  /** Warm deferred tabs after expenses first paint so switches feel instant. */
  useEffect(() => {
    const tabsToWarm: SpaceTabId[] = [];
    if (defaultTab !== "expenses") tabsToWarm.push("expenses");
    if (defaultTab !== "report") tabsToWarm.push("report");
    if (showDebts && defaultTab !== "debts") tabsToWarm.push("debts");
    if (showFamilyFunds && defaultTab !== "funds") tabsToWarm.push("funds");
    if (tabsToWarm.length === 0) return;

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      for (const t of tabsToWarm) prefetchTab(t);
    };
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(run, { timeout: 1200 });
    } else {
      timeoutId = setTimeout(run, 350);
    }
    return () => {
      cancelled = true;
      if (idleId != null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [defaultTab, prefetchTab, showDebts, showFamilyFunds]);

  const extraTabs = (showDebts ? 1 : 0) + (showFamilyFunds ? 1 : 0);
  const tabCount = 2 + extraTabs;

  const liveExpenses = loaded.has("expenses") ? deferred.expenses : expenses;
  const liveExpensesHasMore = loaded.has("expenses")
    ? deferred.expensesHasMore
    : expensesHasMore;
  /** Skeleton only while a real switch is in flight — idle prefetch stays silent. */
  const expensesWaiting =
    tab === "expenses" && !loaded.has("expenses") && tabBusy;

  return (
    <Tabs
      value={tab}
      defaultValue={defaultTab}
      onValueChange={onTabChange}
      className="flex min-h-0 flex-1 flex-col"
    >
      <TabsList
        aria-label="زبانه‌های دفتر"
        className={cn(
          "grid w-full",
          tabCount >= 4
            ? "grid-cols-4"
            : tabCount === 3
              ? "grid-cols-3"
              : "grid-cols-2",
        )}
      >
        <TabsTrigger
          value="expenses"
          onPointerEnter={() => prefetchTab("expenses")}
          onFocus={() => prefetchTab("expenses")}
        >
          تراکنش‌ها
        </TabsTrigger>
        <TabsTrigger
          value="report"
          onPointerEnter={() => prefetchTab("report")}
          onFocus={() => prefetchTab("report")}
        >
          گزارش
        </TabsTrigger>
        {showDebts ? (
          <TabsTrigger
            value="debts"
            onPointerEnter={() => prefetchTab("debts")}
            onFocus={() => prefetchTab("debts")}
          >
            بدهی / طلب
          </TabsTrigger>
        ) : null}
        {showFamilyFunds ? (
          <TabsTrigger
            value="funds"
            onPointerEnter={() => prefetchTab("funds")}
            onFocus={() => prefetchTab("funds")}
          >
            صندوق و وام
          </TabsTrigger>
        ) : null}
      </TabsList>
      <TabsContent value="expenses" className="mt-3">
        {expensesWaiting ? (
          <SpacePanelFallback rows={4} />
        ) : (
          <ExpenseList
            spaceId={spaceId}
            spaceName={spaceName}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            members={members}
            inviteMembers={inviteMembers}
            expenses={liveExpenses}
            expensesHasMore={liveExpensesHasMore}
            currency={currency}
            spaceType={spaceType}
            canMutate={canMutate}
          />
        )}
      </TabsContent>
      <TabsContent value="report" className="mt-3">
        {tabBusy && tab === "report" ? (
          <SpacePanelFallback rows={4} />
        ) : (
          <>
            <ReportExportButtons spaceId={spaceId} variant="row" />
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
