import Link from "next/link";
import { redirect } from "next/navigation";
import { listDueSoonDebtsForUser } from "@/app/actions/debt";
import { CreateSpaceSheet } from "@/components/spaces/create-space-sheet";
import { HomeEmptyActions } from "@/components/spaces/home-empty-actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/guards";
import { debtTypeLabel } from "@/lib/debts";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/formatters";
import { getTemplate } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";

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

function roleLabel(role: string) {
  if (role === "OWNER") return "مالک";
  if (role === "VIEWER") return "ناظر";
  return "ویرایشگر";
}

function Chevron({ className }: { className?: string }) {
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
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export default async function AppHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireUser();
  const { error } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, phone: true, name: true, avatarUrl: true },
  });

  if (!user) {
    // requireUser already clears stale sessions; belt-and-suspenders
    redirect("/login");
  }

  const memberships = await prisma.spaceMember.findMany({
    where: { userId: session.userId },
    include: {
      space: {
        select: {
          id: true,
          name: true,
          type: true,
          currency: true,
          _count: { select: { expenses: true, members: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const dueSoonDebts = await listDueSoonDebtsForUser(session.userId);

  const displayName = user.name?.trim() || user.phone;
  const spaceCount = memberships.length;

  const currencyBySpace = Object.fromEntries(
    memberships.map((m) => [m.space.id, m.space.currency]),
  );

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-5">
      {/* Slim identity bar */}
      <div className="mb-3 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            user.avatarUrl ??
            `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(user.phone)}`
          }
          alt=""
          width={36}
          height={36}
          className="size-9 rounded-full ring-2 ring-white/80"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-semibold text-foreground">
            سلام، {displayName}
          </p>
          <p className="text-caption text-muted-foreground">
            {spaceCount === 0 ? "دفترت خالی است" : `${spaceCount} دفتر فعال`}
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          size="icon"
          className="size-9 shrink-0 rounded-xl border-border/70 bg-card shadow-sm"
          aria-label="تنظیمات اپ"
        >
          <Link href="/app/settings">
            <SettingsIcon className="size-4" />
          </Link>
        </Button>
      </div>

      {dueSoonDebts.length > 0 ? (
        <div className="animate-fade-up mb-4 rounded-2xl border border-destructive/25 bg-destructive-soft px-4 py-3">
          <p className="text-body-sm font-semibold text-destructive">
            سررسید بدهی / طلب
          </p>
          <ul className="mt-2 space-y-2">
            {dueSoonDebts.slice(0, 4).map((d) => (
              <li key={d.debtId}>
                <Link
                  href={`/spaces/${d.spaceId}`}
                  className="flex items-center justify-between gap-2 rounded-xl bg-card/60 px-3 py-2 text-caption transition-colors hover:bg-card"
                >
                  <span className="min-w-0 truncate text-foreground">
                    {debtTypeLabel(d.type)} «{d.counterparty}» · {d.spaceName}
                    {" · "}
                    {d.daysLeft < 0
                      ? `${Math.abs(d.daysLeft)} روز گذشته`
                      : d.daysLeft === 0
                        ? "امروز"
                        : `${d.daysLeft} روز مانده`}
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-destructive">
                    {formatCurrency(
                      d.remaining,
                      currencyBySpace[d.spaceId] ?? "TOMAN",
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Full-bleed brand thesis — not a form */}
      <header className="surface-hero animate-fade-up relative mb-6 overflow-hidden rounded-[1.35rem] px-5 pb-5 pt-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(var(--on-hero-soft) 1px, transparent 1px), linear-gradient(90deg, var(--on-hero-soft) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage:
              "radial-gradient(ellipse at 70% 20%, black 20%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-e-10 -top-16 size-44 rounded-full bg-on-hero/10 blur-3xl"
        />
        <div className="relative space-y-4">
          <div className="space-y-1.5">
            <p className="text-caption font-medium tracking-[0.14em] text-on-hero/55">
              دفتر سفر
            </p>
            <h1 className="text-display font-bold tracking-tight text-on-hero">
              SuperHesab
            </h1>
            <p className="max-w-[17rem] text-body-sm leading-relaxed text-on-hero/78">
              خرج‌ها را با هم ثبت کن؛ تراز و تسویه خودش سر جایش می‌نشیند.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-on-hero-soft px-2.5 py-1 text-caption font-medium text-on-hero/85">
              سفر
            </span>
            <span className="rounded-lg bg-on-hero-soft px-2.5 py-1 text-caption font-medium text-on-hero/85">
              دورهمی
            </span>
            <span className="rounded-lg bg-on-hero-soft px-2.5 py-1 text-caption font-medium text-on-hero/85">
              دونفره
            </span>
          </div>
        </div>
      </header>

      {/* Spaces list is the product */}
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">
              فضاهای من
            </h2>
            <p className="mt-0.5 text-caption text-muted-foreground">
              دفاتر مشترک حساب‌وکتاب
            </p>
          </div>
        </div>

        {memberships.length === 0 ? (
          <EmptyState
            icon="space"
            title="هیچ حساب و کتابی ندارید"
            description="سفر گروهی، حساب مشترک دونفره، یا حسابداری شخصی بسازید."
            className="flex-1 justify-center"
            actionNode={<HomeEmptyActions error={error} />}
          />
        ) : (
          <ul className="space-y-2.5">
            {memberships.map(({ space, role }, index) => {
              const template = getTemplate(space.type);
              const mark =
                space.type === "TRIP"
                  ? "سفر"
                  : space.type === "PARTNER"
                    ? "۲نفر"
                    : space.type === "FAMILY"
                      ? "خانه"
                      : "من";
              const accent =
                space.type === "TRIP"
                  ? "bg-primary"
                  : space.type === "PARTNER"
                    ? "bg-highlight"
                    : space.type === "FAMILY"
                      ? "bg-ink"
                      : "bg-success";
              const chip =
                space.type === "TRIP"
                  ? "bg-secondary text-primary"
                  : space.type === "PARTNER"
                    ? "bg-accent text-ink"
                    : space.type === "FAMILY"
                      ? "bg-secondary text-primary"
                      : "bg-success-soft text-success";
              return (
                <li
                  key={space.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
                >
                  <Link
                    href={`/spaces/${space.id}`}
                    className={cn(
                      "group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border/55 bg-card px-3.5 py-3.5",
                      "transition-[transform,box-shadow,border-color] duration-150 ease-out",
                      "hover:border-primary/25 hover:shadow-md",
                      "active:scale-[0.985]",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-3 start-0 w-[3px] rounded-full",
                        accent,
                      )}
                    />
                    <span
                      className={cn(
                        "flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl text-caption font-bold leading-tight",
                        chip,
                      )}
                    >
                      {mark}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-semibold text-foreground">
                        {space.name}
                      </p>
                      <p className="mt-1 text-caption text-muted-foreground">
                        {template.label}
                        <span className="mx-1.5 text-border">·</span>
                        {roleLabel(role)}
                        <span className="mx-1.5 text-border">·</span>
                        {space._count.members} عضو
                        <span className="mx-1.5 text-border">·</span>
                        {space._count.expenses} هزینه
                      </p>
                    </div>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <Chevron className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Create CTA — fixed, not a form block on the page */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto w-full max-w-lg">
          <CreateSpaceSheet error={error} layout="fab" />
        </div>
      </div>
    </main>
  );
}
