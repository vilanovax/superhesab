"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import type { SpaceTabId } from "@/lib/spaces/space-tab-data";
import { ExpenseList } from "@/components/expenses/expense-list";
import { BuildingExpenseYearFilter } from "@/components/spaces/building-expense-year-filter";
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

const PersonalReportChart = dynamic(
  () =>
    import("@/components/PersonalReportChart").then(
      (m) => m.PersonalReportChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 animate-pulse rounded-2xl bg-muted/40" />
    ),
  },
);

const BuildingChargesPanel = dynamic(
  () =>
    import("@/components/spaces/building-charges-panel").then(
      (m) => m.BuildingChargesPanel,
    ),
  { loading: () => <SpacePanelFallback rows={5} /> },
);

const BuildingUnitsPanel = dynamic(
  () =>
    import("@/components/spaces/building-units-panel").then(
      (m) => m.BuildingUnitsPanel,
    ),
  { loading: () => <SpacePanelFallback rows={3} /> },
);

const BuildingBillsBreakdown = dynamic(
  () =>
    import("@/components/spaces/building-bills-breakdown").then(
      (m) => m.BuildingBillsBreakdown,
    ),
  { loading: () => <SpacePanelFallback rows={2} /> },
);

const BuildingReportInsights = dynamic(
  () =>
    import("@/components/spaces/building-report-insights").then(
      (m) => m.BuildingReportInsights,
    ),
  { loading: () => <SpacePanelFallback rows={2} /> },
);

const BuildingReportPeriodFilter = dynamic(
  () =>
    import("@/components/spaces/building-report-period-filter").then(
      (m) => m.BuildingReportPeriodFilter,
    ),
  { loading: () => <div className="h-11 animate-pulse rounded-xl bg-muted/40" /> },
);

