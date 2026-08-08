import Link from "next/link";
import { ArchivedSpacesList } from "@/components/spaces/archived-spaces-list";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

type ArchivePageProps = {
  searchParams: Promise<{ archived?: string }>;
};

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const session = await requireUser();
  const { archived } = await searchParams;
  const archivedName = archived?.trim() || null;

  const spacesRaw = await prisma.space.findMany({
    where: {
      archivedAt: { not: null },
      members: { some: { userId: session.userId } },
    },
    select: {
      id: true,
      name: true,
      type: true,
      archivedAt: true,
      _count: { select: { expenses: true, members: true } },
      members: {
        where: { userId: session.userId },
        select: { role: true },
        take: 1,
      },
    },
    orderBy: { archivedAt: "desc" },
  });

  const spaces = spacesRaw.map((space) => ({
    id: space.id,
    name: space.name,
    type: space.type,
    archivedAt: (space.archivedAt ?? new Date()).toISOString(),
    memberCount: space._count.members,
    expenseCount: space._count.expenses,
    canManage: space.members[0]?.role === "OWNER",
  }));

  const count = spaces.length;
  const countLabel =
    count === 0
      ? "هیچ دفتری آرشیو نیست"
      : count === 1
        ? "۱ دفتر آرشیو"
        : `${count.toLocaleString("fa-IR")} دفتر آرشیو`;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-9 gap-1 rounded-full border border-border/55 bg-card px-3 text-sm font-medium shadow-none"
        >
          <Link href="/app">← بازگشت</Link>
        </Button>
        <span className="rounded-full bg-primary/10 px-3 py-1.5 text-caption font-semibold text-primary">
          آرشیو
        </span>
      </div>

      <header className="animate-fade-up mb-4 space-y-1 px-0.5">
        <h1 className="text-[1.45rem] font-bold leading-tight tracking-tight text-foreground">
          دفاتر آرشیو
        </h1>
        <p className="text-caption text-muted-foreground">
          {countLabel}
          {" · "}
          حذف دائمی فقط با تأیید
        </p>
      </header>

      {archivedName ? (
        <p
          className="animate-fade-up mb-3 rounded-xl border border-success/20 bg-success-soft px-3.5 py-2.5 text-caption font-medium text-success"
          role="status"
        >
          دفتر «{archivedName}» آرشیو شد — از اینجا بازگردانی یا حذف کنید.
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        <ArchivedSpacesList spaces={spaces} />
      </div>
    </main>
  );
}
