"use client";

import { useEffect } from "react";
import type { SpaceTabId } from "@/lib/spaces/space-tab-data";
import { ExpenseList } from "@/components/expenses/expense-list";
import { SpaceBalances } from "@/components/SpaceBalances";
import { SpacePanelFallback } from "@/components/spaces/space-panel-fallback";
import type { SpaceTabsProps } from "@/components/spaces/space-tabs-types";
import { useDeferredSpaceTabs } from "@/components/spaces/use-deferred-space-tabs";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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
  currency = "TOMAN",
  roundUpToThousand = false,
  spaceType = "TRIP",
  canMutate = true,
  initialTab,
  loadedTabs,
  tabLoadContext,
}: SpaceTabsProps) {
  const defaultTab: SpaceTabId =
    initialTab === "balances" ? "balances" : "expenses";

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
      personalReportData: [],
      reportExpenseLines: [],
      debts: [],
      savingsPots: [],
      internalLoans: [],
      chargeProofs: [],
      categoryBudgets: {},
      expenses: defaultTab === "expenses" ? expenses : [],
      expensesHasMore: defaultTab === "expenses" ? expensesHasMore : false,
      buildingDashboard: null,
      buildingCalendar: null,
      buildingUnits: [],
    },
  });

  /** Warm deferred tabs after first paint so switches feel instant. */
  useEffect(() => {
    if (defaultTab === "expenses") return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      prefetchTab("expenses");
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
  }, [defaultTab, prefetchTab]);

  const isPartner = spaceType === "PARTNER";

  const ssrOwnsExpenses =
    defaultTab === "expenses" || Boolean(loadedTabs?.includes("expenses"));
  const liveExpenses = ssrOwnsExpenses ? expenses : deferred.expenses;
  const liveExpensesHasMore = ssrOwnsExpenses
    ? expensesHasMore
    : deferred.expensesHasMore;
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
        className="grid w-full grid-cols-2"
      >
        <TabsTrigger
          value="expenses"
          onPointerEnter={() => prefetchTab("expenses")}
          onFocus={() => prefetchTab("expenses")}
        >
          هزینه‌ها
        </TabsTrigger>
        <TabsTrigger
          value="balances"
          onPointerEnter={() => prefetchTab("balances")}
          onFocus={() => prefetchTab("balances")}
        >
          تراز
        </TabsTrigger>
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
            showExport
          />
        )}
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
    </Tabs>
  );
}
