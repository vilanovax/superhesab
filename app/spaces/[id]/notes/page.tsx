import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getChecklist } from "@/app/actions/checklist";
import { getSpaceNote } from "@/app/actions/notes";
import { SpaceNotesPanel } from "@/components/spaces/space-notes-panel";
import { SpaceTheme } from "@/components/spaces/space-theme";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { canEditChecklist } from "@/lib/rbac";
import { getTemplate, getTemplateDataset } from "@/lib/templates/registry";

type NotesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SpaceNotesPage({ params }: NotesPageProps) {
  const [{ id }, session] = await Promise.all([params, requireUser()]);
  const membership = await requireSpaceMember(id, session.userId);
  if (!membership) notFound();

  const space = membership.space;
  const template = getTemplate(space.type);
  const { features } = template;

  if (features.buildingCharges && membership.role === "VIEWER") {
    redirect(`/spaces/${id}/resident`);
  }
  if (features.fundRotating && membership.role === "VIEWER") {
    redirect(`/spaces/${id}/member`);
  }
  if (!features.checklist) {
    redirect(`/spaces/${id}`);
  }

  const canMutate = canEditChecklist(membership.role);
  const [checklist, note] = await Promise.all([
    getChecklist(id),
    getSpaceNote(id),
  ]);
  const openTasks = checklist.filter((i) => !i.isCompleted).length;

  return (
    <main
      data-template={getTemplateDataset(space.type)}
      className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col gap-3 px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-5"
    >
      <SpaceTheme type={space.type} />

      <header className="surface-hero animate-fade-up relative overflow-hidden rounded-2xl px-3 py-3 shadow-md">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-8 -top-10 size-24 rounded-full bg-on-hero/12 blur-3xl"
        />
        <div className="relative flex items-center gap-2.5">
          <Link
            href={`/spaces/${space.id}`}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-on-hero/12 px-3 text-caption font-medium text-on-hero/90 ring-1 ring-on-hero/15 transition-colors hover:bg-on-hero/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-hero/40"
          >
            ← بازگشت
          </Link>
          <div className="min-w-0 flex-1 text-start">
            <p className="truncate text-micro font-medium text-on-hero/60">
              {space.name}
            </p>
            <h1 className="truncate text-base font-bold leading-tight text-on-hero">
              یادداشت و کارها
            </h1>
          </div>
          {openTasks > 0 ? (
            <span className="shrink-0 rounded-full bg-on-hero/15 px-2.5 py-1 text-[11px] font-bold tabular-nums text-on-hero ring-1 ring-on-hero/20">
              {openTasks.toLocaleString("fa-IR")} کار باز
            </span>
          ) : null}
        </div>
      </header>

      <SpaceNotesPanel
        spaceId={space.id}
        note={note}
        checklist={checklist}
        canMutate={canMutate}
      />
    </main>
  );
}
