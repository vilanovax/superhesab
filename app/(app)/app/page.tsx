import Link from "next/link";
import { redirect } from "next/navigation";
import { listDueSoonDebtsForUser } from "@/app/actions/debt";
import { CreateSpaceSheet } from "@/components/spaces/create-space-sheet";
import { HomeEmptyActions } from "@/components/spaces/home-empty-actions";
import { SpaceArchiveButton } from "@/components/spaces/space-card-actions";
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

const HERO_CHIPS = [
  "سفر",
  "مشترک",
  "خانواده",
  "ساختمان",
  "شخصی",
] as const;

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
    redirect("/login");
  }

  const memberships = await prisma.spaceMember.findMany({
    where: {
      userId: session.userId,
      space: { archivedAt: null },
    },
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

  const archivedCount = await prisma.spaceMember.count({
    where: {
      userId: session.userId,
      space: { archivedAt: { not: null } },
    },
  });

  const dueSoonDebts = await listDueSoonDebtsForUser(session.userId);

  const displayName = user.name?.trim() || user.phone;
  const spaceCount = memberships.length;

  const currencyBySpace = Object.fromEntries(
    memberships.map((m) => [m.space.id, m.space.currency]),
  );

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-5">
      {/* Identity */}
      <div className="mb-4 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            user.avatarUrl ??
            `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(user.phone)}`
          }
          alt=""
          width={40}
          height={40}
          className="size-10 rounded-full ring-2 ring-white/90 shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold tracking-tight text-foreground">
            سلام، {displayName}
          </p>
          <p className="text-caption text-muted-foreground">
            {spaceCount === 0 ? "اولین دفترت را بساز" : `${spaceCount} دفتر فعال`}
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-2xl border-border/60 bg-card shadow-sm"
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

      {/* Brand hero — سوپرحساب */}
      <header className="surface-hero animate-fade-up relative mb-5 overflow-hidden rounded-[1.5rem] px-5 pb-4 pt-5 shadow-md">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--on-hero-soft) 1px, transparent 0)",
            backgroundSize: "18px 18px",
            maskImage:
              "radial-gradient(ellipse at 80% 0%, black 15%, transparent 65%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -end-8 -top-14 size-40 rounded-full bg-on-hero/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -start-12 bottom-[-2rem] size-36 rounded-full bg-highlight/25 blur-3xl"
        />

        <div className="relative">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-on-hero/12 px-2.5 py-1 text-micro font-semibold tracking-wide text-on-hero/80 ring-1 ring-on-hero/15">
              <span
                className="size-1.5 rounded-full bg-highlight"
                aria-hidden
              />
              حساب‌وکتاب مشترک
            </span>
            <span className="text-micro font-medium tracking-[0.12em] text-on-hero/45">
              SuperHesab
            </span>
          </div>

          <h1 className="text-[2.15rem] font-bold leading-none tracking-tight text-on-hero sm:text-display">
            سوپرحساب
          </h1>
          <p className="mt-2.5 max-w-[18rem] text-body-sm leading-relaxed text-on-hero/75">
            خرج‌ها را ثبت کن؛ تراز و تسویه خودش جور می‌شود.
          </p>

          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {HERO_CHIPS.map((chip) => (
              <span
                key={chip}
                className="shrink-0 rounded-lg bg-on-hero/10 px-2.5 py-1 text-caption font-medium text-on-hero/85 ring-1 ring-on-hero/10"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">
              فضاهای من
            </h2>
            <p className="mt-0.5 text-caption text-muted-foreground">
              دفاتر فعال حساب‌وکتاب
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/app/archive"
              className="rounded-lg bg-muted/80 px-2.5 py-1 text-micro font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
            >
              آرشیو
              {archivedCount > 0 ? ` (${archivedCount})` : ""}
            </Link>
            {spaceCount > 0 ? (
              <span className="rounded-lg bg-secondary px-2 py-1 text-micro font-semibold tabular-nums text-secondary-foreground">
                {spaceCount}
              </span>
            ) : null}
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
          <ul className="space-y-2">
            {memberships.map(({ space, role }, index) => {
              const template = getTemplate(space.type);
              const spaceHref =
                space.type === "BUILDING" && role === "VIEWER"
                  ? `/spaces/${space.id}/resident`
                  : `/spaces/${space.id}`;
              const mark =
                space.type === "TRIP"
                  ? "سفر"
                  : space.type === "PARTNER"
                    ? "۲نفر"
                    : space.type === "FAMILY"
                      ? "خانه"
                      : space.type === "BUILDING"
                        ? "برج"
                        : "من";
              const accent =
                space.type === "TRIP"
                  ? "bg-primary"
                  : space.type === "PARTNER"
                    ? "bg-highlight"
                    : space.type === "FAMILY"
                      ? "bg-ink"
                      : space.type === "BUILDING"
                        ? "bg-primary"
                        : "bg-success";
              const chip =
                space.type === "TRIP"
                  ? "bg-secondary text-primary"
                  : space.type === "PARTNER"
                    ? "bg-accent text-ink"
                    : space.type === "FAMILY"
                      ? "bg-secondary text-primary"
                      : space.type === "BUILDING"
                        ? "bg-muted text-foreground"
                        : "bg-success-soft text-success";
              return (
                <li
                  key={space.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
                >
                  <div
                    className={cn(
                      "group relative flex items-center gap-2 overflow-hidden rounded-2xl border border-border/50 bg-card pe-2 ps-3.5 py-3",
                      "transition-[box-shadow,border-color] duration-150 ease-out",
                      "hover:border-primary/25 hover:shadow-md",
                    )}
                  >
                    <Link
                      href={spaceHref}
                      className="flex min-w-0 flex-1 items-center gap-3 active:opacity-90"
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
                          "flex size-11 shrink-0 flex-col items-center justify-center rounded-2xl text-caption font-bold leading-tight",
                          chip,
                        )}
                      >
                        {mark}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-semibold text-foreground">
                          {space.name}
                        </p>
                        <p className="mt-0.5 text-caption text-muted-foreground">
                          {template.label}
                          <span className="mx-1.5 text-border">·</span>
                          {roleLabel(role)}
                          <span className="mx-1.5 text-border">·</span>
                          {space._count.members} عضو
                          <span className="mx-1.5 text-border">·</span>
                          {space._count.expenses} هزینه
                        </p>
                      </div>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        <Chevron className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
                      </span>
                    </Link>
                    {role === "OWNER" ? (
                      <SpaceArchiveButton
                        spaceId={space.id}
                        spaceName={space.name}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Circular FAB — create space */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-lg justify-end px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto">
          <CreateSpaceSheet error={error} layout="fab" />
        </div>
      </div>
    </main>
  );
}