/** BUILDING — charge calendar / units / common-cost report. */
export function BuildingSpaceTabs({
  spaceId,
  spaceName,
  currentUserId,
  currentUserRole,
  expenses,
  expensesHasMore = false,
  members,
  inviteMembers,
  currency = "TOMAN",
  spaceType = "BUILDING",
  canMutate = true,
  personalReportData: reportProp = [],
  reportExpenseLines: reportLinesProp = [],
  categoryBudgets: budgetsProp,
  buildingDashboard = null,
  buildingCalendar = null,
  buildingUnits = [],
  chargeProofs: proofsProp = [],
  isOwner = false,
  reportPeriodLabel,
  reportEmptyTitle,
  reportEmptyHint,
  reportTotalLabel,
  reportPlanYear,
  reportMonth = null,
  initialTab,
  loadedTabs,
  tabLoadContext,
}: SpaceTabsProps) {
  const defaultTab: SpaceTabId =
    initialTab === "report" ||
    initialTab === "charges" ||
    initialTab === "units" ||
    initialTab === "expenses"
      ? initialTab
      : "charges";

  const {
    tab,
    deferred,
    loaded,
    tabBusy,
    onTabChange,
    prefetchTab,
    hydrateChargeProofs,
  } = useDeferredSpaceTabs({
    spaceId,
    defaultTab,
    loadedTabs,
    reportPlanYear,
    reportMonth,
    tabLoadContext,
    initial: {
      personalReportData: reportProp,
      reportExpenseLines: reportLinesProp,
      debts: [],
      savingsPots: [],
      internalLoans: [],
      checklist: [],
      chargeProofs: proofsProp,
      categoryBudgets: budgetsProp ?? {},
      expenses: defaultTab === "expenses" ? expenses : [],
      expensesHasMore: defaultTab === "expenses" ? expensesHasMore : false,
      buildingDashboard,
      buildingCalendar,
      buildingUnits,
    },
  });

  /** Warm expenses ledger after charges first paint so تب هزینه feels instant. */
  useEffect(() => {
    if (defaultTab === "expenses") return;
    let cancelled = false;
    const run = () => {
      if (!cancelled) prefetchTab("expenses");
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

  /** Proofs stay off the RSC critical path — hydrate after first paint. */
  useEffect(() => {
    if (!canMutate) return;
    if (tab !== "charges" && defaultTab !== "charges") return;
    if (deferred.chargeProofs.length > 0 || proofsProp.length > 0) return;
    void hydrateChargeProofs();
  }, [
    canMutate,
    defaultTab,
    deferred.chargeProofs.length,
    hydrateChargeProofs,
    proofsProp.length,
    tab,
  ]);

  const liveExpenses = loaded.has("expenses") ? deferred.expenses : expenses;
  const liveExpensesHasMore = loaded.has("expenses")
    ? deferred.expensesHasMore
    : expensesHasMore;
  /** Skeleton only while a real switch is in flight — idle prefetch stays silent. */
  const expensesWaiting =
    tab === "expenses" && !loaded.has("expenses") && tabBusy;
  const liveDashboard =
    deferred.buildingDashboard ?? buildingDashboard;
  const liveCalendar = deferred.buildingCalendar ?? buildingCalendar;
  const liveUnits =
    deferred.buildingUnits.length > 0
      ? deferred.buildingUnits
      : buildingUnits;

  return (
    <Tabs
      value={tab}
      defaultValue={defaultTab}
      onValueChange={onTabChange}
      className="flex min-h-0 flex-1 flex-col"
    >
      <TabsList
        aria-label="زبانه‌های دفتر"
        className="grid h-11 w-full grid-cols-4 rounded-2xl bg-muted/70 p-1"
      >
        <TabsTrigger
          value="expenses"
          className="rounded-xl"
          onPointerEnter={() => prefetchTab("expenses")}
          onFocus={() => prefetchTab("expenses")}
        >
          هزینه
        </TabsTrigger>
        <TabsTrigger
          value="charges"
          className="rounded-xl"
          onPointerEnter={() => prefetchTab("charges")}
          onFocus={() => prefetchTab("charges")}
        >
          شارژ
        </TabsTrigger>
        <TabsTrigger
          value="units"
          className="rounded-xl"
          onPointerEnter={() => prefetchTab("units")}
          onFocus={() => prefetchTab("units")}
        >
          واحد
        </TabsTrigger>
        <TabsTrigger
          value="report"
          className="rounded-xl"
          onPointerEnter={() => prefetchTab("report")}
          onFocus={() => prefetchTab("report")}
        >
          گزارش
        </TabsTrigger>
      </TabsList>
      <TabsContent value="expenses" className="mt-3">
        {reportPlanYear != null ? (
          <BuildingExpenseYearFilter
            spaceId={spaceId}
            year={reportPlanYear}
          />
        ) : null}
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
            expenseYear={reportPlanYear}
          />
        )}
      </TabsContent>
      <TabsContent value="charges" className="mt-3">
        {tabBusy && tab === "charges" ? (
          <SpacePanelFallback rows={5} />
        ) : liveDashboard ? (
          <BuildingChargesPanel
            spaceId={spaceId}
            settingsHref={`/spaces/${spaceId}/settings`}
            unitsHref={`/spaces/${spaceId}?tab=units`}
            dashboard={liveDashboard}
            calendar={liveCalendar}
            currency={currency}
            canMutate={canMutate}
            isOwner={isOwner}
            chargeProofs={deferred.chargeProofs}
            buildingUnits={liveUnits}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-body-sm text-muted-foreground">
            بارگذاری داشبورد شارژ ممکن نیست.
          </div>
        )}
      </TabsContent>
      <TabsContent value="units" className="mt-3">
        {tabBusy && tab === "units" ? (
          <SpacePanelFallback rows={3} />
        ) : (
          <BuildingUnitsPanel
            spaceId={spaceId}
            currency={currency}
            units={liveUnits}
            baseCharge={liveDashboard?.plan?.baseCharge ?? 0}
            canManage={isOwner}
          />
        )}
      </TabsContent>
      <TabsContent value="report" className="mt-3">
        {tabBusy && tab === "report" ? (
          <SpacePanelFallback rows={4} />
        ) : (
          <>
            <div className="mb-2.5 flex items-start gap-2">
              {reportPlanYear != null ? (
                <div className="min-w-0 flex-1">
                  <BuildingReportPeriodFilter
                    spaceId={spaceId}
                    year={reportPlanYear}
                    month={reportMonth}
                  />
                </div>
              ) : (
                <div className="min-w-0 flex-1" />
              )}
              <ReportExportButtons
                spaceId={spaceId}
                variant="compact"
                className="mt-5 shrink-0"
                query={
                  reportPlanYear != null
                    ? reportMonth != null
                      ? `year=${reportPlanYear}&month=${reportMonth}`
                      : `year=${reportPlanYear}`
                    : ""
                }
              />
            </div>
            <div className="space-y-2.5 pb-16">
              <BuildingReportInsights
                section="summary"
                categoryRows={deferred.personalReportData}
                expenseLines={deferred.reportExpenseLines}
                currency={currency}
                periodLabel={reportPeriodLabel}
              />
              <BuildingBillsBreakdown
                expenseLines={deferred.reportExpenseLines}
                currency={currency}
              />
              <PersonalReportChart
                data={deferred.personalReportData}
                expenseLines={deferred.reportExpenseLines}
                currency={currency}
                categoryBudgets={deferred.categoryBudgets}
                periodLabel={reportPeriodLabel}
                emptyTitle={reportEmptyTitle}
                emptyHint={reportEmptyHint}
                totalCenterLabel={reportTotalLabel}
                dense
              />
              <BuildingReportInsights
                section="rankings"
                categoryRows={deferred.personalReportData}
                expenseLines={deferred.reportExpenseLines}
                currency={currency}
                periodLabel={reportPeriodLabel}
              />
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
