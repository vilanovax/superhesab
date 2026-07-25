"use client";

import dynamic from "next/dynamic";
import type { ChecklistItemDTO } from "@/app/actions/checklist";
import { ExpenseList, type ExpenseListItem } from "@/components/expenses/expense-list";
import { SpaceBalances, type BalanceMember } from "@/components/SpaceBalances";
import { SpaceChecklist } from "@/components/SpaceChecklist";
import type { InviteMemberRow } from "@/components/spaces/invite-members-button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { SimplifiedSettlement } from "@/lib/debtSimplification";
import type { SpaceCurrency } from "@/lib/format";
import type { CategoryExpenseRow, ReportExpenseLine } from "@/lib/reports";
import {
  FamilyReportPanel,
  type FamilyMonthExpenseRow,
  type FamilyReportMember,
} from "@/components/spaces/family-report-panel";
import type { DebtDTO } from "@/app/actions/debt";
import type {
  AnnualChargeCalendarDTO,
  BuildingDashboardDTO,
  BuildingUnitRow,
} from "@/app/actions/building";
import { DebtPanel } from "@/components/spaces/debt-panel";
import { BuildingChargesPanel } from "@/components/spaces/building-charges-panel";
import { BuildingReportPeriodFilter } from "@/components/spaces/building-report-period-filter";
import { BuildingUnitsPanel } from "@/components/spaces/building-units-panel";
import type { ExpenseCategory } from "@/lib/categorizer";
import { getTemplate } from "@/lib/templates/registry";
import type { SpaceRole, SpaceType } from "@/types";
import { cn } from "@/lib/utils";

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

type SpaceTabsProps = {
  spaceId: string;
  spaceName: string;
  currentUserId: string;
  currentUserRole: SpaceRole;
  expenses: ExpenseListItem[];
  members: BalanceMember[];
  inviteMembers: InviteMemberRow[];
  balances: Record<string, number>;
  suggestions: SimplifiedSettlement[];
  checklist: ChecklistItemDTO[];
  currency?: SpaceCurrency;
  roundUpToThousand?: boolean;
  spaceType?: SpaceType;
  showChecklist?: boolean;
  /** OWNER/EDITOR can mutate; VIEWER is read-only */
  canMutate?: boolean;
  personalReportData?: CategoryExpenseRow[];
  reportExpenseLines?: ReportExpenseLine[];
  familyMonthExpenses?: FamilyMonthExpenseRow[];
  familyReportMembers?: FamilyReportMember[];
  monthlyBudget?: number | null;
  debts?: DebtDTO[];
  categoryBudgets?: Partial<Record<ExpenseCategory, number>>;
  buildingDashboard?: BuildingDashboardDTO | null;
  buildingCalendar?: AnnualChargeCalendarDTO | null;
  buildingUnits?: BuildingUnitRow[];
  isOwner?: boolean;
  /** Report chart period copy (e.g. سال ۱۴۰۵ for building). */
  reportPeriodLabel?: string;
  reportEmptyTitle?: string;
  reportEmptyHint?: string;
  reportTotalLabel?: string;
  /** Building: Jalali report period chips. */
  reportPlanYear?: number;
  reportMonth?: number | null;
  initialTab?: string;
};

