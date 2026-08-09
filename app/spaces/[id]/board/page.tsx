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
import { canMutateMoney } from "@/lib/rbac";
import { getTemplate, getTemplateDataset } from "@/lib/templates/registry";

type BoardPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BuildingBoardPage({ params }: BoardPageProps) {
  const [{ id }, session] = await Promise.all([params, requireUser()]);
  const membership = await requireSpaceMember(id, session.userId);
  if (!membership) notFound();

  if (membership.role === "VIEWER") {
    redirect(`/spaces/${id}/resident`);
  }

  const space = membership.space;
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
          variant="ghost"
          size="sm"
          className="h-10 gap-1 rounded-full border border-border/55 bg-card px-3 text-sm font-medium shadow-none"
        >
          <Link href={`/spaces/${space.id}`}>← بازگشت</Link>
        </Button>
        <span className="rounded-full bg-primary/10 px-3 py-1.5 text-caption font-semibold text-primary">
          برد
        </span>
      </div>

      <header className="surface-hero animate-fade-up relative overflow-hidden rounded-3xl px-5 py-5 shadow-md">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-10 -top-12 size-32 rounded-full bg-on-hero/12 blur-3xl"
        />
        <div className="relative">
          <p className="text-caption font-medium text-on-hero/70">{space.name}</p>
          <h1 className="mt-0.5 text-pretty text-xl font-bold text-on-hero">
            برد ساختمان
          </h1>
          <p className="mt-1 text-caption text-on-hero/75">
            اعلان‌ها برای ساکنین و صندوق پیشنهادات
          </p>
        </div>
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
