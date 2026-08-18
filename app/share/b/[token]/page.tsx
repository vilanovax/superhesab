import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getBuildingShareViewerState,
} from "@/app/actions/building-share";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { BuildingShareFollowButton } from "@/components/spaces/building-share-follow-button";
import { BuildingShareReportView } from "@/components/spaces/building-share-report";
import { SpaceTheme } from "@/components/spaces/space-theme";
import { Button } from "@/components/ui/button";
import { loadBuildingShareReport } from "@/lib/building-share";
import { getTemplateDataset } from "@/lib/templates/registry";

type SharePageProps = {
  params: Promise<{ token: string }>;
};

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "گزارش ساختمان",
};

export default async function BuildingSharePage({ params }: SharePageProps) {
  const { token } = await params;
  const [report, viewer] = await Promise.all([
    loadBuildingShareReport(token),
    getBuildingShareViewerState(token),
  ]);

  if (!report) {
    notFound();
  }

  return (
    <main
      data-template={getTemplateDataset("BUILDING")}
      className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <SpaceTheme type="BUILDING" />
      <header className="mb-4">
        <BrandLockup size="sm" className="text-muted-foreground" />
      </header>

      <section className="surface-hero relative mb-5 overflow-hidden rounded-3xl px-5 py-5 shadow-md">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          <div className="absolute -inset-e-10 -top-14 size-40 rounded-full bg-on-hero/12 blur-3xl" />
        </div>
        <div className="relative">
          <p className="text-caption font-medium text-on-hero/70">
            گزارش ساختمان · فقط مشاهده
          </p>
          <h1 className="mt-1.5 text-pretty text-[1.45rem] font-bold leading-tight tracking-tight text-on-hero">
            {report.spaceName}
          </h1>
          {report.title?.trim() ? (
            <p className="mt-1.5 text-caption text-on-hero/75">
              {report.title.trim()}
            </p>
          ) : null}
        </div>
      </section>

      <div className="mb-4">
        <BuildingShareFollowButton token={token} viewer={viewer} />
      </div>

      <BuildingShareReportView report={report} />

      <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
        این صفحه عضویت نمی‌سازد و ثبت هزینه ندارد.
      </p>
      <Button asChild variant="ghost" className="mt-2 h-11 rounded-xl">
        <Link href="/app">ورود به سوپرحساب</Link>
      </Button>
    </main>
  );
}
