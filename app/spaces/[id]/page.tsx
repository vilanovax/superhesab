import Link from "next/link";
import { notFound } from "next/navigation";
import { getChecklist } from "@/app/actions/checklist";
import { getSpaceBalances } from "@/app/actions/settlement";
import { AddExpenseButton } from "@/components/expenses/add-expense-button";
import { SpaceTabs } from "@/components/spaces/space-tabs";
import { Button } from "@/components/ui/button";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
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
              select: { id: true, name: true, phone: true },
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

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col gap-6 px-6 pb-28 pt-8">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="px-2">
            <Link href="/app">← بازگشت</Link>
          </Button>
          <span className="rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {template.label}
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {space.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {space.members.length} عضو · {space.expenses.length} هزینه اخیر
          </p>
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
      />
    </main>
  );
}
