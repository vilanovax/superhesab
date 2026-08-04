import Link from "next/link";
import { redirect } from "next/navigation";
import { listDueSoonDebtsForUser } from "@/app/actions/debt";
import { CreateSpaceSheet } from "@/components/spaces/create-space-sheet";
import { HomeEmptyActions } from "@/components/spaces/home-empty-actions";
import { HomeQuickActions } from "@/components/spaces/home-quick-actions";
import { HomeSummaryCard } from "@/components/spaces/home-summary-card";
import { HomeUserMenu } from "@/components/spaces/home-user-menu";
import {
  SpaceTypeIcon,
  spaceTypeAccent,
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
    select: {
      id: true,
      phone: true,
      name: true,
      avatarUrl: true,
      platformRole: true,
    },
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
        "mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pt-4 sm:px-5",
        isEmpty
          ? "pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          : "pb-[calc(5.5rem+env(safe-area-inset-bottom))]",
      )}
    >
      {/* Account — profile menu only, start edge (right in RTL) */}
      <div className="mb-4 flex items-center justify-start">
        <HomeUserMenu isPlatformAdmin={user.platformRole === "ADMIN"} />
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

      {/* Empty home: compact brand strip + template picker (one job) */}
      {isEmpty ? (
        <header className="surface-hero animate-fade-up relative mb-4 overflow-hidden rounded-[1.35rem] px-4 py-3.5 shadow-md">
          <div
            aria-hidden
            className="pointer-events-none absolute -end-8 -top-10 size-24 rounded-full bg-on-hero/15 blur-2xl"
          />
          <div className="relative flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-on-hero/55">
                SUPERHESAB
              </p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight text-on-hero">
                اولین دفترت
              </h1>
              <p className="mt-1 max-w-[16rem] text-caption leading-relaxed text-on-hero/75">
                خرج ثبت کن؛ تراز و تسویه خودش جور می‌شود.
              </p>
            </div>
            <span
              aria-hidden
              className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-on-hero/12 text-on-hero ring-1 ring-on-hero/20"
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
          <div className="animate-fade-up flex flex-1 flex-col">
            <HomeEmptyActions
              error={error}
              disabledTypes={disabledSpaceTypes}
            />
          </div>
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

      {/* FAB only when spaces exist — empty home already lists create actions */}
      {!isEmpty ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-lg justify-end px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto">
            <CreateSpaceSheet
              error={error}
              layout="fab"
              disabledTypes={disabledSpaceTypes}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
