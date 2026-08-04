import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getResidentPortalData,
  listBuildingAnnouncements,
  listMyBuildingNotifications,
  listMyBuildingSuggestions,
  listMyChargeProofs,
} from "@/app/actions/building";
import { ResidentPortal } from "@/components/spaces/resident-portal";
import { SpaceTheme } from "@/components/spaces/space-theme";
import { Button } from "@/components/ui/button";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { getTemplateDataset } from "@/lib/templates/registry";

type ResidentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ResidentPortalPage({
  params,
}: ResidentPageProps) {
  const { id } = await params;
  const session = await requireUser();
  const membership = await requireSpaceMember(id, session.userId);
  if (!membership) {
    notFound();
  }

  // Managers stay on the main building dashboard.
  if (membership.role === "OWNER" || membership.role === "EDITOR") {
    redirect(`/spaces/${id}`);
  }

  const space = membership.space;
  if (space.type !== "BUILDING") {
    notFound();
  }

  const [data, suggestions, announcements, notifications, chargeProofs] =
    await Promise.all([
      getResidentPortalData(id),
      listMyBuildingSuggestions(id),
      listBuildingAnnouncements(id),
      listMyBuildingNotifications(id),
      listMyChargeProofs(id),
    ]);

  if (!data) {
    return (
      <main
        data-template={getTemplateDataset("BUILDING")}
        className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col gap-5 px-4 py-8"
      >
        <SpaceTheme type="BUILDING" />
        <div className="rounded-2xl border border-dashed border-border/60 bg-card px-5 py-10 text-center">
          <h1 className="text-pretty text-body font-bold text-foreground">
            واحدی به حساب شما وصل نیست
          </h1>
          <p className="mt-2 text-body-sm text-muted-foreground">
            از مدیر ساختمان لینک اختصاصی واحدتان را بگیرید و دوباره باز کنید.
          </p>
          <Button asChild className="mt-5 h-11 rounded-xl">
            <Link href="/app">بازگشت</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main
      data-template={getTemplateDataset("BUILDING")}
      className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
    >
      <SpaceTheme type="BUILDING" />
      <div className="flex items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-xl bg-card/50 px-3"
        >
          <Link href="/app">← خانه</Link>
        </Button>
        <span className="rounded-xl bg-ink/90 px-3 py-1.5 text-xs font-medium text-primary-foreground">
          پرتال ساکن · {space.name}
        </span>
      </div>
      <ResidentPortal
        data={data}
        suggestions={suggestions}
        announcements={announcements}
        notifications={notifications}
        chargeProofs={chargeProofs}
      />
    </main>
  );
}
