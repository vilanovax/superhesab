"use client";

import type { ChecklistItemDTO } from "@/app/actions/checklist";
import { ExpenseList, type ExpenseListItem } from "@/components/expenses/expense-list";
import { PersonalReportChart } from "@/components/PersonalReportChart";
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
import type { CategoryExpenseRow } from "@/lib/reports";
import {
  FamilyReportPanel,
  type FamilyMonthExpenseRow,
  type FamilyReportMember,
} from "@/components/spaces/family-report-panel";
import type { DebtDTO } from "@/app/actions/debt";
import { DebtPanel } from "@/components/spaces/debt-panel";
import { getTemplate } from "@/lib/templates/registry";
import type { SpaceRole, SpaceType } from "@/types";
import { cn } from "@/lib/utils";

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
  familyMonthExpenses?: FamilyMonthExpenseRow[];
  familyReportMembers?: FamilyReportMember[];
  monthlyBudget?: number | null;
  debts?: DebtDTO[];
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
  familyMonthExpenses = [],
  familyReportMembers = [],
  monthlyBudget = null,
  debts = [],
}: SpaceTabsProps) {
  const template = getTemplate(spaceType);
  const { features } = template;
  const showChecklist = showChecklistProp ?? features.checklist;
  const showSettlements = features.settlements;
  const showIncomeReport = features.incomeExpense;
  const isHousehold = features.householdLedger;
  const showDebts = features.debts;

  if (showIncomeReport && !showSettlements) {
    const tabCount = showDebts ? 3 : 2;
    return (
      <Tabs defaultValue="expenses" className="flex min-h-0 flex-1 flex-col">
        <TabsList
          className={cn(
            "grid h-11 w-full rounded-2xl bg-muted/70 p-1",
            tabCount === 3 ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          <TabsTrigger
            value="expenses"
            className="rounded-xl text-body-sm data-[state=active]:shadow-sm"
          >
            تراکنش‌ها
          </TabsTrigger>
          <TabsTrigger
            value="report"
            className="rounded-xl text-body-sm data-[state=active]:shadow-sm"
          >
            گزارش
          </TabsTrigger>
          {showDebts ? (
            <TabsTrigger
              value="debts"
              className="rounded-xl text-body-sm data-[state=active]:shadow-sm"
            >
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
            <PersonalReportChart
              data={personalReportData}
              currency={currency}
            />
          )}
        </TabsContent>
        {showDebts ? (
          <TabsContent value="debts" className="mt-3">
            <DebtPanel
              spaceId={spaceId}
              debts={debts}
              currency={currency}
              canMutate={canMutate}
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
