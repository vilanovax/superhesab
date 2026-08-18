import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listCategoryBudgets } from "@/app/actions/categoryBudget";
import { listCategoryPolicies } from "@/app/actions/categoryPrivacy";
import {
  getChargePlanForYear,
} from "@/app/actions/building";
import { listBuildingCategoryScopes } from "@/app/actions/buildingCategoryScope";
import { listBuildingShareLinks } from "@/app/actions/building-share";
import { listRecurringRules } from "@/app/actions/recurring";
import { updateSpaceSettingsAndRedirect } from "@/app/actions/space";
import { BuildingCategoryScopeSettings } from "@/components/spaces/building-category-scope-settings";
import { BuildingSettingsForm } from "@/components/spaces/building-settings-form";
import { BuildingShareSettings } from "@/components/spaces/building-share-settings";
import { CategoryBudgetSettings } from "@/components/spaces/category-budget-settings";
import { CategoryPrivacySettings } from "@/components/spaces/category-privacy-settings";
import { FundPlanSettings } from "@/components/spaces/fund-plan-settings";
import { InviteMembersButton } from "@/components/spaces/invite-members-button";
import { RecurringSettings } from "@/components/spaces/recurring-settings";
import { SpaceSettingsSubmitButton } from "@/components/spaces/space-settings-submit";
import { SpaceTheme } from "@/components/spaces/space-theme";
import { FundSettingsForm } from "@/components/spaces/fund-settings-form";
import { PartnerSettingsForm } from "@/components/spaces/partner-settings-form";
import { TripSettingsForm } from "@/components/spaces/trip-settings-form";
import { SpaceArchiveButton } from "@/components/spaces/space-card-actions";
import { SpaceBackupButton } from "@/components/settings/backup-panels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/ui/user-avatar";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { tehranCivilYear } from "@/lib/building";
import {
  CURRENCY_LABELS,
  memberLabel,
  type SpaceCurrency,
} from "@/lib/format";
import { prisma } from "@/lib/db/prisma";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { canMutateMoney } from "@/lib/rbac";
import {
  getTemplate,
  getTemplateDataset,
} from "@/lib/templates/registry";
import type { SpaceRole } from "@/types";

type SettingsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function SpaceSettingsPage({
  params,
  searchParams,
}: SettingsPageProps) {
  const [{ id }, sp, session] = await Promise.all([
    params,
    searchParams,
    requireUser(),
  ]);
  const { error } = sp;
  const membership = await requireSpaceMember(id, session.userId);

  if (!membership) {
    notFound();
  }

  if (
    getTemplate(membership.space.type).features.fundRotating &&
    membership.role === "VIEWER"
  ) {
    redirect(`/spaces/${id}/member`);
  }

  /** Cached membership.space already has settings fields — skip extra findUnique. */
  const space = membership.space;

  const template = getTemplate(space.type);
  const templateDataset = getTemplateDataset(space.type);
  const isOwner = membership.role === "OWNER";
  const canManageBuilding = canMutateMoney(membership.role);
  const showBudget = template.features.budget && !template.features.buildingCharges;
  const showCategoryBudgets = template.features.categoryBudgets;
  const categoryPrivacyPossible = Boolean(template.features.categoryPrivacy);
  const showRecurring = template.features.recurring;
  const showBuilding = template.features.buildingCharges;
  const showFundPlan = Boolean(template.features.fundRotating);
  const showRoundUp = !showBudget && !showBuilding && !showFundPlan;
  const currentJalali = tehranCivilYear();
  const planYear = space.defaultPlanYear ?? currentJalali;

  const [
    categoryPrivacyEnabled,
    categoryBudgets,
    recurringRules,
    buildingPlan,
    fundPlan,
    buildingManagers,
    tripMembers,
    buildingUnits,
    buildingCategoryScopes,
    buildingShareLinks,
  ] = await Promise.all([
    categoryPrivacyPossible
      ? isFeatureEnabled("category_privacy")
      : Promise.resolve(false),
    showCategoryBudgets ? listCategoryBudgets(id) : Promise.resolve([]),
    showRecurring ? listRecurringRules(id) : Promise.resolve([]),
    showBuilding ? getChargePlanForYear(id, planYear) : Promise.resolve(null),
    showFundPlan
      ? prisma.fundPlan.findUnique({
          where: { spaceId: id },
          select: { shareAmount: true, periodCount: true },
        })
      : Promise.resolve(null),
    showBuilding
      ? prisma.spaceMember.findMany({
          where: {
            spaceId: id,
            role: { in: ["OWNER", "EDITOR"] },
          },
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
        })
      : Promise.resolve([]),
    showRoundUp
      ? prisma.spaceMember.findMany({
          where: { spaceId: id },
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
        })
      : Promise.resolve([]),
    showBuilding
      ? prisma.unit.findMany({
          where: { spaceId: id, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    showBuilding && isOwner
      ? listBuildingCategoryScopes(id)
      : Promise.resolve([]),
    showBuilding && canManageBuilding
      ? listBuildingShareLinks(id)
      : Promise.resolve([]),
  ]);

  const showCategoryPrivacy =
    categoryPrivacyPossible && categoryPrivacyEnabled;
  const categoryPolicies = showCategoryPrivacy
    ? await listCategoryPolicies(id)
    : [];

  const managerInviteRows = buildingManagers.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    phone: m.user.phone,
    avatarUrl: m.user.avatarUrl,
    role: m.role as SpaceRole,
    isVirtual: m.user.isVirtual,
    defaultShare: m.defaultShare,
  }));

  const tripInviteRows = tripMembers.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    phone: m.user.phone,
    avatarUrl: m.user.avatarUrl,
    role: m.role as SpaceRole,
    isVirtual: m.user.isVirtual,
    defaultShare: m.defaultShare,
  }));

  const isPartnerSpace = space.type === "PARTNER";
  const isFundSpace = space.type === "FUND";
  const slimHeader = showBuilding || showRoundUp || isFundSpace;

  const roleLabel =
    membership.role === "OWNER"
      ? "مالک"
      : membership.role === "EDITOR"
        ? isFundSpace
          ? "فعال"
          : "ویرایشگر"
        : membership.role === "VIEWER"
          ? "ناظر"
          : membership.role;

  const atPartnerCap =
    isPartnerSpace &&
    template.maxMembers != null &&
    tripInviteRows.length >= template.maxMembers;

  const denseSettings = isPartnerSpace || isFundSpace;

  return (
    <main
      data-template={templateDataset}
      className={
        denseSettings
          ? "mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col gap-3.5 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-6"
          : "mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col gap-5 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:px-6"
      }
    >
      <SpaceTheme type={space.type} />
      <div className="flex items-center justify-between gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-9 gap-1 rounded-full border border-border/55 bg-card px-3 text-sm font-medium shadow-none"
        >
          <Link href={`/spaces/${space.id}`}>← بازگشت</Link>
        </Button>
        <span className="rounded-full bg-primary/10 px-3 py-1.5 text-caption font-semibold text-primary">
          تنظیمات · {template.label}
        </span>
      </div>

      <header
        className={
          slimHeader
            ? "animate-fade-up space-y-0.5 px-0.5"
            : "surface-hero animate-fade-up relative overflow-hidden rounded-3xl px-5 py-5 shadow-md"
        }
      >
        {showBuilding ? (
          <>
            <p className="text-micro font-semibold tracking-[0.06em] text-muted-foreground">
              تنظیمات ساختمان
            </p>
            <h1 className="text-pretty text-[1.45rem] font-bold leading-tight tracking-tight text-foreground">
              {space.name}
            </h1>
            <p className="text-caption text-muted-foreground">
              نام، سال مالی، پایه شارژ و مدیران.
            </p>
          </>
        ) : isPartnerSpace ? (
          <>
            <h1 className="text-pretty text-xl font-bold leading-tight tracking-tight text-foreground">
              {space.name}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              نام، واحد پول و طرف مقابل
            </p>
          </>
        ) : isFundSpace ? (
          <>
            <h1 className="text-pretty text-xl font-bold leading-tight tracking-tight text-foreground">
              {space.name}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              نام، واحد پول و پلن دوره‌ها
            </p>
          </>
        ) : showRoundUp ? (
          <>
            <p className="text-micro font-semibold tracking-[0.06em] text-muted-foreground">
              تنظیمات سفر
            </p>
            <h1 className="text-pretty text-[1.45rem] font-bold leading-tight tracking-tight text-foreground">
              {space.name}
            </h1>
            <p className="text-caption text-muted-foreground">
              نام، واحد پول، رند و اعضا
            </p>
          </>
        ) : (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute -end-10 -top-12 size-32 rounded-full bg-on-hero/12 blur-3xl"
            />
            <div className="relative">
              <p className="text-caption font-medium text-on-hero/70">
                تنظیمات فضا
              </p>
              <h1 className="mt-1 text-pretty text-2xl font-bold text-on-hero">
                {space.name}
              </h1>
              <p className="mt-2 text-sm text-on-hero/75">
                {showFundPlan
                  ? "نام، واحد پول و پلن سهم / دوره‌های صندوق."
                  : showBudget
                    ? showCategoryBudgets || showRecurring
                      ? "نام، بودجه ماهانه، سقف دسته و تراکنش‌های تکرارپذیر."
                      : "نام، واحد پول و سقف بودجه ماهانه این حساب شخصی."
                    : "نام، واحد پول و نحوه نمایش مبالغ این پروژه را مدیریت کنید."}
              </p>
            </div>
          </>
        )}
      </header>

      <section
        className={
          denseSettings
            ? "animate-fade-up rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm sm:p-4"
            : slimHeader
              ? "animate-fade-up rounded-2xl border border-border/55 bg-card p-4 shadow-sm sm:p-5"
              : "animate-fade-up space-y-4 rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur-sm"
        }
      >
        {showBuilding ? (
          <>
            <Link
              href={`/spaces/${space.id}/contacts`}
              className="mb-3 flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-3.5 py-3 transition-colors hover:bg-muted/50"
            >
              <span className="min-w-0 flex-1 text-start">
                <span className="block text-body-sm font-semibold text-foreground">
                  شماره‌های ضروری
                </span>
                <span className="mt-0.5 block text-caption text-muted-foreground">
                  آتش‌نشانی، نگهبانی، پیمانکار و …
                </span>
              </span>
              <span className="text-muted-foreground" aria-hidden>
                ←
              </span>
            </Link>
            <BuildingSettingsForm
              spaceId={space.id}
              initialName={space.name}
              currency={space.currency}
              planYear={planYear}
              baseCharge={buildingPlan?.baseCharge ?? 0}
              templateLabel={template.label}
              roleLabel={roleLabel}
              disabled={!isOwner}
              error={error}
            />
          </>
        ) : isPartnerSpace ? (
          <PartnerSettingsForm
            spaceId={space.id}
            initialName={space.name}
            currency={space.currency}
            roundUpToThousand={space.roundUpToThousand}
            roleLabel={roleLabel}
            disabled={!isOwner}
            error={error}
          />
        ) : isFundSpace ? (
          <FundSettingsForm
            spaceId={space.id}
            initialName={space.name}
            currency={space.currency}
            roleLabel={roleLabel}
            disabled={!isOwner}
            error={error}
          />
        ) : showRoundUp ? (
          <TripSettingsForm
            spaceId={space.id}
            initialName={space.name}
            currency={space.currency}
            roundUpToThousand={space.roundUpToThousand}
            templateLabel={template.label}
            roleLabel={roleLabel}
            spaceKind="trip"
            disabled={!isOwner}
            error={error}
          />
        ) : (
          <form action={updateSpaceSettingsAndRedirect} className="space-y-4">
            <input type="hidden" name="spaceId" value={space.id} />

            <div className="space-y-2">
              <Label htmlFor="name">نام فضا</Label>
              <Input
                id="name"
                name="name"
                autoComplete="organization"
                required
                minLength={2}
                defaultValue={space.name}
                disabled={!isOwner}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">واحد پول</Label>
              <select
                id="currency"
                name="currency"
                defaultValue={space.currency}
                disabled={!isOwner}
                className="flex h-12 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60"
              >
                {(Object.keys(CURRENCY_LABELS) as SpaceCurrency[]).map(
                  (code) => (
                    <option key={code} value={code}>
                      {CURRENCY_LABELS[code]}
                    </option>
                  ),
                )}
              </select>
              <p className="text-xs text-muted-foreground">
                کنار مبالغ نمایش داده می‌شود.
              </p>
            </div>

            {showBudget ? (
              <div className="space-y-2">
                <Label htmlFor="monthlyBudget">سقف بودجه ماهانه</Label>
                <Input
                  id="monthlyBudget"
                  name="monthlyBudget"
                  type="number"
                  inputMode="numeric"
                  autoComplete="off"
                  min={0}
                  step={1}
                  defaultValue={space.monthlyBudget ?? ""}
                  placeholder="مثلاً ۵۰۰۰۰۰۰…"
                  disabled={!isOwner}
                  className="rounded-xl tabular-nums"
                />
                <p className="text-xs text-muted-foreground">
                  خالی = بدون نوار بودجه در داشبورد.
                </p>
              </div>
            ) : null}

            {showBudget ? (
              <input type="hidden" name="roundUpToThousand" value="" />
            ) : (
              <>
                <input type="hidden" name="monthlyBudget" value="" />
                <input type="hidden" name="roundUpToThousand" value="" />
              </>
            )}
            <input type="hidden" name="defaultPlanYear" value="" />

            <div className="rounded-xl bg-muted/70 px-3 py-2.5 text-xs text-muted-foreground">
              قالب:{" "}
              <span className="font-medium text-foreground">
                {template.label}
              </span>
              {" · "}
              نقش شما:{" "}
              <span className="font-medium text-foreground">{roleLabel}</span>
            </div>

            {error ? (
              <p
                className="text-sm text-destructive"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </p>
            ) : null}

            {!isOwner ? (
              <p className="text-sm text-muted-foreground">
                فقط مالک فضا می‌تواند تنظیمات را ذخیره کند.
              </p>
            ) : (
              <SpaceSettingsSubmitButton />
            )}
          </form>
        )}
      </section>

      {showBuilding && isOwner ? (
        <section className="animate-fade-up space-y-3.5 rounded-2xl border border-border/55 bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-caption font-bold text-foreground">
                مدیران ساختمان
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {managerInviteRows.length.toLocaleString("fa-IR")} مدیر · ساکن‌ها
                از لینک واحد دعوت می‌شوند
              </p>
            </div>
            {managerInviteRows.length > 0 ? (
              <div className="flex shrink-0 -space-x-2 space-x-reverse">
                {managerInviteRows.slice(0, 4).map((m) => (
                  <UserAvatar
                    key={m.userId}
                    phone={m.phone}
                    name={m.name}
                    avatarUrl={m.avatarUrl}
                    size={32}
                    className="ring-2 ring-card"
                  />
                ))}
              </div>
            ) : null}
          </div>
          {managerInviteRows.length > 0 ? (
            <ul className="divide-y divide-border/35 rounded-xl border border-border/40 bg-muted/20">
              {managerInviteRows.slice(0, 3).map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center gap-2.5 px-3 py-2"
                >
                  <UserAvatar
                    phone={m.phone}
                    name={m.name}
                    avatarUrl={m.avatarUrl}
                    size={32}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-caption font-semibold text-foreground">
                      {m.name?.trim() || m.phone}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {m.role === "OWNER" ? "مالک" : "مدیر"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <InviteMembersButton
            spaceId={space.id}
            spaceName={space.name}
            members={managerInviteRows}
            currentUserRole={membership.role}
            spaceType={space.type}
            trigger={
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl border-border/70 font-semibold active:scale-[0.98]"
              >
                مدیریت مدیران
              </Button>
            }
          />
        </section>
      ) : null}

      {showBuilding && canManageBuilding ? (
        <BuildingShareSettings
          spaceId={space.id}
          initialLinks={buildingShareLinks}
          disabled={!canManageBuilding}
        />
      ) : null}

      {showBuilding && isOwner ? (
        <section className="animate-fade-up rounded-2xl border border-border/55 bg-card p-4 shadow-sm sm:p-5">
          <BuildingCategoryScopeSettings
            spaceId={space.id}
            initialScopes={buildingCategoryScopes}
            units={buildingUnits}
            disabled={!isOwner}
          />
        </section>
      ) : null}

      {showRoundUp ? (
        <section
          className={
            isPartnerSpace
              ? "animate-fade-up space-y-2.5 rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm sm:p-4"
              : "animate-fade-up space-y-3 rounded-2xl border border-border/55 bg-card p-4 shadow-sm sm:p-5"
          }
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-caption font-bold text-foreground">
              {isPartnerSpace ? "طرفین حساب" : "اعضای سفر"}
            </h2>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {isPartnerSpace && atPartnerCap
                ? "کامل · ۲ نفر"
                : `${tripInviteRows.length.toLocaleString("fa-IR")} نفر${
                    template.maxMembers != null
                      ? ` / ${template.maxMembers.toLocaleString("fa-IR")}`
                      : ""
                  }`}
            </p>
          </div>

          {tripInviteRows.length > 0 ? (
            <ul
              className={
                isPartnerSpace
                  ? "divide-y divide-border/30"
                  : "divide-y divide-border/35 overflow-hidden rounded-xl border border-border/40"
              }
            >
              {tripInviteRows.map((m) => (
                <li
                  key={m.userId}
                  className={
                    isPartnerSpace
                      ? "flex items-center gap-2.5 py-2 first:pt-0.5 last:pb-0.5"
                      : "flex items-center gap-2.5 px-3 py-2"
                  }
                >
                  <UserAvatar
                    phone={m.phone}
                    name={m.name}
                    avatarUrl={m.avatarUrl}
                    size={isPartnerSpace ? 28 : 32}
                    className={isPartnerSpace ? "size-7" : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-caption font-semibold text-foreground">
                      {memberLabel(m)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {m.role === "OWNER"
                        ? "مالک"
                        : m.role === "EDITOR"
                          ? isPartnerSpace
                            ? "طرف مقابل"
                            : "ویرایشگر"
                          : "ناظر"}
                      {m.isVirtual ? " · بدون اپ" : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-border/50 px-3 py-4 text-center text-caption text-muted-foreground">
              هنوز عضوی نیست
            </p>
          )}

          {isPartnerSpace && tripInviteRows.length < 2 ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              یک نفر دیگر دعوت کنید تا حساب دونفره کامل شود.
            </p>
          ) : null}

          {isOwner ? (
            <InviteMembersButton
              spaceId={space.id}
              spaceName={space.name}
              members={tripInviteRows}
              currentUserRole={membership.role}
              spaceType={space.type}
              maxMembers={template.maxMembers}
              trigger={
                <Button
                  type="button"
                  variant={isPartnerSpace ? "outline" : "default"}
                  className="h-11 w-full rounded-xl border-border/70 font-semibold active:scale-[0.98]"
                >
                  مدیریت اعضا
                </Button>
              }
            />
          ) : (
            <p className="text-center text-[11px] text-muted-foreground">
              فقط مالک می‌تواند عضو اضافه یا نقش عوض کند.
            </p>
          )}
        </section>
      ) : null}

      {showFundPlan ? (
        <section className="animate-fade-up rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm sm:p-4">
          <FundPlanSettings
            spaceId={space.id}
            currency={space.currency}
            initialShareAmount={fundPlan?.shareAmount ?? null}
            initialPeriodCount={fundPlan?.periodCount ?? null}
            disabled={!isOwner}
          />
        </section>
      ) : null}

      {showCategoryPrivacy ? (
        <section className="animate-fade-up space-y-4 rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur-sm">
          <CategoryPrivacySettings
            spaceId={space.id}
            initial={categoryPolicies}
            currentUserId={session.userId}
            disabled={membership.role === "VIEWER"}
          />
        </section>
      ) : null}

      {showCategoryBudgets ? (
        <section className="animate-fade-up space-y-4 rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur-sm">
          <CategoryBudgetSettings
            spaceId={space.id}
            initial={categoryBudgets}
            disabled={!isOwner}
          />
        </section>
      ) : null}

      {showRecurring ? (
        <section className="animate-fade-up space-y-4 rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur-sm">
          <RecurringSettings
            spaceId={space.id}
            initial={recurringRules}
            currency={space.currency}
            disabled={!isOwner}
          />
        </section>
      ) : null}

      {isOwner ? (
        <div className="animate-fade-up">
          <SpaceBackupButton spaceId={space.id} spaceName={space.name} />
        </div>
      ) : null}

      {isOwner ? (
        <div className="animate-fade-up">
          <SpaceArchiveButton
            spaceId={space.id}
            spaceName={space.name}
            variant="panel"
          />
        </div>
      ) : null}
    </main>
  );
}
