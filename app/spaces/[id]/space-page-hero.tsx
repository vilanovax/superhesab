import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BuildingBoardNavButton } from "@/components/spaces/building-board-nav-button";
import { BuildingContactsNavButton } from "@/components/spaces/building-contacts-nav-button";
import { BuildingShareNavButton } from "@/components/spaces/building-share-nav-button";
import { CopyInviteLinkButton } from "@/components/spaces/copy-invite-link-button";
import { InviteMembersButton } from "@/components/spaces/invite-members-button";
import { BuildingMonthHero } from "@/components/spaces/building-dashboard";
import { PersonalMonthHero } from "@/components/spaces/personal-dashboard";
import { ShareSummaryIconButton } from "@/components/spaces/share-summary-button";
import { PartnerHeroStats } from "@/components/spaces/partner-hero-stats";
import { SpaceNotesNavButton } from "@/components/spaces/space-notes-nav-button";
import { TripHeroStats } from "@/components/spaces/trip-hero-stats";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatFaDigits } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { maybeCeilToThousand } from "@/lib/money";
import {
  emptyBalances,
  loadCachedBalances,
  loadCachedBuildingDashboard,
  loadCachedFundDashboard,
  loadExpenseHeroStats,
  loadMonthExpenseTotal,
  loadMonthRows,
  loadOpenBoardCount,
  loadSpaceWithMembers,
  type SpaceMembership,
  type SpacePageCtx,
} from "@/lib/spaces/space-page-ctx";
import { getTemplate } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";

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
      <circle cx="12" cy="12" r="3.25" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
        "flex min-h-17 flex-col justify-center rounded-2xl bg-on-hero/10 px-3.5 py-3 ring-1 ring-on-hero/10",
        className,
      )}
    >
      <p className="text-caption font-medium leading-none text-on-hero/70">
        {label}
      </p>
      <div className="mt-1.5 text-body font-bold leading-snug tabular-nums tracking-tight">
        {children}
      </div>
    </div>
  );
}

function HeroCardFallback() {
  return (
    <div
      className="mb-5 min-h-[11.5rem] animate-pulse rounded-3xl bg-primary/15"
      aria-hidden
    />
  );
}

function ChromeIconFallback() {
  return (
    <div
      className="size-11 shrink-0 animate-pulse rounded-2xl bg-muted"
      aria-hidden
    />
  );
}

