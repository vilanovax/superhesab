import Link from "next/link";
import { notFound } from "next/navigation";
import { getChecklist } from "@/app/actions/checklist";
import { getSpaceBalances } from "@/app/actions/settlement";
import { AddExpenseButton } from "@/components/expenses/add-expense-button";
import { InviteMembersButton } from "@/components/spaces/invite-members-button";
import { SpaceTabs } from "@/components/spaces/space-tabs";
import { Button } from "@/components/ui/button";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/formatters";
import { prisma } from "@/lib/db/prisma";
import { maybeCeilToThousand } from "@/lib/money";
import { getTemplate } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SpacePageProps = {
  params: Promise<{ id: string }>;
};

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
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
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
        "flex min-h-[4.25rem] flex-col justify-center rounded-xl bg-white/12 px-3 py-2.5",
        className,
      )}
    >
      <p className="text-[11px] leading-none text-white/65">{label}</p>
      <div className="mt-1.5 text-[0.9375rem] font-bold leading-snug tabular-nums tracking-tight">
        {children}
      </div>
    </div>
  );
}

export default async function SpacePage({ params }: SpacePageProps) {
  const { id } = await params;
  const session = await requireUser();
  const membership = await requireSpaceMember(id, session.userId);

  if (!membership) {
    notFound();
  }

  const [space, balanceData, checklist] = await Promise.all([
    prisma.space.findUnique({
      where: { id },
      include: {
        members: {
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
        },
        expenses: {
          include: {
            paidBy: {
              select: { name: true, phone: true, isVirtual: true },
            },
            splits: {
              select: { userId: true, owedAmount: true },
            },
          },
          orderBy: { date: "desc" },
          take: 50,
        },
      },
    }),
    getSpaceBalances(id),
    getChecklist(id),
  ]);

  if (!space) {
    notFound();
  }

  const template = getTemplate(space.type);
  const isPartner = space.type === "PARTNER";
  const showChecklist = template.features.checklist;
  const needsPartner = isPartner && space.members.length < 2;

  const inviteMembers = space.members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    phone: m.user.phone,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    isVirtual: m.user.isVirtual,
  }));

  const members = space.members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    phone: m.user.phone,
    isVirtual: m.user.isVirtual,
  }));

  const partner = space.members.find((m) => m.user.id !== session.userId)?.user;
  const partnerLabel =
    partner?.name?.trim().split(/\s+/)[0] ||
    (partner ? "طرف مقابل" : null);

  const myBalance = maybeCeilToThousand(
    balanceData.balances[session.userId] ?? 0,
    space.roundUpToThousand,
  );
  const totalExpenses = space.expenses.reduce(
    (sum, expense) => sum + expense.totalAmount,
    0,
  );
  const openSettlementAmount = balanceData.suggestions.reduce(
    (sum, suggestion) =>
      sum + maybeCeilToThousand(suggestion.amount, space.roundUpToThousand),
    0,
  );

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-5">
      <div className="mb-3 flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 gap-1 rounded-xl border-border/70 bg-white pe-3 ps-2 text-sm font-medium shadow-sm"
        >
          <Link href="/app">
            <BackChevron className="size-4 text-muted-foreground" />
            بازگشت
          </Link>
        </Button>

        <span className="ms-auto max-w-[9.5rem] truncate rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground">
          {isPartner ? "حساب مشترک" : template.label}
        </span>

        <Button
          asChild
          variant="outline"
          size="icon"
          className="size-9 shrink-0 rounded-xl border-border/70 bg-white shadow-sm"
          aria-label="تنظیمات فضا"
        >
          <Link href={`/spaces/${space.id}/settings`}>
            <SettingsIcon className="size-4" />
          </Link>
        </Button>
      </div>

      <header className="surface-hero animate-fade-up relative mb-4 overflow-hidden rounded-2xl px-4 pb-4 pt-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-s-10 -top-12 size-32 rounded-full bg-white/12 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-e-8 -bottom-14 size-36 rounded-full bg-black/15 blur-2xl"
        />

        <div className="relative space-y-3.5">
          <div className="space-y-1">
            <p className="text-[11px] font-medium tracking-wide text-white/60">
              {isPartner ? "حساب مشترک" : "فضای مشترک"}
            </p>
            <h1 className="text-[1.375rem] font-bold leading-tight tracking-tight text-white">
              {space.name}
            </h1>
            <p className="text-xs text-white/70">
              {isPartner ? (
                partnerLabel ? (
                  <>من و {partnerLabel}</>
                ) : (
                  <>من · منتظر طرف مقابل</>
                )
              ) : (
                <>
                  {space.members.length} عضو · {space.expenses.length} هزینه
                  {totalExpenses > 0 ? (
                    <> · جمع {formatCurrency(totalExpenses)}</>
                  ) : null}
                </>
              )}
              {isPartner && totalExpenses > 0 ? (
                <> · جمع {formatCurrency(totalExpenses)}</>
              ) : null}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex -space-x-2 space-x-reverse">
              {space.members.slice(0, 4).map((m) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={m.user.id}
                  src={
                    m.user.avatarUrl ??
                    `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(m.user.phone)}`
                  }
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 rounded-full border-2 border-white/35 bg-white/20"
                />
              ))}
              {space.members.length > 4 ? (
                <span className="flex size-8 items-center justify-center rounded-full border-2 border-white/35 bg-white/20 text-[10px] font-semibold">
                  +{space.members.length - 4}
                </span>
              ) : null}
            </div>
            <InviteMembersButton
              spaceId={space.id}
              spaceName={space.name}
              members={inviteMembers}
            />
          </div>

          {isPartner ? (
            <div className="rounded-xl bg-white/12 px-3.5 py-3">
              <p className="text-[11px] text-white/65">مانده شما</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-white">
                {myBalance === 0
                  ? "صاف"
                  : `${myBalance > 0 ? "+" : "−"}${formatCurrency(Math.abs(myBalance))}`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <HeroStat label="مانده شما">
                {myBalance === 0 ? (
                  <span className="text-white/90">تسویه‌شده</span>
                ) : (
                  <span
                    className={
                      myBalance > 0 ? "text-emerald-100" : "text-rose-100"
                    }
                  >
                    {myBalance > 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(myBalance))}
                  </span>
                )}
              </HeroStat>
              <HeroStat label="تسویه باز">
                {openSettlementAmount === 0
                  ? "صفر"
                  : formatCurrency(openSettlementAmount)}
              </HeroStat>
            </div>
          )}
        </div>
      </header>

      {needsPartner ? (
        <div className="animate-fade-up mb-4 rounded-2xl border border-primary/20 bg-white px-4 py-5 text-center shadow-sm">
          <p className="text-[15px] font-semibold text-foreground">
            طرف مقابل را به این حساب مشترک دعوت کنید
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            با لینک دعوت یا افزودن دستی، حساب دونفره‌تان کامل می‌شود.
          </p>
          <InviteMembersButton
            spaceId={space.id}
            spaceName={space.name}
            members={inviteMembers}
            variant="banner"
          />
        </div>
      ) : null}

      <SpaceTabs
        spaceId={space.id}
        currentUserId={session.userId}
        expenses={space.expenses}
        members={members}
        balances={balanceData.balances}
        suggestions={balanceData.suggestions}
        checklist={checklist}
        currency={space.currency}
        roundUpToThousand={space.roundUpToThousand}
        spaceType={space.type}
        showChecklist={showChecklist}
      />

      <AddExpenseButton
        spaceId={space.id}
        currentUserId={session.userId}
        members={members}
        currency={space.currency}
        spaceType={space.type}
      />
    </main>
  );
}
