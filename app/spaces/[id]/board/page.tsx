import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  listBuildingAnnouncements,
  listBuildingSuggestions,
} from "@/app/actions/building";
import { BuildingCommunityHub } from "@/components/spaces/building-community-hub";
import { SpaceTheme } from "@/components/spaces/space-theme";
import { Button } from "@/components/ui/button";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { canMutateMoney } from "@/lib/rbac";
import { getTemplate, getTemplateDataset } from "@/lib/templates/registry";

type BoardPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BuildingBoardPage({ params }: BoardPageProps) {
  const { id } = await params;
  const session = await requireUser();
  const membership = await requireSpaceMember(id, session.userId);
  if (!membership) notFound();

  if (membership.role === "VIEWER") {
    redirect(`/spaces/${id}/resident`);
  }

  const space = await prisma.space.findUnique({
    where: { id },
    select: { id: true, name: true, type: true },
  });
  if (!space) notFound();

  const template = getTemplate(space.type);
  if (!template.features.buildingCharges) {
    redirect(`/spaces/${id}`);
  }

  const canWrite = canMutateMoney(membership.role);
  const [suggestions, announcements] = await Promise.all([
    listBuildingSuggestions(id),
    listBuildingAnnouncements(id, { includeArchived: true }),
  ]);

  return (
    <main
      data-template={getTemplateDataset(space.type)}
      className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-5"
    >
      <SpaceTheme type={space.type} />

      <div className="flex items-center justify-between gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 gap-1 rounded-xl border-border/70 bg-card pe-3 ps-2 text-sm font-medium shadow-sm"
        >
          <Link href={`/spaces/${space.id}`}>← بازگشت</Link>
        </Button>
        <span className="rounded-xl bg-ink/90 px-3 py-1.5 text-xs font-medium text-primary-foreground">
          برد
        </span>
      </div>

      <header className="surface-hero animate-fade-up rounded-2xl px-4 py-4">
        <p className="text-caption font-medium text-on-hero/70">{space.name}</p>
        <h1 className="mt-0.5 text-xl font-bold text-on-hero">برد ساختمان</h1>
        <p className="mt-1 text-caption text-on-hero/75">
          اعلان‌ها برای ساکنین و صندوق پیشنهادات
        </p>
      </header>

      <BuildingCommunityHub
        spaceId={space.id}
        suggestions={suggestions}
        announcements={announcements}
        canMutate={canWrite}
      />
    </main>
  );
}