/** Sync top bar — paints with the route shell (no data await). */
function SpacePageHeroChrome({
  spaceId,
  membership,
  ctxPromise,
}: {
  spaceId: string;
  membership: SpaceMembership;
  ctxPromise: Promise<SpacePageCtx>;
}) {
  const template = getTemplate(membership.space.type);
  const { features } = template;
  const isPartner = membership.space.type === "PARTNER";
  const isPersonalShell = features.solo;
  const isFamilyShell = features.householdLedger;
  const isBuildingShell = features.buildingCharges;
  const isFundShell = Boolean(features.fundRotating);
  const showTypedPill =
    isPersonalShell || isFamilyShell || isBuildingShell || isFundShell;

  return (
    <div className="mb-4 flex min-w-0 items-center gap-2">
      <Link
        href="/app"
        className="inline-flex h-11 min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-border/55 bg-card px-3.5 text-caption font-semibold text-foreground shadow-sm transition-colors duration-150 hover:border-primary/25 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BackChevron className="size-4 text-muted-foreground" />
        بازگشت
      </Link>

      {showTypedPill ? (
        <div className="ms-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5">
          <span
            className={cn(
              "rounded-full bg-primary/10 px-2.5 py-1.5 text-caption font-semibold text-primary ring-1 ring-primary/15",
              isBuildingShell && "max-sm:sr-only",
            )}
          >
            {isBuildingShell
              ? "ساختمان"
              : isFundShell
                ? "صندوق نوبتی"
                : isFamilyShell
                  ? "خانواده"
                  : "شخصی"}
          </span>
          {isBuildingShell ? (
            <Suspense
              fallback={<BuildingBoardNavButton spaceId={spaceId} />}
            >
              <HeroBoardButton spaceId={spaceId} ctxPromise={ctxPromise} />
            </Suspense>
          ) : null}
          {isBuildingShell ? (
            <BuildingContactsNavButton spaceId={spaceId} />
          ) : null}
          {isBuildingShell ? (
            <BuildingShareNavButton spaceId={spaceId} />
          ) : null}
          {features.checklist ? (
            <SpaceNotesNavButton spaceId={spaceId} />
          ) : null}
          <Button
            asChild
            variant="outline"
            size="icon"
            className="size-11 shrink-0 cursor-pointer rounded-2xl border-border/55 bg-card shadow-sm"
            aria-label="تنظیمات فضا"
          >
            <Link href={`/spaces/${spaceId}/settings`}>
              <SettingsIcon className="size-5" />
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <span className="ms-auto max-w-[8rem] truncate rounded-full bg-ink px-3 py-1.5 text-caption font-semibold text-primary-foreground">
            {isPartner ? "حساب مشترک" : template.label}
          </span>
          {features.settlements ? (
            <Suspense fallback={<ChromeIconFallback />}>
              <HeroShareButton spaceId={spaceId} ctxPromise={ctxPromise} />
            </Suspense>
          ) : null}
          {features.checklist ? (
            <SpaceNotesNavButton spaceId={spaceId} />
          ) : null}
          <Button
            asChild
            variant="outline"
            size="icon"
            className="size-11 shrink-0 cursor-pointer rounded-2xl border-border/55 bg-card shadow-sm"
            aria-label="تنظیمات فضا"
          >
            <Link href={`/spaces/${spaceId}/settings`}>
              <SettingsIcon className="size-5" />
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}

async function HeroBoardButton({
  spaceId,
}: {
  spaceId: string;
  ctxPromise: Promise<SpacePageCtx>;
}) {
  const badgeCount = await loadOpenBoardCount(spaceId);
  return (
    <BuildingBoardNavButton spaceId={spaceId} badgeCount={badgeCount} />
  );
}

async function HeroShareButton({
  spaceId,
  ctxPromise,
}: {
  spaceId: string;
  ctxPromise: Promise<SpacePageCtx>;
}) {
  const ctx = await ctxPromise;
  if (!ctx.features.settlements) return null;
  return <ShareSummaryIconButton spaceId={spaceId} />;
}

/**
 * Sync chrome + streamed hero card. Top bar paints with the shell; stats
 * and onboarding suspend independently (LCP / perceived speed).
 */
export function SpacePageHero({
  spaceId,
  membership,
  ctxPromise,
}: {
  spaceId: string;
  membership: SpaceMembership;
  ctxPromise: Promise<SpacePageCtx>;
}) {
  return (
    <>
      <SpacePageHeroChrome
        spaceId={spaceId}
        membership={membership}
        ctxPromise={ctxPromise}
      />
      <Suspense fallback={<HeroCardFallback />}>
        <SpacePageHeroCard ctxPromise={ctxPromise} />
      </Suspense>
    </>
  );
}

/** Streams after chrome nav — hero card + onboarding, without expense list. */
async function SpacePageHeroCard({
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
    fundPeriod,
    monthRange,
    hiddenCategoriesKey,
    activeTab,
  } = ctx;

  const template = getTemplate(membership.space.type);
  const isPartner = membership.space.type === "PARTNER";
  const isPersonalShell = features.solo;
  const isFamilyShell = features.householdLedger;
  const isBuildingShell = features.buildingCharges;
  const isFundShell = Boolean(features.fundRotating);
  const myRole = membership.role;
  const isOwner = myRole === "OWNER";
  /** Family/personal need per-row month data; BUILDING only needs expense total. */
  const needMonthRows =
    !isBuildingShell && (features.incomeExpense || features.budget);
  const needMonthExpenseTotal =
    isBuildingShell && (features.incomeExpense || features.budget);

  const [
    space,
    balanceData,
    monthRows,
    monthExpenseTotal,
    buildingDashboard,
    fundDashboard,
    heroStats,
  ] = await Promise.all([
    loadSpaceWithMembers(id),
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
    needMonthExpenseTotal
      ? loadMonthExpenseTotal(
          id,
          monthRange.start.getTime(),
          monthRange.end.getTime(),
          hiddenCategoriesKey,
        )
      : Promise.resolve(0),
    features.buildingCharges
      ? loadCachedBuildingDashboard(id, planYear)
      : Promise.resolve(null),
    features.fundRotating
      ? loadCachedFundDashboard(id, fundPeriod)
      : Promise.resolve(null),
    loadExpenseHeroStats(id, hiddenCategoriesKey),
  ]);

  if (!space) notFound();
  const inviteMembers = space.members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    phone: m.user.phone,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    isVirtual: m.user.isVirtual,
    defaultShare: m.defaultShare,
  }));
  const managerMembers = isBuildingShell
    ? inviteMembers.filter((m) => m.role === "OWNER" || m.role === "EDITOR")
    : inviteMembers;
  const managerCount = isBuildingShell
    ? managerMembers.length
    : space.members.length;

  const partner = space.members.find((m) => m.user.id !== session.userId)?.user;
  const partnerLabel =
    partner?.name?.trim().split(/\s+/)[0] ||
    (partner ? "طرف مقابل" : null);

  const myBalance = maybeCeilToThousand(
    balanceData.balances[session.userId] ?? 0,
    space.roundUpToThousand,
  );
  const totalExpenses = heroStats.totalExpenses;
  const expenseCount = heroStats.expenseCount;
  const openSettlementAmount = balanceData.suggestions.reduce(
    (sum, suggestion) =>
      sum + maybeCeilToThousand(suggestion.amount, space.roundUpToThousand),
    0,
  );

  const monthIncome = monthRows
    .filter((r) => r.transactionType === "INCOME")
    .reduce((s, r) => s + r.totalAmount, 0);
  const monthExpense = needMonthExpenseTotal
    ? monthExpenseTotal
    : monthRows
        .filter((r) => r.transactionType === "EXPENSE")
        .reduce((s, r) => s + r.totalAmount, 0);

  const needsPartner = isPartner && space.members.length < 2;
  const partnerOnboarding =
    isPartner && space.members.length === 1 && expenseCount === 0;
  const needsFamilyInvite =
    isFamilyShell && space.members.length < 2 && isOwner && expenseCount > 0;
  const atPartnerCap =
    isPartner &&
    template.maxMembers != null &&
    space.members.length >= template.maxMembers;
  const memberAvatars = (
    <div className="flex -space-x-2 space-x-reverse">
      {space.members.slice(0, 4).map((m) => (
        <UserAvatar
          key={m.user.id}
          phone={m.user.phone}
          name={m.user.name}
          avatarUrl={m.user.avatarUrl}
          size={32}
          className="size-8 border-2 border-on-hero/35 bg-on-hero/20"
        />
      ))}
      {space.members.length > 4 ? (
        <span className="flex size-8 items-center justify-center rounded-full border-2 border-on-hero/35 bg-on-hero/20 text-micro font-semibold">
          +{space.members.length - 4}
        </span>
      ) : null}
    </div>
  );
  const membersSlot =
    !isPersonalShell &&
    !isBuildingShell &&
    !isFundShell &&
    features.invites ? (
      isOwner ? (
        <InviteMembersButton
          spaceId={space.id}
          spaceName={space.name}
          members={inviteMembers}
          currentUserRole={myRole}
          inviteRolePicker={isFamilyShell}
          spaceType={space.type}
          maxMembers={template.maxMembers}
          trigger={
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-full py-1 pe-1 ps-0.5 transition-opacity active:opacity-80"
              aria-label={
                atPartnerCap ? "مدیریت اعضا" : "دعوت یا مدیریت اعضا"
              }
            >
              {memberAvatars}
              {!atPartnerCap ? (
                <span className="flex size-8 items-center justify-center rounded-full border border-on-hero/35 bg-on-hero/15 text-on-hero">
                  <span className="text-base leading-none">+</span>
                </span>
              ) : null}
            </button>
          }
        />
      ) : (
        <div
          role="group"
          className="flex items-center gap-2"
          aria-label={`${formatFaDigits(space.members.length)} عضو`}
        >
          {memberAvatars}
        </div>
      )
    ) : null;

  return (
    <>
      <header
        className={cn(
          "surface-hero animate-fade-up relative mb-5 overflow-hidden rounded-3xl px-5 py-5 shadow-md",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-e-10 -top-14 size-40 rounded-full bg-on-hero/12 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-s-12 -bottom-10 size-36 rounded-full bg-ink/25 blur-3xl"
        />
        {isBuildingShell ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(to left, transparent 0%, transparent 48%, rgba(255,255,255,0.35) 48%, rgba(255,255,255,0.35) 49%, transparent 49%), linear-gradient(to bottom, transparent 0%, transparent 48%, rgba(255,255,255,0.25) 48%, rgba(255,255,255,0.25) 49%, transparent 49%)",
              backgroundSize: "28px 28px",
            }}
          />
        ) : null}

        <div className="relative space-y-3.5">
          {isBuildingShell ? (
            <BuildingMonthHero
              spaceId={space.id}
              spaceName={space.name}
              memberCount={managerCount}
              expenseCount={expenseCount}
              monthExpense={monthExpense}
              dashboard={buildingDashboard}
              currency={space.currency}
              settingsHref={`/spaces/${space.id}/settings`}
              isOwner={isOwner}
              canRememberYear={myRole === "OWNER" || myRole === "EDITOR"}
              // Full وصول KPIs on شارژ (building «تراز»); slim elsewhere.
              compactStats={activeTab !== "charges"}
              yearNavTab={
                activeTab === "expenses" ||
                activeTab === "charges" ||
                activeTab === "units" ||
                activeTab === "report"
                  ? activeTab
                  : "charges"
              }
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
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-start">
                  <p className="text-[0.6875rem] font-semibold tracking-[0.08em] text-on-hero/55">
                    صندوق نوبتی
                  </p>
                  <h1 className="mt-1 truncate text-[1.35rem] font-bold leading-none tracking-tight text-on-hero">
                    {space.name}
                  </h1>
                  <p className="mt-1.5 text-caption text-on-hero/65">
                    {space.members.length.toLocaleString("fa-IR")} عضو
                    {fundDashboard?.plan
                      ? ` · دوره ${fundDashboard.periodIndex.toLocaleString("fa-IR")} از ${fundDashboard.plan.periodCount.toLocaleString("fa-IR")}`
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
              {!fundDashboard?.plan && isOwner ? (
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
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1 text-start">
                <p className="text-caption font-medium tracking-wide text-on-hero/60">
                  {isPartner
                    ? "حساب مشترک"
                    : isFamilyShell
                      ? "لجر خانواده"
                      : "فضای مشترک"}
                </p>
                <h1 className="truncate text-title font-bold leading-tight tracking-tight text-on-hero">
                  {space.name}
                </h1>
                <p className="text-xs text-on-hero/70">
                  {isPartner ? (
                    partnerLabel ? (
                      <>من و {partnerLabel}</>
                    ) : (
                      <>من · منتظر طرف مقابل</>
                    )
                  ) : expenseCount === 0 && isFamilyShell ? (
                    <>
                      {formatFaDigits(space.members.length)} عضو · آمادهٔ شروع
                    </>
                  ) : (
                    <>
                      {formatFaDigits(space.members.length)} عضو ·{" "}
                      {formatFaDigits(expenseCount)} هزینه
                      {totalExpenses > 0 ? (
                        <> · جمع {formatCurrency(totalExpenses, space.currency)}</>
                      ) : null}
                    </>
                  )}
                </p>
              </div>
              {isFamilyShell ? (
                <div className="shrink-0 pt-0.5">{membersSlot}</div>
              ) : null}
            </div>
          )}

          {(() => {
            if (isBuildingShell || isFundShell) return null;
            if (isPersonalShell || isFamilyShell) {
              return (
                <PersonalMonthHero
                  income={monthIncome}
                  expenses={monthExpense}
                  monthlyBudget={space.monthlyBudget}
                  currency={space.currency}
                  settingsHref={`/spaces/${space.id}/settings`}
                  household={isFamilyShell}
                />
              );
            }
            if (isPartner) {
              return (
                <PartnerHeroStats
                  myBalance={myBalance}
                  currency={space.currency}
                  initialTab={activeTab}
                  membersSlot={membersSlot}
                />
              );
            }
            return (
              <TripHeroStats
                myBalance={myBalance}
                openSettlementAmount={openSettlementAmount}
                currency={space.currency}
                expenseCount={expenseCount}
                initialTab={activeTab}
                membersSlot={membersSlot}
              />
            );
          })()}
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
        <div className="animate-fade-up mb-3 flex items-center gap-3 rounded-2xl border border-primary/20 bg-card px-3 py-2.5 shadow-sm">
          <div className="min-w-0 flex-1 text-start">
            <p className="text-body-sm font-semibold text-foreground">
              طرف مقابل را دعوت کنید
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              با لینک دعوت، حساب دونفره کامل می‌شود.
            </p>
          </div>
          <InviteMembersButton
            spaceId={space.id}
            spaceName={space.name}
            members={inviteMembers}
            currentUserRole={myRole}
            variant="inline"
          />
        </div>
      ) : needsFamilyInvite ? (
        <div className="animate-fade-up mb-3 flex items-center gap-3 rounded-2xl border border-border/55 bg-card px-3 py-2.5 shadow-sm">
          <div className="min-w-0 flex-1 text-start">
            <p className="text-body-sm font-semibold text-foreground">
              همسر یا اعضا را دعوت کنید
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              فعال یا ناظر · با لینک دعوت
            </p>
          </div>
          <InviteMembersButton
            spaceId={space.id}
            spaceName={space.name}
            members={inviteMembers}
            currentUserRole={myRole}
            variant="inline"
            inviteRolePicker
            spaceType={space.type}
            maxMembers={template.maxMembers}
          />
        </div>
      ) : null}
    </>
  );
}
