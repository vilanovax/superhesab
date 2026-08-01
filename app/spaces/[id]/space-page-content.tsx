import { Suspense } from "react";
import { SpacePanelFallback } from "@/components/spaces/space-panel-fallback";
import { SpaceTheme } from "@/components/spaces/space-theme";
import type { SessionPayload } from "@/lib/session";
import {
  resolveSpacePageCtx,
  type SpaceMembership,
  type SpacePageSearchParams,
} from "@/lib/spaces/space-page-ctx";
import { getTemplateDataset } from "@/lib/templates/registry";
import { SpacePageBody } from "./space-page-body";
import { SpacePageHero } from "./space-page-hero";

type SpacePageContentProps = {
  id: string;
  session: SessionPayload;
  membership: SpaceMembership;
  searchParams: SpacePageSearchParams;
};

function HeroFallback() {
  return (
    <div className="mb-4 space-y-3" aria-hidden>
      <div className="flex items-center gap-2">
        <div className="h-9 w-24 animate-pulse rounded-xl bg-muted" />
        <div className="ms-auto h-9 w-28 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="h-36 animate-pulse rounded-[1.25rem] bg-primary/15" />
    </div>
  );
}

function TabsFallback() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="grid h-11 grid-cols-4 gap-1 rounded-2xl bg-muted/70 p-1">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-card/80" />
        ))}
      </div>
      <SpacePanelFallback rows={5} />
    </div>
  );
}

/**
 * Resolves light privacy/params, then streams hero and tabs in separate
 * Suspense boundaries so chrome+hero can paint before ledger/deferred tabs.
 */
export async function SpacePageContent({
  id,
  session,
  membership,
  searchParams,
}: SpacePageContentProps) {
  const ctx = await resolveSpacePageCtx({
    id,
    session,
    membership,
    searchParams,
  });

  const templateDataset = getTemplateDataset(membership.space.type);

  return (
    <main
      data-template={templateDataset}
      className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-5"
    >
      <SpaceTheme type={membership.space.type} />
      <Suspense fallback={<HeroFallback />}>
        <SpacePageHero ctx={ctx} />
      </Suspense>
      <Suspense fallback={<TabsFallback />}>
        <SpacePageBody ctx={ctx} />
      </Suspense>
    </main>
  );
}
