import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listBuildingContacts } from "@/app/actions/building-contacts";
import { BuildingContactsPanel } from "@/components/spaces/building-contacts-panel";
import { SpaceTheme } from "@/components/spaces/space-theme";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { canMutateMoney } from "@/lib/rbac";
import { getTemplate, getTemplateDataset } from "@/lib/templates/registry";

type ContactsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BuildingContactsPage({
  params,
}: ContactsPageProps) {
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
  const contacts = await listBuildingContacts(id);
  const visibleToResidents = contacts.filter((c) => c.visibleToResidents).length;

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
              شماره‌های ضروری
            </h1>
          </div>
          {contacts.length > 0 ? (
            <span className="shrink-0 rounded-full bg-on-hero/15 px-2.5 py-1 text-[11px] font-bold tabular-nums text-on-hero ring-1 ring-on-hero/20">
              {contacts.length.toLocaleString("fa-IR")}
              {visibleToResidents > 0
                ? ` · ${visibleToResidents.toLocaleString("fa-IR")} ساکن`
                : ""}
            </span>
          ) : null}
        </div>
      </header>

      <BuildingContactsPanel
        spaceId={space.id}
        contacts={contacts}
        canMutate={canWrite}
      />
    </main>
  );
}
