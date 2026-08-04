import Link from "next/link";
import { redirect } from "next/navigation";
import { listDueSoonDebtsForUser } from "@/app/actions/debt";
import { CreateSpaceSheet } from "@/components/spaces/create-space-sheet";
import { HomeEmptyActions } from "@/components/spaces/home-empty-actions";
import { HomeQuickActions } from "@/components/spaces/home-quick-actions";
import { HomeSpaceSpeculation } from "@/components/spaces/home-space-speculation";
import { HomeSummaryCard } from "@/components/spaces/home-summary-card";
import { HomeUserMenu } from "@/components/spaces/home-user-menu";
import { PrefetchSpaceLink } from "@/components/spaces/prefetch-space-link";
import {
  SpaceTypeIcon,
  spaceTypeTint,
} from "@/components/spaces/space-type-icon";
import { requireUser } from "@/lib/auth/guards";
import { debtTypeLabel } from "@/lib/debts";
import { prisma } from "@/lib/db/prisma";
import { listDisabledSpaceTypes } from "@/lib/feature-flags";
import { formatCurrency } from "@/lib/formatters";
import { getHomeSummary, type HomeSpaceStat } from "@/lib/home-summary";
import { canMutateMoney } from "@/lib/rbac";
import { getTemplate } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";

function roleLabel(role: string) {
  if (role === "OWNER") return "مالک";
  if (role === "VIEWER") return "ناظر";
  return "ویرایشگر";
}

function firstName(name: string | null, phone: string) {
  const trimmed = name?.trim();
  if (!trimmed) return phone;
  return trimmed.split(/\s+/)[0] ?? trimmed;
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

  const [sp, user, memberships] = await Promise.all([
    searchParams,
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        phone: true,
        name: true,
        avatarUrl: true,
        platformRole: true,
      },
    }),
    prisma.spaceMember.findMany({
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
    }),
  ]);
  const { error } = sp;

  if (!user) {
    redirect("/login");
  }

  const spaceIds = memberships.map((m) => m.space.id);

  const [archivedCount, dueSoonDebts, summary, lastExpense, disabledSpaceTypes] =
    await Promise.all([
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
      listDisabledSpaceTypes(),
    ]);

  const spaceCount = memberships.length;
  const isEmpty = spaceCount === 0;
  const greetingName = firstName(user.name, user.phone);

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
    <main
      className={cn(
        "mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pt-3 sm:px-5",
        "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
      )}
    >
      {!isEmpty ? <HomeSpaceSpeculation /> : null}

      {/* Greeting + account — one clear home header */}
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0 animate-fade-up">
          <p className="text-caption font-medium text-muted-foreground">
            سوپرحساب
          </p>
          <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight text-foreground">
            سلام، {greetingName}
          </h1>
          {!isEmpty ? (
            <p className="mt-1 text-caption text-muted-foreground">
              {spaceCount === 1
                ? "یک دفتر فعال"
                : `${spaceCount} دفتر فعال`}
            </p>
          ) : null}
        </div>
        <HomeUserMenu isPlatformAdmin={user.platformRole === "ADMIN"} />
      </header>

      {!isEmpty ? <HomeSummaryCard summary={summary} /> : null}

      {dueSoonDebts.length > 0 ? (
        <div className="animate-fade-up mb-5 rounded-[1.25rem] border border-destructive/20 bg-destructive-soft/80 px-4 py-3.5">
          <p className="text-body-sm font-semibold text-destructive">
            سررسید بدهی / طلب
          </p>
          <ul className="mt-2.5 space-y-2">
            {dueSoonDebts.slice(0, 4).map((d) => (
              <li key={d.debtId}>
                <PrefetchSpaceLink
                  href={`/spaces/${d.spaceId}`}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-xl bg-card/70 px-3 py-2.5 text-caption transition-colors duration-150 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                </PrefetchSpaceLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Empty home: compact brand strip + template picker (one job) */}
      {isEmpty ? (
        <div className="surface-hero animate-fade-up relative mb-5 overflow-hidden rounded-3xl px-5 py-4 shadow-md">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-e-8 -top-10 size-28 rounded-full bg-on-hero/15 blur-2xl"
          />
          <div className="relative flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-on-hero/55">
                SUPERHESAB
              </p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-on-hero">
                اولین دفترت
              </p>
              <p className="mt-1 max-w-[16rem] text-caption leading-relaxed text-on-hero/75">
                خرج ثبت کن؛ تراز و تسویه خودش جور می‌شود.
              </p>
            </div>
            <span
              aria-hidden
              className="mb-0.5 flex size-12 shrink-0 items-center justify-center rounded-2xl bg-on-hero/12 text-on-hero ring-1 ring-on-hero/20"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 5.5h10.5A2.5 2.5 0 0 1 18 8v11.5H7.5A2.5 2.5 0 0 1 5 17z" />
                <path d="M5 5.5V17a2.5 2.5 0 0 0 2.5 2.5" />
                <path d="M9 9.5h6M9 13h4" />
              </svg>
            </span>
          </div>
        </div>
      ) : null}

      {!isEmpty ? (
        <HomeQuickActions
          recentSpace={recentSpace}
          settleSpace={settleSpace}
        />
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col">
        {!isEmpty ? (
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold tracking-tight text-foreground">
              فضاهای من
            </h2>
            <div className="flex items-center gap-1.5">
              <Link
                href="/app/archive"
                className="inline-flex h-8 cursor-pointer items-center rounded-full border border-border/55 bg-card/80 px-2.5 text-caption font-semibold text-muted-foreground transition-colors duration-150 hover:border-primary/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                آرشیو
                {archivedCount > 0 ? (
                  <span className="ms-1 tabular-nums text-muted-foreground/80">
                    ({archivedCount})
                  </span>
                ) : null}
              </Link>
              <CreateSpaceSheet
                error={error}
                layout="compact"
                disabledTypes={disabledSpaceTypes}
              />
            </div>
          </div>
        ) : null}

        {isEmpty ? (
          <div className="animate-fade-up flex flex-1 flex-col">
            <HomeEmptyActions
              error={error}
              disabledTypes={disabledSpaceTypes}
            />
          </div>
        ) : (
          <>
            <ul className="space-y-2.5">
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
                    style={{ animationDelay: `${80 + Math.min(index, 6) * 45}ms` }}
                  >
                    <PrefetchSpaceLink
                      href={spaceHref}
                      className={cn(
                        "group flex min-h-17 cursor-pointer items-center gap-3.5 rounded-[1.25rem] border border-border/45 bg-card px-3.5 py-3.5",
                        "shadow-sm transition-[box-shadow,border-color,transform] duration-200 ease-out",
                        "hover:border-primary/28 hover:shadow-md active:scale-[0.99]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-12 shrink-0 items-center justify-center rounded-2xl",
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
                          <p className="mt-1.5 truncate">
                            <SpaceStatLine
                              stat={stat}
                              currency={space.currency}
                            />
                          </p>
                        ) : null}
                      </div>
                      <span
                        aria-hidden
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground transition-colors duration-150 group-hover:bg-primary/10 group-hover:text-primary"
                      >
                        <Chevron className="size-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
                      </span>
                    </PrefetchSpaceLink>
                  </li>
                );
              })}
            </ul>

            {/* Soft tip when the list is short — fills empty viewport usefully */}
            {spaceCount < 3 ? (
              <p className="animate-fade-up mt-8 px-1 text-center text-caption leading-relaxed text-muted-foreground/85">
                برای هر خانه، سفر یا حساب مشترک یک دفتر جدا بساز تا ترازها قاطی نشوند.
              </p>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
