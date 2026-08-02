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

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
      <div className="mb-4 flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 gap-1 rounded-xl border-border/70 bg-card pe-3 ps-2 text-sm font-medium shadow-sm"
        >
          <Link href="/app">← بازگشت</Link>
        </Button>
        <span className="ms-auto truncate rounded-lg bg-ink px-2.5 py-1.5 text-caption font-medium text-primary-foreground">
          آرشیو دفاتر
        </span>
      </div>

      <header className="mb-4 space-y-1">
        <h1 className="text-title font-bold tracking-tight text-foreground">
          آرشیو
        </h1>
        <p className="text-caption leading-relaxed text-muted-foreground">
          دفاتر آرشیوشده اینجا می‌مانند. حذف دائمی فقط از این صفحه و با تأیید
          انجام می‌شود.
        </p>
      </header>

      {archivedName ? (
        <p
          className="mb-3 rounded-xl bg-success-soft px-3 py-2.5 text-caption font-medium text-success"
          role="status"
        >
          دفتر «{archivedName}» آرشیو شد.
        </p>
      ) : null}

      <ArchivedSpacesList spaces={spaces} />
    </main>
  );
}
