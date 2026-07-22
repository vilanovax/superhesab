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
import { getTemplate } from "@/lib/templates/registry";

type SpacePageProps = {
  params: Promise<{ id: string }>;
};

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
              select: { id: true, name: true, phone: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        expenses: {
          include: {
            paidBy: { select: { name: true, phone: true } },
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
  const members = space.members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    phone: m.user.phone,
  }));

  const myBalance = balanceData.balances[session.userId] ?? 0;
  const totalExpenses = space.expenses.reduce(
    (sum, expense) => sum + expense.totalAmount,
    0,
  );
  const openSettlementAmount = balanceData.suggestions.reduce(
    (sum, suggestion) => sum + suggestion.amount,
    0,
  );

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col gap-5 px-4 pb-28 pt-5 sm:px-6">
      <div className="flex items-center justify-between gap-3 px-1">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-xl bg-white/50 px-3 backdrop-blur-sm hover:bg-white/80"
        >
          <Link href="/app">← بازگشت</Link>
        </Button>
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-ink/90 px-3 py-1.5 text-xs font-medium text-primary-foreground">
            {template.label}
          </span>
          <Button
            asChild
            variant="outline"
            size="icon"
            className="size-10 rounded-xl border-border/70 bg-white/70 backdrop-blur-sm"
            aria-label="تنظیمات فضا"
          >
            <Link href={`/spaces/${space.id}/settings`}>
              <svg
                viewBox="0 0 24 24"
                className="size-5"
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
            </Link>
          </Button>
        </div>
      </div>

      <header className="surface-hero animate-fade-up relative overflow-hidden rounded-2xl p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -start-8 -top-10 size-36 rounded-full bg-white/10 blur-2xl animate-[soft-pulse_4s_ease-in-out_infinite]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -end-6 size-40 rounded-full bg-black/10 blur-2xl"
        />

        <div className="relative space-y-4">
          <div>
            <p className="text-xs font-medium text-white/70">فضای مشترک</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              {space.name}
            </h1>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2 space-x-reverse">
                {space.members.slice(0, 5).map((m) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={m.user.id}
                    src={
                      m.user.avatarUrl ??
                      `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(m.user.phone)}`
                    }
                    alt=""
                    width={36}
                    height={36}
                    className="size-9 rounded-full border-2 border-white/40 bg-white/20"
                  />
                ))}
                {space.members.length > 5 ? (
                  <span className="flex size-9 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-xs font-medium">
                    +{space.members.length - 5}
                  </span>
                ) : null}
              </div>
              <InviteMembersButton
                spaceId={space.id}
                spaceName={space.name}
                members={space.members.map((m) => ({
                  userId: m.user.id,
                  name: m.user.name,
                  phone: m.user.phone,
                  avatarUrl: m.user.avatarUrl,
                  role: m.role,
                }))}
              />
            </div>
            <p className="text-xs text-white/75">
              {space.members.length} عضو · {space.expenses.length} هزینه ·{" "}
              {formatCurrency(totalExpenses)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/12 px-3 py-2.5 backdrop-blur-sm">
              <p className="text-[11px] text-white/70">مانده شما</p>
              <p className="mt-0.5 text-base font-bold tabular-nums">
                {myBalance === 0
                  ? "Settled"
                  : `${myBalance > 0 ? "+" : "−"}${formatCurrency(Math.abs(myBalance))}`}
              </p>
            </div>
            <div className="rounded-xl bg-white/12 px-3 py-2.5 backdrop-blur-sm">
              <p className="text-[11px] text-white/70">تسویه باز</p>
              <p className="mt-0.5 text-base font-bold tabular-nums">
                {formatCurrency(openSettlementAmount)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <SpaceTabs
        spaceId={space.id}
        expenses={space.expenses}
        members={members}
        balances={balanceData.balances}
        suggestions={balanceData.suggestions}
        checklist={checklist}
      />

      <AddExpenseButton
        spaceId={space.id}
        currentUserId={session.userId}
        members={members}
        currency={space.currency}
      />
    </main>
  );
}
