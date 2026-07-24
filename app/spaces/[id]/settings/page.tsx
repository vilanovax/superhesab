import Link from "next/link";
import { notFound } from "next/navigation";
import { updateSpaceSettingsAndRedirect } from "@/app/actions/space";
import { SpaceTheme } from "@/components/spaces/space-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
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
      ownerId: true,
    },
  });

  if (!space) {
    notFound();
  }

  const template = getTemplate(space.type);
  const templateDataset = getTemplateDataset(space.type);
  const isOwner = membership.role === "OWNER";
  const showBudget = template.features.budget;

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
          {showBudget
            ? "نام، واحد پول و سقف بودجه ماهانه این حساب شخصی."
            : "نام، واحد پول و نحوه نمایش مبالغ این پروژه را مدیریت کنید."}
        </p>
      </header>

      <section className="animate-fade-up space-y-4 rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur-sm">
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
              {(Object.keys(CURRENCY_LABELS) as SpaceCurrency[]).map((code) => (
                <option key={code} value={code}>
                  {CURRENCY_LABELS[code]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              این واحد کنار «مبلغ کل» و مبالغ نمایش داده می‌شود.
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
                خالی بگذارید تا نوار بودجه در داشبورد نمایش داده نشود.
              </p>
            </div>
          ) : (
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
                  هزار رند می‌شود (مثلاً ۲۹۶٬۶۶۶ → ۲۹۷٬۰۰۰) تا پرداخت نقدی
                  ساده‌تر باشد.
                </span>
              </span>
            </label>
          )}

          {showBudget ? (
            <input type="hidden" name="roundUpToThousand" value="" />
          ) : (
            <input type="hidden" name="monthlyBudget" value="" />
          )}

          <div className="rounded-xl bg-muted/70 px-3 py-2.5 text-xs text-muted-foreground">
            قالب:{" "}
            <span className="font-medium text-foreground">{template.label}</span>
            {" · "}
            نقش شما:{" "}
            <span className="font-medium text-foreground">
              {membership.role}
            </span>
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
      </section>
    </main>
  );
}