export function SpaceTabs({
  spaceId,
  spaceName,
  currentUserId,
  currentUserRole,
  expenses,
  members,
  inviteMembers,
  balances,
  suggestions,
  checklist,
  currency = "TOMAN",
  roundUpToThousand = false,
  spaceType = "TRIP",
  showChecklist: showChecklistProp,
  canMutate = true,
  personalReportData = [],
  reportExpenseLines = [],
  familyMonthExpenses = [],
  familyReportMembers = [],
  monthlyBudget = null,
  debts = [],
  categoryBudgets,
  buildingDashboard = null,
  buildingCalendar = null,
  buildingUnits = [],
  isOwner = false,
  reportPeriodLabel,
  reportEmptyTitle,
  reportEmptyHint,
  reportTotalLabel,
  reportPlanYear,
  reportMonth = null,
  initialTab,
}: SpaceTabsProps) {
  const template = getTemplate(spaceType);
  const { features } = template;
  const showChecklist = showChecklistProp ?? features.checklist;
  const showSettlements = features.settlements;
  const showIncomeReport = features.incomeExpense;
  const isHousehold = features.householdLedger;
  const showDebts = features.debts;
  const showBuilding = features.buildingCharges;

  if (showIncomeReport && !showSettlements) {
    const extraTabs =
      (showDebts ? 1 : 0) + (showBuilding ? 2 : 0); // charges + units
    const tabCount = 2 + extraTabs;
    const defaultTab =
      initialTab &&
      (initialTab === "report" ||
        initialTab === "charges" ||
        initialTab === "units" ||
        initialTab === "expenses" ||
        initialTab === "debts")
        ? initialTab
        : showBuilding
          ? "charges"
          : "expenses";
    return (
      <Tabs
        key={defaultTab}
        defaultValue={defaultTab}
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
            {showBuilding ? "هزینه" : "تراکنش‌ها"}
          </TabsTrigger>
          {showBuilding ? (
            <TabsTrigger value="charges" className="rounded-xl">
              شارژ
            </TabsTrigger>
          ) : null}
          {showBuilding ? (
            <TabsTrigger value="units" className="rounded-xl">
              واحد
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="report" className="rounded-xl">
            گزارش
          </TabsTrigger>
          {showDebts ? (
            <TabsTrigger value="debts" className="rounded-xl">
              بدهی / طلب
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
            currency={currency}
            spaceType={spaceType}
            canMutate={canMutate}
          />
        </TabsContent>
        {showBuilding ? (
          <TabsContent value="charges" className="mt-3">
            {buildingDashboard ? (
              <BuildingChargesPanel
                spaceId={spaceId}
                settingsHref={`/spaces/${spaceId}/settings`}
                unitsHref={`/spaces/${spaceId}?tab=units`}
                dashboard={buildingDashboard}
                calendar={buildingCalendar}
                currency={currency}
                canMutate={canMutate}
                isOwner={isOwner}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-body-sm text-muted-foreground">
                بارگذاری داشبورد شارژ ممکن نیست.
              </div>
            )}
          </TabsContent>
        ) : null}
        {showBuilding ? (
          <TabsContent value="units" className="mt-3">
            <BuildingUnitsPanel
              spaceId={spaceId}
              currency={currency}
              units={buildingUnits}
              baseCharge={buildingDashboard?.plan?.baseCharge ?? 0}
              canManage={isOwner}
            />
          </TabsContent>
        ) : null}
        <TabsContent value="report" className="mt-3">
          {isHousehold ? (
            <FamilyReportPanel
              currentUserId={currentUserId}
              members={familyReportMembers}
              monthExpenses={familyMonthExpenses}
              monthlyBudget={monthlyBudget}
              currency={currency}
              initialReport={personalReportData}
            />
          ) : (
            <>
              {showBuilding && reportPlanYear != null ? (
                <BuildingReportPeriodFilter
                  spaceId={spaceId}
                  year={reportPlanYear}
                  month={reportMonth}
                />
              ) : null}
              <PersonalReportChart
                data={personalReportData}
                expenseLines={reportExpenseLines}
                currency={currency}
                categoryBudgets={categoryBudgets}
                periodLabel={reportPeriodLabel}
                emptyTitle={reportEmptyTitle}
                emptyHint={reportEmptyHint}
                totalCenterLabel={reportTotalLabel}
              />
            </>
          )}
        </TabsContent>
        {showDebts ? (
          <TabsContent value="debts" className="mt-3">
            <DebtPanel
              spaceId={spaceId}
              debts={debts}
              currency={currency}
              canMutate={canMutate}
              sharedHousehold={isHousehold}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    );
  }

  const tabCount = showChecklist ? 3 : 2;
  const isPartner = spaceType === "PARTNER";

  return (
    <Tabs defaultValue="expenses" className="flex min-h-0 flex-1 flex-col">
      <TabsList
        className={cn(
          "grid h-10 w-full",
          tabCount === 3 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        <TabsTrigger value="expenses">هزینه‌ها</TabsTrigger>
        {showSettlements ? (
          <TabsTrigger value="balances">تراز</TabsTrigger>
        ) : null}
        {showChecklist ? (
          <TabsTrigger value="checklist">چک‌لیست</TabsTrigger>
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
          currency={currency}
          spaceType={spaceType}
          canMutate={canMutate}
        />
      </TabsContent>
      {showSettlements ? (
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
      ) : null}
      {showChecklist ? (
        <TabsContent value="checklist" className="mt-3">
          <SpaceChecklist
            spaceId={spaceId}
            items={checklist}
            canMutate={canMutate}
          />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
