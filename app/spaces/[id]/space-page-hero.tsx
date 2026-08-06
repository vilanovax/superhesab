import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BuildingBoardNavButton } from "@/components/spaces/building-board-nav-button";
import { CopyInviteLinkButton } from "@/components/spaces/copy-invite-link-button";
import { InviteMembersButton } from "@/components/spaces/invite-members-button";
import { BuildingMonthHero } from "@/components/spaces/building-dashboard";
import { PersonalMonthHero } from "@/components/spaces/personal-dashboard";
import { ShareSummaryIconButton } from "@/components/spaces/share-summary-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
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
  loadShareExpenseLines,
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
      className="size-10 shrink-0 animate-pulse rounded-2xl bg-muted"
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
    <div className="mb-4 flex items-center gap-2">
      <Link
        href="/app"
        className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-full border border-border/55 bg-card px-3 text-caption font-semibold text-foreground shadow-sm transition-colors duration-150 hover:border-primary/25 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BackChevron className="size-4 text-muted-foreground" />
        بازگشت
      </Link>

      {showTypedPill ? (
        <div className="ms-auto flex items-center gap-1.5">
          <span className="rounded-full bg-primary/10 px-2.5 py-1.5 text-caption font-semibold text-primary ring-1 ring-primary/15">
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
          <Button
            asChild
            variant="outline"
            size="icon"
            className="size-10 shrink-0 cursor-pointer rounded-2xl border-border/55 bg-card shadow-sm"
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
              <HeroShareButton ctxPromise={ctxPromise} />
            </Suspense>
          ) : null}
          <Button
            asChild
            variant="outline"
            size="icon"
            className="size-10 shrink-0 cursor-pointer rounded-2xl border-border/55 bg-card shadow-sm"
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
  ctxPromise,
}: {
  spaceId: string;
  ctxPromise: Promise<SpacePageCtx>;
}) {
  await ctxPromise;
  const badgeCount = await loadOpenBoardCount(spaceId);
  return (
    <BuildingBoardNavButton spaceId={spaceId} badgeCount={badgeCount} />
  );
}

async function HeroShareButton({
  ctxPromise,
}: {
  ctxPromise: Promise<SpacePageCtx>;
}) {
  const ctx = await ctxPromise;
  const { id, session, features, hiddenCategoriesKey } = ctx;
  if (!features.settlements) return null;

  const [space, balanceData, shareExpenses] = await Promise.all([
    loadSpaceWithMembers(id),
    loadCachedBalances(id),
    loadShareExpenseLines(id, hiddenCategoriesKey),
  ]);
  if (!space) return null;

  const members = space.members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    phone: m.user.phone,
    isVirtual: m.user.isVirtual,
    defaultShare: m.defaultShare,
  }));

  return (
    <ShareSummaryIconButton
      spaceName={space.name}
      expenses={shareExpenses}
      members={members}
      suggestions={balanceData.suggestions}
      currentUserId={session.userId}
      currency={space.currency}
      roundUpToThousand={space.roundUpToThousand}
    />
  );
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
    isFamilyShell && space.members.length < 2 && isOwner;

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
                    {space.members.length} عضو · {expenseCount} هزینه
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

          {isBuildingShell || isFundShell ? null : isPersonalShell ||
            isFamilyShell ? (
            <PersonalMonthHero
              income={monthIncome}
              expenses={monthExpense}
              monthlyBudget={space.monthlyBudget}
              currency={space.currency}
              settingsHref={`/spaces/${space.id}/settings`}
            />
          ) : isPartner ? (
            <div className="rounded-2xl bg-on-hero/10 px-3.5 py-3 ring-1 ring-on-hero/10">
              <p className="text-caption font-medium text-on-hero/70">مانده شما</p>
              <p className="mt-1.5 text-lg font-bold tabular-nums text-on-hero">
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
        <div className="animate-fade-up mb-4 rounded-2xl border border-primary/20 bg-card px-4 py-5 text-center shadow-sm">
          <p className="text-body font-semibold text-foreground">
            اعضای خانواده را دعوت کنید
          </p>
          <p className="mt-1.5 text-body-sm leading-relaxed text-muted-foreground">
            با لینک دعوت می‌توانید همسر یا اعضا را به‌عنوان عضو فعال یا ناظر اضافه
            کنید.
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
    </>
  );
}
