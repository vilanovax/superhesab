"use client";

import dynamic from "next/dynamic";
import type { SpaceTabId } from "@/lib/spaces/space-tab-data";
import { ExpenseList } from "@/components/expenses/expense-list";
import { BuildingReportPeriodFilter } from "@/components/spaces/building-report-period-filter";
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

/** BUILDING — charge calendar / units / common-cost report. */
export function BuildingSpaceTabs({
  spaceId,
  spaceName,
  currentUserId,
  currentUserRole,
  expenses,
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

  const { tab, deferred, tabBusy, onTabChange } = useDeferredSpaceTabs({
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
    },
  });

  return (
    <Tabs
      value={tab}
      defaultValue={defaultTab}
      onValueChange={onTabChange}
      className="flex min-h-0 flex-1 flex-col"
    >
      <TabsList className="grid h-11 w-full grid-cols-4 rounded-2xl bg-muted/70 p-1">
        <TabsTrigger value="expenses" className="rounded-xl">
          هزینه
        </TabsTrigger>
        <TabsTrigger value="charges" className="rounded-xl">
          شارژ
        </TabsTrigger>
        <TabsTrigger value="units" className="rounded-xl">
          واحد
        </TabsTrigger>
        <TabsTrigger value="report" className="rounded-xl">
          گزارش
        </TabsTrigger>
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
          currency={currency}
          spaceType={spaceType}
          canMutate={canMutate}
        />
      </TabsContent>
      <TabsContent value="charges" className="mt-3">
        {tabBusy && tab === "charges" ? (
          <SpacePanelFallback rows={5} />
        ) : buildingDashboard ? (
          <BuildingChargesPanel
            spaceId={spaceId}
            settingsHref={`/spaces/${spaceId}/settings`}
            unitsHref={`/spaces/${spaceId}?tab=units`}
            dashboard={buildingDashboard}
            calendar={buildingCalendar}
            currency={currency}
            canMutate={canMutate}
            isOwner={isOwner}
            chargeProofs={deferred.chargeProofs}
            buildingUnits={buildingUnits}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-body-sm text-muted-foreground">
            بارگذاری داشبورد شارژ ممکن نیست.
          </div>
        )}
      </TabsContent>
      <TabsContent value="units" className="mt-3">
        <BuildingUnitsPanel
          spaceId={spaceId}
          currency={currency}
          units={buildingUnits}
          baseCharge={buildingDashboard?.plan?.baseCharge ?? 0}
          canManage={isOwner}
        />
      </TabsContent>
      <TabsContent value="report" className="mt-3">
        {tabBusy && tab === "report" ? (
          <SpacePanelFallback rows={4} />
        ) : (
          <>
            <ReportExportButtons
              spaceId={spaceId}
              query={
                reportPlanYear != null
                  ? reportMonth != null
                    ? `year=${reportPlanYear}&month=${reportMonth}`
                    : `year=${reportPlanYear}`
                  : ""
              }
            />
            {reportPlanYear != null ? (
              <BuildingReportPeriodFilter
                spaceId={spaceId}
                year={reportPlanYear}
                month={reportMonth}
              />
            ) : null}
            <PersonalReportChart
              data={deferred.personalReportData}
              expenseLines={deferred.reportExpenseLines}
              currency={currency}
              categoryBudgets={deferred.categoryBudgets}
              periodLabel={reportPeriodLabel}
              emptyTitle={reportEmptyTitle}
              emptyHint={reportEmptyHint}
              totalCenterLabel={reportTotalLabel}
            />
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
