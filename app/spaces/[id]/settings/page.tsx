import Link from "next/link";
import { notFound } from "next/navigation";
import { listCategoryBudgets } from "@/app/actions/categoryBudget";
import {
  getChargePlanForYear,
} from "@/app/actions/building";
import { listRecurringRules } from "@/app/actions/recurring";
import { updateSpaceSettingsAndRedirect } from "@/app/actions/space";
import { BuildingSettingsForm } from "@/components/spaces/building-settings-form";
import { CategoryBudgetSettings } from "@/components/spaces/category-budget-settings";
import { FundPlanSettings } from "@/components/spaces/fund-plan-settings";
import { RecurringSettings } from "@/components/spaces/recurring-settings";
import { SpaceTheme } from "@/components/spaces/space-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { tehranCivilYear } from "@/lib/building";
import { CURRENCY_LABELS, type SpaceCurrency } from "@/lib/format";
import { prisma } from "@/lib/db/prisma";
import {
  getTemplate,
  getTemplateDataset,
} from "@/lib/templates/registry";

type SettingsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function SpaceSettingsPage({
  params,
  searchParams,
}: SettingsPageProps) {
  const { id } = await params;
  const { error } = await searchParams;
  const session = await requireUser();
  const membership = await requireSpaceMember(id, session.userId);

  if (!membership) {
    notFound();
  }

  const space = await prisma.space.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      type: true,
      currency: true,
      roundUpToThousand: true,
      monthlyBudget: true,
      defaultPlanYear: true,
      ownerId: true,
    },
  });

  if (!space) {
    notFound();
  }

  const template = getTemplate(space.type);
  const templateDataset = getTemplateDataset(space.type);
  const isOwner = membership.role === "OWNER";
  const showBudget = template.features.budget && !template.features.buildingCharges;
  const showCategoryBudgets = template.features.categoryBudgets;
  const showRecurring = template.features.recurring;
  const showBuilding = template.features.buildingCharges;
  const showFundPlan = Boolean(template.features.fundRotating);
  const showRoundUp = !showBudget && !showBuilding && !showFundPlan;
  const currentJalali = tehranCivilYear();
  const planYear = space.defaultPlanYear ?? currentJalali;

  const [categoryBudgets, recurringRules, buildingPlan, fundPlan] =
    await Promise.all([
      showCategoryBudgets ? listCategoryBudgets(id) : Promise.resolve([]),
      showRecurring ? listRecurringRules(id) : Promise.resolve([]),
      showBuilding ? getChargePlanForYear(id, planYear) : Promise.resolve(null),
      showFundPlan
        ? prisma.fundPlan.findUnique({
            where: { spaceId: id },
            select: { shareAmount: true, periodCount: true },
          })
        : Promise.resolve(null),
    ]);

  const roleLabel =
    membership.role === "OWNER"
      ? "مالک"
      : membership.role === "EDITOR"
        ? "ویرایشگر"
        : membership.role;

  return (
    <main
      data-template={templateDataset}
      className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6 sm:px-6"
    >
      <SpaceTheme type={space.type} />
      <div className="flex items-center justify-between gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-xl bg-card/50 px-3 backdrop-blur-sm"
        >
          <Link href={`/spaces/${space.id}`}>← بازگشت</Link>
        </Button>
        <span className="rounded-xl bg-ink/90 px-3 py-1.5 text-xs font-medium text-primary-foreground">
          تنظیمات · {template.label}
        </span>
      </div>

      <header className="surface-hero animate-fade-up rounded-2xl p-5">
        <p className="text-xs font-medium text-on-hero/70">تنظیمات فضا</p>
        <h1 className="mt-1 text-2xl font-bold text-on-hero">{space.name}</h1>
        <p className="mt-2 text-sm text-on-hero/75">
          {showBuilding
            ? "نام، سال مالی و پایه ماهانه شارژ."
            : showFundPlan
              ? "نام، واحد پول و پلن سهم / دوره‌های صندوق."
              : showBudget
                ? showCategoryBudgets || showRecurring
                  ? "نام، بودجه ماهانه، سقف دسته و تراکنش‌های تکرارپذیر."
                  : "نام، واحد پول و سقف بودجه ماهانه این حساب شخصی."
                : "نام، واحد پول و نحوه نمایش مبالغ این پروژه را مدیریت کنید."}
        </p>
      </header>

      <section className="animate-fade-up space-y-4 rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur-sm">
        {showBuilding ? (
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
        ) : (
          <form action={updateSpaceSettingsAndRedirect} className="space-y-4">
            <input type="hidden" name="spaceId" value={space.id} />

            <div className="space-y-2">
              <Label htmlFor="name">نام فضا</Label>
              <Input
                id="name"
                name="name"
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
                  min={0}
                  step={1}
                  defaultValue={space.monthlyBudget ?? ""}
                  placeholder="مثلاً ۵۰۰۰۰۰۰"
                  disabled={!isOwner}
                  className="rounded-xl tabular-nums"
                />
                <p className="text-xs text-muted-foreground">
                  خالی = بدون نوار بودجه در داشبورد.
                </p>
              </div>
            ) : showRoundUp ? (
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-sheet-muted px-3.5 py-3.5 ${!isOwner ? "opacity-60" : ""}`}
              >
                <input
                  type="checkbox"
                  name="roundUpToThousand"
                  defaultChecked={space.roundUpToThousand}
                  disabled={!isOwner}
                  className="mt-0.5 size-5 shrink-0 rounded-md border border-input accent-[var(--primary)]"
                />
                <span className="min-w-0 space-y-1">
                  <span className="block text-body-sm font-semibold text-foreground">
                    رند کردن مبالغ به هزار
                  </span>
                  <span className="block text-label leading-relaxed text-muted-foreground">
                    در تب ترازها، مانده و پیشنهاد تسویه به سمت بالا به نزدیک‌ترین
                    هزار رند می‌شود.
                  </span>
                </span>
              </label>
            ) : null}

            {showBudget ? (
              <input type="hidden" name="roundUpToThousand" value="" />
            ) : (
              <>
                <input type="hidden" name="monthlyBudget" value="" />
                {!showRoundUp ? (
                  <input type="hidden" name="roundUpToThousand" value="" />
                ) : null}
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
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            {!isOwner ? (
              <p className="text-sm text-muted-foreground">
                فقط مالک فضا می‌تواند تنظیمات را ذخیره کند.
              </p>
            ) : (
              <Button type="submit" className="h-12 w-full rounded-xl">
                ذخیره تنظیمات
              </Button>
            )}
          </form>
        )}
      </section>

      {showFundPlan ? (
        <section className="animate-fade-up space-y-4 rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur-sm">
          <FundPlanSettings
            spaceId={space.id}
            currency={space.currency}
            initialShareAmount={fundPlan?.shareAmount ?? null}
            initialPeriodCount={fundPlan?.periodCount ?? null}
            disabled={!isOwner}
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
    </main>
  );
}
