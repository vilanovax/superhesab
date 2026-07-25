import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getChecklist } from "@/app/actions/checklist";
import { listSpaceDebts } from "@/app/actions/debt";
import { getFundDashboard, listFundProofsForManager } from "@/app/actions/fund";
import { listInternalLoans } from "@/app/actions/internalLoan";
import { listSavingsPots } from "@/app/actions/savingsPot";
import {
  getAnnualChargeCalendar,
  getBuildingDashboard,
  listChargeProofsForManager,
  listUnitsForSettings,
} from "@/app/actions/building";
import { ensureRecurringExpenses } from "@/app/actions/recurring";
import { getSpaceBalances } from "@/app/actions/settlement";
import { AddExpenseButton } from "@/components/expenses/add-expense-button";
import { BuildingBoardNavButton } from "@/components/spaces/building-board-nav-button";
import { CopyInviteLinkButton } from "@/components/spaces/copy-invite-link-button";
import { InviteMembersButton } from "@/components/spaces/invite-members-button";
import { PersonalMonthHero } from "@/components/spaces/personal-dashboard";
import { BuildingMonthHero } from "@/components/spaces/building-dashboard";
import { FundDashboardPanel } from "@/components/spaces/fund-dashboard-panel";
import { ShareSummaryIconButton } from "@/components/spaces/share-summary-button";
import { SpaceTheme } from "@/components/spaces/space-theme";
import { SpaceTabs } from "@/components/spaces/space-tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/formatters";
import { prisma } from "@/lib/db/prisma";
import { maybeCeilToThousand } from "@/lib/money";
import { tehranCivilMonth, tehranCivilYear, formatJalaliYear, monthLabelFa } from "@/lib/building";
import { jalaliMonthBounds, jalaliYearBounds } from "@/lib/jalali";
import { tehranMonthRange } from "@/lib/personal";
import type { ExpenseCategory } from "@/lib/categorizer";
import {
  getExpensesByCategory,
  getExpensesByCategoryInRange,
  getExpenseLinesForMonth,
  getExpenseLinesInRange,
} from "@/lib/reports-server";
import {
  getTemplate,
  getTemplateDataset,
} from "@/lib/templates/registry";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SpacePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    year?: string;
    tab?: string;
    rm?: string;
    period?: string;
  }>;
};

function BackChevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function HeroStat({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[4.25rem] flex-col justify-center rounded-xl bg-on-hero-soft px-3 py-2.5",
        className,
      )}
    >
      <p className="text-caption leading-none text-on-hero/65">{label}</p>
      <div className="mt-1.5 text-body font-bold leading-snug tabular-nums tracking-tight">
        {children}
      </div>
    </div>
  );
}

