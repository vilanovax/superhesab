import { notFound } from "next/navigation";
import { AddExpenseButton } from "@/components/expenses/add-expense-button";
import { SpaceTabsGate } from "@/components/spaces/space-tabs-gate";
import {
  formatJalaliYear,
  monthLabelFa,
} from "@/lib/building";
import { loadDeferredTabData } from "@/lib/spaces/load-deferred-tab";
import {
  emptyBalances,
  loadCachedBalances,
  loadCachedBuildingView,
  loadCachedFundDashboard,
  loadFundProofs,
  loadMonthRows,
  loadSpaceExpensesPage,
  loadSpaceWithMembers,
  type SpacePageCtx,
} from "@/lib/spaces/space-page-ctx";
/**
 * Streams after hero — expense list, deferred tabs, fund panel, FAB.
 * Tab-aware: only the active tab’s heavy payload is awaited on first paint.
 */
export async function SpacePageBody({
  ctxPromise,
}: {
  ctxPromise: Promise<SpacePageCtx>;
}) {
  const ctx = await ctxPromise;
  const {
    id,
    session,
    membership,
    features,
    planYear,
    reportMonth,
    fundPeriod,
    monthRange,
    reportRange,
    activeTab,
    hiddenCategories,
    hiddenCategoriesKey,
  } = ctx;

  const myRole = membership.role;
  const canWrite = myRole === "OWNER" || myRole === "EDITOR";
  const isOwner = myRole === "OWNER";
  const isBuildingShell = features.buildingCharges;
  const isFundShell = Boolean(features.fundRotating);
  const showChecklist = features.checklist;

  /** Eager-load only what the active tab needs; deferred loader owns the rest. */
  const needExpenses = activeTab === "expenses";
  const needBuildingView =
    isBuildingShell &&
    (activeTab === "charges" || activeTab === "units");
  const needMonthRows =
    !isBuildingShell &&
    (features.incomeExpense || features.budget) &&
    (activeTab === "expenses" || activeTab === "report");
  const skipChargeProofsOnRsc =
    isBuildingShell && activeTab === "charges";

  const [
    space,
    expensesPage,
    balanceData,
    monthRows,
    buildingView,
    fundDashboard,
    fundProofs,
    deferredTab,
  ] = await Promise.all([
    loadSpaceWithMembers(id),
    needExpenses
      ? loadSpaceExpensesPage(
          id,
          hiddenCategoriesKey,
          isBuildingShell ? planYear : undefined,
          session.userId,
        )
      : Promise.resolve({ expenses: [], hasMore: false }),
    features.settlements
      ? loadCachedBalances(id)
      : Promise.resolve(emptyBalances),
    needMonthRows
      ? loadMonthRows(
          id,
          monthRange.start.getTime(),
          monthRange.end.getTime(),
          hiddenCategoriesKey,
        )
      : Promise.resolve([]),
    needBuildingView
      ? loadCachedBuildingView(id, planYear)
      : Promise.resolve(null),
    features.fundRotating
      ? loadCachedFundDashboard(id, fundPeriod)
      : Promise.resolve(null),
    features.fundRotating &&
    (membership.role === "OWNER" || membership.role === "EDITOR")
      ? loadFundProofs(id)
      : Promise.resolve([]),
    loadDeferredTabData({
      spaceId: id,
      tab: activeTab,
      features,
      role: membership.role,
      planYear,
      reportRange,
      hiddenCategories,
      viewerUserId: session.userId,
      includeChargeProofs: !skipChargeProofsOnRsc,
    }),
  ]);

  if (!space) notFound();

  const expenses = needExpenses
    ? expensesPage.expenses
    : deferredTab.expenses;
  const expensesHasMore = needExpenses
    ? expensesPage.hasMore
    : deferredTab.expensesHasMore;

  const buildingDashboard =
    buildingView?.dashboard ?? deferredTab.buildingDashboard ?? null;
  const buildingCalendar =
    buildingView?.calendar ?? deferredTab.buildingCalendar ?? null;
  const buildingUnits =
    buildingView?.units?.length
      ? buildingView.units
      : deferredTab.buildingUnits;

  const {
    personalReportData,
    reportExpenseLines,
    debts,
    savingsPots,
    internalLoans,
    checklist,
    chargeProofs,
    categoryBudgets,
  } = deferredTab;

  const inviteMembers = space.members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    phone: m.user.phone,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    isVirtual: m.user.isVirtual,
    defaultShare: m.defaultShare,
  }));

  const members = space.members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    phone: m.user.phone,
    isVirtual: m.user.isVirtual,
    defaultShare: m.defaultShare,
  }));

  const fundMembers = space.members.map((m) => ({
    memberId: m.id,
    userId: m.user.id,
    label:
      m.user.id === session.userId
        ? "من"
        : m.user.name?.trim().split(/\s+/)[0] ||
          m.user.phone ||
          "عضو",
  }));
  const currentFundMemberId =
    space.members.find((m) => m.user.id === session.userId)?.id ?? null;

  if (isFundShell) {
    if (!fundDashboard) {
      return (
        <p className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-body-sm text-muted-foreground">
          بارگذاری داشبورد صندوق ممکن نیست.
        </p>
      );
    }
    const { FundDashboardPanel } = await import(
      "@/components/spaces/fund-dashboard-panel"
    );
    return (
      <FundDashboardPanel
        spaceId={space.id}
        dashboard={fundDashboard}
        currency={space.currency}
        canMutate={canWrite}
        isOwner={isOwner}
        settingsHref={`/spaces/${space.id}/settings`}
        proofs={fundProofs}
      />
    );
  }

  return (
    <>
      <SpaceTabsGate
        spaceId={space.id}
        spaceName={space.name}
        currentUserId={session.userId}
        currentUserRole={myRole}
        expenses={expenses}
        expensesHasMore={expensesHasMore}
        members={members}
        inviteMembers={inviteMembers}
        balances={balanceData.balances}
        suggestions={balanceData.suggestions}
        checklist={checklist}
        currency={space.currency}
        roundUpToThousand={space.roundUpToThousand}
        spaceType={space.type}
        showChecklist={showChecklist}
        canMutate={canWrite}
        personalReportData={personalReportData}
        reportExpenseLines={reportExpenseLines}
        familyMonthExpenses={monthRows
          .filter((r) => r.transactionType === "EXPENSE")
          .map((r) => ({
            category: r.category,
            categoryLabel: r.categoryLabel ?? null,
            totalAmount: r.totalAmount,
            paidById: r.paidById,
          }))}
        familyReportMembers={members.map((m) => ({
          userId: m.userId,
          name:
            m.userId === session.userId
              ? "من"
              : m.name?.trim().split(/\s+/)[0] ||
                m.phone ||
                "عضو",
        }))}
        monthlyBudget={space.monthlyBudget}
        debts={debts}
        savingsPots={savingsPots}
        internalLoans={internalLoans}
        fundMembers={fundMembers}
        currentFundMemberId={currentFundMemberId}
        categoryBudgets={categoryBudgets}
        buildingDashboard={buildingDashboard}
        buildingCalendar={buildingCalendar}
        buildingUnits={buildingUnits}
        chargeProofs={chargeProofs}
        isOwner={isOwner}
        initialTab={activeTab}
        loadedTabs={[activeTab]}
        tabLoadContext={{
          planYear: isBuildingShell ? planYear : undefined,
          reportMonth: isBuildingShell ? reportMonth : null,
        }}
        reportPlanYear={isBuildingShell ? planYear : undefined}
        reportMonth={isBuildingShell ? reportMonth : null}
        reportPeriodLabel={
          isBuildingShell
            ? reportMonth != null
              ? `هزینه مشاع ${monthLabelFa(reportMonth)} ${formatJalaliYear(planYear)}`
              : `هزینه مشاع سال ${formatJalaliYear(planYear)}`
            : undefined
        }
        reportTotalLabel={
          isBuildingShell
            ? reportMonth != null
              ? "جمع ماه"
              : "جمع سال"
            : undefined
        }
        reportEmptyTitle={
          isBuildingShell
            ? reportMonth != null
              ? `گزارش ${monthLabelFa(reportMonth)} خالی است`
              : "گزارش سال خالی است"
            : undefined
        }
        reportEmptyHint={
          isBuildingShell
            ? "با ثبت چند هزینه مشاع، سهم هر دسته به‌صورت دایره‌ای اینجا می‌آید."
            : undefined
        }
      />

      {canWrite ? (
        <AddExpenseButton
          spaceId={space.id}
          currentUserId={session.userId}
          members={members}
          currency={space.currency}
          spaceType={space.type}
          hiddenCategories={hiddenCategories}
          activeTab={activeTab}
        />
      ) : null}
    </>
  );
}
