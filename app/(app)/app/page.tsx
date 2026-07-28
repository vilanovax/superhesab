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

function typeMark(type: string) {
  if (type === "TRIP") return "سفر";
  if (type === "PARTNER") return "۲نفر";
  if (type === "FAMILY" || type === "PERSONAL") return "خانه";
  if (type === "FUND") return "صندوق";
  if (type === "BUILDING") return "برج";
  return "من";
}

function typeAccent(type: string) {
  if (type === "PARTNER") return "bg-highlight";
  if (type === "FAMILY" || type === "PERSONAL") return "bg-ink";
  return "bg-primary";
}

function typeChip(type: string) {
  if (type === "PARTNER") return "bg-accent text-ink";
  if (type === "FAMILY" || type === "PERSONAL") return "bg-secondary text-primary";
  if (type === "FUND") return "bg-primary/15 text-primary";
  if (type === "BUILDING") return "bg-muted text-foreground";
  return "bg-secondary text-primary";
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
          _count: { select: { members: true } },
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
  const isEmpty = spaceCount === 0;

  const currencyBySpace = Object.fromEntries(
    memberships.map((m) => [m.space.id, m.space.currency]),
  );

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-5">
      {/* Identity */}
      <div className={cn("flex items-center gap-3", isEmpty ? "mb-4" : "mb-5")}>
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

      <section className="flex min-h-0 flex-1 flex-col">
        {!isEmpty ? (
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold tracking-tight text-foreground">
              فضاهای من
            </h2>
            <Link
              href="/app/archive"
              className="rounded-lg px-2 py-1 text-caption font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                        typeAccent(space.type),
                      )}
                    />
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl text-caption font-bold leading-tight",
                        typeChip(space.type),
                      )}
                    >
                      {typeMark(space.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-semibold text-foreground">
                        {space.name}
                      </p>
                      <p className="mt-0.5 truncate text-caption text-muted-foreground">
                        {meta}
                      </p>
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