export default async function SpacePage({ params, searchParams }: SpacePageProps) {
  const { id } = await params;
  const { year: yearParam, tab: tabParam, rm: reportMonthParam, period: periodParam } =
    await searchParams;
  const session = await requireUser();
  const membership = await requireSpaceMember(id, session.userId);

  if (!membership) {
    notFound();
  }

  // Building residents (VIEWER) use the unit portal, not the manager dashboard.
  if (
    getTemplate(membership.space.type).features.buildingCharges &&
    membership.role === "VIEWER"
  ) {
    redirect(`/spaces/${id}/resident`);
  }

  // FUND members with VIEWER role use the member portal (+ payment proofs).
  if (
    getTemplate(membership.space.type).features.fundRotating &&
    membership.role === "VIEWER"
  ) {
    redirect(`/spaces/${id}/member`);
  }

  // Board moved out of the tab bar → dedicated route.
  if (tabParam === "suggestions") {
    redirect(`/spaces/${id}/board`);
  }

  const spaceTypeRow = await prisma.space.findUnique({
    where: { id },
    select: { type: true },
  });
  if (!spaceTypeRow) {
    notFound();
  }

  const template = getTemplate(spaceTypeRow.type);
  const { features } = template;

  const yearOverrideRaw = Number.parseInt(
    String(yearParam ?? "").replace(/\D/g, ""),
    10,
  );
  const yearOverride =
    Number.isFinite(yearOverrideRaw) &&
    yearOverrideRaw >= 1390 &&
    yearOverrideRaw <= 1500
      ? yearOverrideRaw
      : undefined;

  const spaceYearMeta = features.buildingCharges
    ? await prisma.space.findUnique({
        where: { id },
        select: { defaultPlanYear: true },
      })
    : null;

  const planYear =
    yearOverride ??
    spaceYearMeta?.defaultPlanYear ??
    tehranCivilYear();

  const reportMonthRaw = Number.parseInt(
    String(reportMonthParam ?? "").replace(/\D/g, ""),
    10,
  );
  const reportMonth =
    features.buildingCharges &&
    Number.isFinite(reportMonthRaw) &&
    reportMonthRaw >= 1 &&
    reportMonthRaw <= 12
      ? reportMonthRaw
      : null;

  const fundPeriodRaw = Number.parseInt(
    String(periodParam ?? "").replace(/\D/g, ""),
    10,
  );
  const fundPeriod =
    features.fundRotating &&
    Number.isFinite(fundPeriodRaw) &&
    fundPeriodRaw >= 1
      ? fundPeriodRaw
      : undefined;

  const monthRange = features.buildingCharges
    ? jalaliMonthBounds(tehranCivilYear(), tehranCivilMonth())
    : tehranMonthRange();

  const reportRange = features.buildingCharges
    ? reportMonth != null
      ? jalaliMonthBounds(planYear, reportMonth)
      : jalaliYearBounds(planYear)
    : null;

  const initialTab =
    tabParam === "report" ||
    tabParam === "charges" ||
    tabParam === "units" ||
    tabParam === "expenses" ||
    tabParam === "debts"
      ? tabParam
      : undefined;

  if (features.recurring) {
    await ensureRecurringExpenses(id);
  }

  const emptyBalances = {
    balances: {} as Record<string, number>,
    suggestions: [] as Awaited<
      ReturnType<typeof getSpaceBalances>
    >["suggestions"],
  };

  const [space, balanceData, checklist, monthRows, personalReportData, reportExpenseLines, debts, savingsPots, internalLoans, categoryBudgetRows, buildingDashboard, buildingCalendar, buildingUnits, openBoardSuggestions, chargeProofs, fundDashboard, fundProofs] =
    await Promise.all([
      prisma.space.findUnique({
        where: { id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  avatarUrl: true,
                  isVirtual: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          expenses: {
            select: {
              id: true,
              title: true,
              totalAmount: true,
              date: true,
              createdAt: true,
              updatedAt: true,
              paidById: true,
              transactionType: true,
              category: true,
              categoryLabel: true,
              isCategoryLocked: true,
              spaceId: true,
              paidBy: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  isVirtual: true,
                },
              },
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  isVirtual: true,
                },
              },
              updatedBy: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  isVirtual: true,
                },
              },
              splits: {
                select: {
                  userId: true,
                  owedAmount: true,
                  share: true,
                },
              },
            },
            orderBy: { date: "desc" },
            take: 50,
          },
        },
      }),
      features.settlements
        ? getSpaceBalances(id)
        : Promise.resolve(emptyBalances),
      features.checklist ? getChecklist(id) : Promise.resolve([]),
      features.incomeExpense || features.budget
        ? prisma.expense.findMany({
            where: {
              spaceId: id,
              date: { gte: monthRange.start, lte: monthRange.end },
            },
            select: {
              totalAmount: true,
              transactionType: true,
              category: true,
              categoryLabel: true,
              paidById: true,
            },
          })
        : Promise.resolve([]),
      features.incomeExpense
        ? reportRange
          ? getExpensesByCategoryInRange(
              id,
              reportRange.start,
              reportRange.end,
            )
          : getExpensesByCategory(id, new Date())
        : Promise.resolve([]),
      features.incomeExpense
        ? reportRange
          ? getExpenseLinesInRange(id, reportRange.start, reportRange.end)
          : getExpenseLinesForMonth(id, new Date())
        : Promise.resolve([]),
      features.debts ? listSpaceDebts(id) : Promise.resolve([]),
      features.savingsPot ? listSavingsPots(id) : Promise.resolve([]),
      features.internalLoans ? listInternalLoans(id) : Promise.resolve([]),
      features.categoryBudgets
        ? prisma.categoryBudget.findMany({
            where: { spaceId: id },
            select: { category: true, amount: true },
          })
        : Promise.resolve([]),
      features.buildingCharges
        ? getBuildingDashboard(id, planYear)
        : Promise.resolve(null),
      features.buildingCharges
        ? getAnnualChargeCalendar(id, planYear)
        : Promise.resolve(null),
      features.buildingCharges
        ? listUnitsForSettings(id)
        : Promise.resolve([]),
      features.buildingCharges
        ? prisma.buildingSuggestion.count({
            where: {
              spaceId: id,
              status: { in: ["OPEN", "IN_PROGRESS"] },
            },
          })
        : Promise.resolve(0),
      features.buildingCharges &&
      (membership.role === "OWNER" || membership.role === "EDITOR")
        ? listChargeProofsForManager(id, planYear)
        : Promise.resolve([]),
      features.fundRotating
        ? getFundDashboard(id, fundPeriod)
        : Promise.resolve(null),
      features.fundRotating &&
      (membership.role === "OWNER" || membership.role === "EDITOR")
        ? listFundProofsForManager(id)
        : Promise.resolve([]),
    ]);

  if (!space) {
    notFound();
  }

  const templateDataset = getTemplateDataset(space.type);
  const isPartner = space.type === "PARTNER";
  const isPersonalShell = features.solo;
  const isFamilyShell = features.householdLedger;
  const isBuildingShell = features.buildingCharges;
  const isFundShell = Boolean(features.fundRotating);
  const showChecklist = features.checklist;
  const needsPartner = isPartner && space.members.length < 2;
  const partnerOnboarding =
    isPartner &&
    space.members.length === 1 &&
    space.expenses.length === 0;
  const myRole = membership.role;
  const canWrite = myRole === "OWNER" || myRole === "EDITOR";
  const isOwner = myRole === "OWNER";
  const needsFamilyInvite =
    isFamilyShell && space.members.length < 2 && isOwner;

  const inviteMembers = space.members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    phone: m.user.phone,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    isVirtual: m.user.isVirtual,
    defaultShare: m.defaultShare,
  }));

  /** BUILDING: SpaceMember VIEWER = residents; managers are OWNER/EDITOR only. */
  const managerMembers = isBuildingShell
    ? inviteMembers.filter((m) => m.role === "OWNER" || m.role === "EDITOR")
    : inviteMembers;
  const managerCount = isBuildingShell
    ? managerMembers.length
    : space.members.length;

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

  const partner = space.members.find((m) => m.user.id !== session.userId)?.user;
  const partnerLabel =
    partner?.name?.trim().split(/\s+/)[0] ||
    (partner ? "طرف مقابل" : null);

  const myBalance = maybeCeilToThousand(
    balanceData.balances[session.userId] ?? 0,
    space.roundUpToThousand,
  );
  const totalExpenses = space.expenses
    .filter((e) => e.transactionType === "EXPENSE")
    .reduce((sum, expense) => sum + expense.totalAmount, 0);
  const openSettlementAmount = balanceData.suggestions.reduce(
    (sum, suggestion) =>
      sum + maybeCeilToThousand(suggestion.amount, space.roundUpToThousand),
    0,
  );

  const monthIncome = monthRows
    .filter((r) => r.transactionType === "INCOME")
    .reduce((s, r) => s + r.totalAmount, 0);
  const monthExpense = monthRows
    .filter((r) => r.transactionType === "EXPENSE")
    .reduce((s, r) => s + r.totalAmount, 0);

  return (
    <main
      data-template={templateDataset}
      className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-5"
    >
      <SpaceTheme type={space.type} />
      <div className="mb-3 flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 gap-1 rounded-xl border-border/70 bg-card pe-3 ps-2 text-sm font-medium shadow-sm"
        >
          <Link href="/app">
            <BackChevron className="size-4 text-muted-foreground" />
            بازگشت
          </Link>
        </Button>

        {isPersonalShell || isFamilyShell || isBuildingShell || isFundShell ? (
          <div className="ms-auto flex items-center gap-1.5">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-caption font-semibold text-primary ring-1 ring-primary/15">
              {isBuildingShell
                ? "ساختمان"
                : isFundShell
                  ? "صندوق نوبتی"
                  : isFamilyShell
                    ? "خانواده"
                    : "شخصی"}
            </span>
            {isBuildingShell ? (
              <BuildingBoardNavButton
                spaceId={space.id}
                badgeCount={openBoardSuggestions}
              />
            ) : null}
            <Button
              asChild
              variant="outline"
              size="icon"
              className="size-9 shrink-0 rounded-xl border-border/70 bg-card shadow-sm"
              aria-label="تنظیمات فضا"
            >
              <Link href={`/spaces/${space.id}/settings`}>
                <SettingsIcon className="size-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <span className="ms-auto max-w-[8rem] truncate rounded-lg bg-ink px-2.5 py-1.5 text-caption font-medium text-primary-foreground">
              {isPartner ? "حساب مشترک" : template.label}
            </span>
            <ShareSummaryIconButton
              spaceName={space.name}
              expenses={space.expenses.map((e) => ({
                category: e.category,
                totalAmount: e.totalAmount,
                transactionType: e.transactionType,
              }))}
              members={members}
              suggestions={balanceData.suggestions}
              currentUserId={session.userId}
              currency={space.currency}
              roundUpToThousand={space.roundUpToThousand}
            />
            <Button
              asChild
              variant="outline"
              size="icon"
              className="size-9 shrink-0 rounded-xl border-border/70 bg-card shadow-sm"
              aria-label="تنظیمات فضا"
            >
              <Link href={`/spaces/${space.id}/settings`}>
                <SettingsIcon className="size-4" />
              </Link>
            </Button>
          </>
        )}
      </div>

      <header
        className={cn(
          "surface-hero animate-fade-up relative mb-4 overflow-hidden px-4",
          isPersonalShell || isBuildingShell || isFundShell
            ? "rounded-[1.4rem] pb-4 pt-4 shadow-md"
            : "rounded-2xl pb-4 pt-4",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-s-10 -top-12 size-32 rounded-full bg-on-hero-soft blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-e-8 -bottom-14 size-36 rounded-full bg-black/15 blur-2xl"
        />
        {isBuildingShell ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "linear-gradient(to left, transparent 0%, transparent 48%, rgba(255,255,255,0.35) 48%, rgba(255,255,255,0.35) 49%, transparent 49%), linear-gradient(to bottom, transparent 0%, transparent 48%, rgba(255,255,255,0.25) 48%, rgba(255,255,255,0.25) 49%, transparent 49%)",
                backgroundSize: "28px 28px",
              }}
            />
          </>
        ) : null}

        <div className="relative space-y-3.5">
          {isBuildingShell ? (
            <BuildingMonthHero
              spaceId={space.id}
              spaceName={space.name}
              memberCount={managerCount}
              expenseCount={space.expenses.length}
              monthExpense={monthExpense}
              dashboard={buildingDashboard}
              currency={space.currency}
              settingsHref={`/spaces/${space.id}/settings`}
              isOwner={isOwner}
              managersAction={
                isOwner ? (
                  <InviteMembersButton
                    spaceId={space.id}
                    spaceName={space.name}
                    members={managerMembers}
                    currentUserRole={myRole}
                    spaceType={space.type}
                  />
                ) : null
              }
            />
          ) : isFundShell ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-start">
                  <p className="text-[0.6875rem] font-semibold tracking-[0.08em] text-on-hero/55">
                    صندوق نوبتی
                  </p>
                  <h1 className="mt-1 truncate text-[1.35rem] font-bold leading-none tracking-tight text-on-hero">
                    {space.name}
                  </h1>
                  <p className="mt-1.5 text-caption text-on-hero/65">
                    {space.members.length} عضو
                    {fundDashboard?.plan
                      ? ` · ${fundDashboard.plan.periodCount} دوره`
                      : " · پلن تعریف نشده"}
                  </p>
                </div>
                {isOwner ? (
                  <InviteMembersButton
                    spaceId={space.id}
                    spaceName={space.name}
                    members={inviteMembers}
                    currentUserRole={myRole}
                    spaceType={space.type}
                    maxMembers={template.maxMembers}
                    inviteRolePicker
                  />
                ) : null}
              </div>
              {fundDashboard?.plan ? (
                <div className="grid grid-cols-2 gap-2">
                  <HeroStat label="جمع‌شده این دوره">
                    {formatCurrency(
                      fundDashboard.collectedTotal,
                      space.currency,
                    )}
                  </HeroStat>
                  <HeroStat label="نوبت">
                    {fundDashboard.winnerName ?? "—"}
                  </HeroStat>
                </div>
              ) : isOwner ? (
                <Link
                  href={`/spaces/${space.id}/settings`}
                  className="group flex items-center gap-3 rounded-2xl bg-on-hero px-3.5 py-3 text-primary shadow-sm transition-[transform,opacity] active:scale-[0.98] hover:opacity-95"
                >
                  <span className="min-w-0 flex-1 text-start">
                    <span className="block text-body-sm font-bold text-primary">
                      تعریف پلن صندوق
                    </span>
                    <span className="mt-0.5 block text-caption text-primary/70">
                      مبلغ سهم و تعداد دوره در تنظیمات
                    </span>
                  </span>
                  <span
                    className="text-body font-bold text-primary/80 transition-transform group-hover:-translate-x-0.5"
                    aria-hidden
                  >
                    ←
                  </span>
                </Link>
              ) : null}
            </div>
          ) : isPersonalShell ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-start">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-on-hero/50">
                  حساب شخصی
                </p>
                <h1 className="mt-1 truncate text-xl font-bold leading-tight tracking-tight text-on-hero">
                  {space.name}
                </h1>
              </div>
              <span className="shrink-0 rounded-full bg-on-hero/12 px-2.5 py-1 text-caption font-semibold text-on-hero/85 ring-1 ring-on-hero/15">
                این ماه
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-caption font-medium tracking-wide text-on-hero/60">
                {isPartner
                  ? "حساب مشترک"
                  : isFamilyShell
                    ? "لجر خانواده"
                    : "فضای مشترک"}
              </p>
              <h1 className="text-title font-bold leading-tight tracking-tight text-on-hero">
                {space.name}
              </h1>
              <p className="text-xs text-on-hero/70">
                {isPartner ? (
                  partnerLabel ? (
                    <>من و {partnerLabel}</>
                  ) : (
                    <>من · منتظر طرف مقابل</>
                  )
                ) : (
                  <>
                    {space.members.length} عضو · {space.expenses.length} هزینه
                    {totalExpenses > 0 ? (
                      <> · جمع {formatCurrency(totalExpenses, space.currency)}</>
                    ) : null}
                  </>
                )}
                {isPartner && totalExpenses > 0 ? (
                  <> · جمع {formatCurrency(totalExpenses, space.currency)}</>
                ) : null}
              </p>
            </div>
          )}

          {!isPersonalShell &&
          !isBuildingShell &&
          !isFundShell &&
          features.invites ? (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2 space-x-reverse">
                {space.members.slice(0, 4).map((m) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={m.user.id}
                    src={
                      m.user.avatarUrl ??
                      `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(m.user.phone)}`
                    }
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 rounded-full border-2 border-on-hero/35 bg-on-hero/20"
                  />
                ))}
                {space.members.length > 4 ? (
                  <span className="flex size-8 items-center justify-center rounded-full border-2 border-on-hero/35 bg-on-hero/20 text-micro font-semibold">
                    +{space.members.length - 4}
                  </span>
                ) : null}
              </div>
              {isOwner ? (
                <InviteMembersButton
                  spaceId={space.id}
                  spaceName={space.name}
                  members={inviteMembers}
                  currentUserRole={myRole}
                  inviteRolePicker={isFamilyShell}
                  spaceType={space.type}
                  maxMembers={template.maxMembers}
                />
              ) : null}
            </div>
          ) : null}

          {isBuildingShell || isFundShell ? null : isPersonalShell || isFamilyShell ? (
            <PersonalMonthHero
              income={monthIncome}
              expenses={monthExpense}
              monthlyBudget={space.monthlyBudget}
              currency={space.currency}
              settingsHref={`/spaces/${space.id}/settings`}
            />
          ) : isPartner ? (
            <div className="rounded-xl bg-on-hero-soft px-3.5 py-3">
              <p className="text-caption text-on-hero/65">مانده شما</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-on-hero">
                {myBalance === 0
                  ? "صاف"
                  : `${myBalance > 0 ? "+" : "−"}${formatCurrency(Math.abs(myBalance), space.currency)}`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <HeroStat label="مانده شما">
                {myBalance === 0 ? (
                  <span className="text-on-hero/90">تسویه‌شده</span>
                ) : (
                  <span
                    className={
                      myBalance > 0 ? "text-emerald-100" : "text-rose-100"
                    }
                  >
                    {myBalance > 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(myBalance), space.currency)}
                  </span>
                )}
              </HeroStat>
              <HeroStat label="تسویه باز">
                {openSettlementAmount === 0
                  ? "صفر"
                  : formatCurrency(openSettlementAmount, space.currency)}
              </HeroStat>
            </div>
          )}
        </div>
      </header>

      {partnerOnboarding && isOwner ? (
        <div className="mb-4">
          <EmptyState
            icon="space"
            title="حساب مشترک شما آماده است"
            description="برای شروع مدیریت هزینه‌ها، لینک دعوت را برای طرف مقابل بفرستید."
            actionNode={<CopyInviteLinkButton spaceId={space.id} />}
            secondaryAction={
              <InviteMembersButton
                spaceId={space.id}
                spaceName={space.name}
                members={inviteMembers}
                currentUserRole={myRole}
                variant="empty"
              />
            }
          />
        </div>
      ) : needsPartner && isOwner ? (
        <div className="animate-fade-up mb-4 rounded-2xl border border-primary/20 bg-card px-4 py-5 text-center shadow-sm">
          <p className="text-body font-semibold text-foreground">
            طرف مقابل را به این حساب مشترک دعوت کنید
          </p>
          <p className="mt-1.5 text-body-sm leading-relaxed text-muted-foreground">
            با لینک دعوت یا افزودن دستی، حساب دونفره‌تان کامل می‌شود.
          </p>
          <InviteMembersButton
            spaceId={space.id}
            spaceName={space.name}
            members={inviteMembers}
            currentUserRole={myRole}
            variant="banner"
          />
        </div>
      ) : needsFamilyInvite ? (
        <div className="animate-fade-up mb-4 rounded-2xl border border-primary/20 bg-card px-4 py-5 text-center shadow-sm">
          <p className="text-body font-semibold text-foreground">
            اعضای خانواده را دعوت کنید
          </p>
          <p className="mt-1.5 text-body-sm leading-relaxed text-muted-foreground">
            با لینک دعوت می‌توانید همسر یا اعضا را به‌عنوان عضو فعال یا ناظر اضافه کنید.
          </p>
          <InviteMembersButton
            spaceId={space.id}
            spaceName={space.name}
            members={inviteMembers}
            currentUserRole={myRole}
            variant="banner"
            inviteRolePicker
          />
        </div>
      ) : null}

      {isFundShell ? (
        fundDashboard ? (
          <FundDashboardPanel
            spaceId={space.id}
            dashboard={fundDashboard}
            currency={space.currency}
            canMutate={canWrite}
            isOwner={isOwner}
            settingsHref={`/spaces/${space.id}/settings`}
            proofs={fundProofs}
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-body-sm text-muted-foreground">
            بارگذاری داشبورد صندوق ممکن نیست.
          </p>
        )
      ) : (
      <SpaceTabs
        spaceId={space.id}
        spaceName={space.name}
        currentUserId={session.userId}
        currentUserRole={myRole}
        expenses={space.expenses}
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
        categoryBudgets={Object.fromEntries(
          categoryBudgetRows.map((r) => [
            r.category as ExpenseCategory,
            r.amount,
          ]),
        )}
        buildingDashboard={buildingDashboard}
        buildingCalendar={buildingCalendar}
        buildingUnits={buildingUnits}
        chargeProofs={chargeProofs}
        isOwner={isOwner}
        initialTab={initialTab}
        reportPlanYear={features.buildingCharges ? planYear : undefined}
        reportMonth={features.buildingCharges ? reportMonth : null}
        reportPeriodLabel={
          features.buildingCharges
            ? reportMonth != null
              ? `هزینه مشاع ${monthLabelFa(reportMonth)} ${formatJalaliYear(planYear)}`
              : `هزینه مشاع سال ${formatJalaliYear(planYear)}`
            : undefined
        }
        reportTotalLabel={
          features.buildingCharges
            ? reportMonth != null
              ? "جمع ماه"
              : "جمع سال"
            : undefined
        }
        reportEmptyTitle={
          features.buildingCharges
            ? reportMonth != null
              ? `گزارش ${monthLabelFa(reportMonth)} خالی است`
              : "گزارش سال خالی است"
            : undefined
        }
        reportEmptyHint={
          features.buildingCharges
            ? "با ثبت چند هزینه مشاع، سهم هر دسته به‌صورت دایره‌ای اینجا می‌آید."
            : undefined
        }
      />
      )}

      {canWrite && !isFundShell ? (
        <AddExpenseButton
          spaceId={space.id}
          currentUserId={session.userId}
          members={members}
          currency={space.currency}
          spaceType={space.type}
        />
      ) : null}
    </main>
  );
}
