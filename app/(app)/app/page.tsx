import Link from "next/link";
import { redirect } from "next/navigation";
import { listDueSoonDebtsForUser } from "@/app/actions/debt";
import { CreateSpaceSheet } from "@/components/spaces/create-space-sheet";
import { HomeEmptyActions } from "@/components/spaces/home-empty-actions";
import { HomeQuickActions } from "@/components/spaces/home-quick-actions";
import { HomeSummaryCard } from "@/components/spaces/home-summary-card";
import {
  SpaceTypeIcon,
  spaceTypeAccent,
  spaceTypeTint,
} from "@/components/spaces/space-type-icon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { requireUser } from "@/lib/auth/guards";
import { debtTypeLabel } from "@/lib/debts";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/formatters";
import { getHomeSummary, type HomeSpaceStat } from "@/lib/home-summary";
import { canMutateMoney } from "@/lib/rbac";
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
      <circle cx="12" cy="12" r="3.25" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function roleLabel(role: string) {
  if (role === "OWNER") return "مالک";
  if (role === "VIEWER") return "ناظر";
  return "ویرایشگر";
}

/** Money headline shown on each space card, tone-coded by sign. */
function SpaceStatLine({
  stat,
  currency,
}: {
  stat: HomeSpaceStat | undefined;
  currency: Parameters<typeof formatCurrency>[1];
}) {
  if (!stat || stat.kind === "none") return null;

  if (stat.kind === "spend") {
    if (stat.amount === 0) {
      return (
        <span className="text-caption text-muted-foreground">
          این ماه خرجی ثبت نشده
        </span>
      );
    }
    return (
      <span className="text-caption text-muted-foreground">
        این ماه{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {formatCurrency(stat.amount, currency)}
        </span>
      </span>
    );
  }

  if (stat.amount === 0) {
    return (
      <span className="text-caption font-semibold text-muted-foreground">
        تسویه
      </span>
    );
  }

  const isCredit = stat.amount > 0;
  return (
    <span
      className={cn(
        "text-caption font-semibold tabular-nums",
        isCredit ? "text-success" : "text-destructive",
      )}
    >
      {isCredit ? "طلب " : "بدهی "}
      {formatCurrency(Math.abs(stat.amount), currency)}
    </span>
  );
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
          ownerId: true,
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const spaceIds = memberships.map((m) => m.space.id);

  const [archivedCount, dueSoonDebts, summary, lastExpense] = await Promise.all([
    prisma.spaceMember.count({
      where: {
        userId: session.userId,
        space: { archivedAt: { not: null } },
      },
    }),
    listDueSoonDebtsForUser(session.userId),
    getHomeSummary(
      session.userId,
      memberships.map((m) => ({
        id: m.space.id,
        type: m.space.type,
        currency: m.space.currency,
        ownerId: m.space.ownerId,
        role: m.role,
      })),
    ),
    /** Most recently touched ledger — the natural «ثبت خرج» target. */
    spaceIds.length > 0
      ? prisma.expense.findFirst({
          where: { spaceId: { in: spaceIds } },
          orderBy: { createdAt: "desc" },
          select: { spaceId: true },
        })
      : null,
  ]);

  const displayName = user.name?.trim() || user.phone;
  const spaceCount = memberships.length;
  const isEmpty = spaceCount === 0;

  const currencyBySpace = Object.fromEntries(
    memberships.map((m) => [m.space.id, m.space.currency]),
  );

  const writable = memberships.filter((m) => canMutateMoney(m.role));
  const recentMembership =
    writable.find((m) => m.space.id === lastExpense?.spaceId) ?? writable[0];
  const recentSpace = recentMembership
    ? { id: recentMembership.space.id, name: recentMembership.space.name }
    : null;

  /** Largest outstanding position — where تسویه actually has something to do. */
  const settleMembership = writable
    .filter((m) => {
      const stat = summary.statBySpace[m.space.id];
      return stat?.kind === "balance" && stat.amount !== 0;
    })
    .sort((a, b) => {
      const sa = summary.statBySpace[a.space.id];
      const sb = summary.statBySpace[b.space.id];
      const va = sa?.kind === "balance" ? Math.abs(sa.amount) : 0;
      const vb = sb?.kind === "balance" ? Math.abs(sb.amount) : 0;
      return vb - va;
    })[0];
  const settleSpace = settleMembership
    ? { id: settleMembership.space.id, name: settleMembership.space.name }
    : null;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-5">
      {/* Identity */}
      <div className="mb-4 flex items-center gap-3">
        <UserAvatar
          phone={user.phone}
          name={user.name}
          avatarUrl={user.avatarUrl}
          size={40}
          className="size-10 ring-2 ring-white/90 shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold tracking-tight text-foreground">
            سلام، {displayName}
          </p>
          <p className="text-caption text-muted-foreground">
            {isEmpty ? "اولین دفترت را بساز" : `${spaceCount} دفتر فعال`}
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

      {!isEmpty ? <HomeSummaryCard summary={summary} /> : null}

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

      {/* Compact brand hero — only when user has no spaces */}
      {isEmpty ? (
        <header className="surface-hero animate-fade-up relative mb-5 overflow-hidden rounded-[1.25rem] px-5 py-4 shadow-md">
          <div
            aria-hidden
            className="pointer-events-none absolute -end-6 -top-10 size-28 rounded-full bg-on-hero/15 blur-3xl"
          />
          <div className="relative">
            <p className="text-micro font-medium tracking-[0.14em] text-on-hero/50">
              SuperHesab
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-none tracking-tight text-on-hero">
              سوپرحساب
            </h1>
            <p className="mt-2 max-w-[17rem] text-body-sm leading-relaxed text-on-hero/75">
              خرج‌ها را ثبت کن؛ تراز و تسویه خودش جور می‌شود.
            </p>
          </div>
        </header>
      ) : null}

      {!isEmpty ? (
        <HomeQuickActions
          recentSpace={recentSpace}
          settleSpace={settleSpace}
        />
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col">
        {!isEmpty ? (
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold tracking-tight text-foreground">
              فضاهای من
            </h2>
            <Link
              href="/app/archive"
              className="rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-caption font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
            >
              آرشیو
              {archivedCount > 0 ? (
                <span className="ms-1 tabular-nums text-muted-foreground/80">
                  ({archivedCount})
                </span>
              ) : null}
            </Link>
          </div>
        ) : null}

        {isEmpty ? (
          <EmptyState
            icon="space"
            title="هیچ حساب و کتابی ندارید"
            description="سفر گروهی، حساب مشترک دونفره، یا دفتر خانه بسازید."
            className="flex-1 justify-center"
            actionNode={<HomeEmptyActions error={error} />}
          />
        ) : (
          <ul className="space-y-2">
            {memberships.map(({ space, role }, index) => {
              const spaceHref =
                space.type === "BUILDING" && role === "VIEWER"
                  ? `/spaces/${space.id}/resident`
                  : space.type === "FUND" && role === "VIEWER"
                    ? `/spaces/${space.id}/member`
                    : `/spaces/${space.id}`;
              const meta = [
                getTemplate(space.type).label,
                role !== "OWNER" ? roleLabel(role) : null,
                `${space._count.members} عضو`,
              ]
                .filter(Boolean)
                .join(" · ");
              const stat = summary.statBySpace[space.id];

              return (
                <li
                  key={space.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
                >
                  <Link
                    href={spaceHref}
                    className={cn(
                      "group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border/50 bg-card ps-3.5 pe-3 py-3",
                      "transition-[box-shadow,border-color,transform] duration-150 ease-out",
                      "hover:border-primary/25 hover:shadow-md active:scale-[0.99]",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-3 start-0 w-[3px] rounded-full",
                        spaceTypeAccent(space.type),
                      )}
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        spaceTypeTint(space.type),
                      )}
                    >
                      <SpaceTypeIcon type={space.type} className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-semibold text-foreground">
                        {space.name}
                      </p>
                      <p className="mt-0.5 truncate text-caption text-muted-foreground">
                        {meta}
                      </p>
                      {stat && stat.kind !== "none" ? (
                        <p className="mt-1 truncate">
                          <SpaceStatLine
                            stat={stat}
                            currency={space.currency}
                          />
                        </p>
                      ) : null}
                    </div>
                    <Chevron className="size-4 shrink-0 text-muted-foreground/50 transition-transform duration-150 group-hover:-translate-x-0.5 group-hover:text-primary" />
                  </Link>
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
