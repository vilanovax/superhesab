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

function TabsFallback() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="grid h-12 grid-cols-4 gap-1 rounded-[1.15rem] border border-border/45 bg-card p-1 shadow-sm">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-muted/60" />
        ))}
      </div>
      <SpacePanelFallback rows={5} />
    </div>
  );
}

/**
 * Sync shell (theme + hero chrome) paints immediately. Hero card and tabs
 * stream via Suspense; both share one ctx promise.
 */
export function SpacePageContent({
  id,
  session,
  membership,
  searchParams,
}: SpacePageContentProps) {
  const ctxPromise = resolveSpacePageCtx({
    id,
    session,
    membership,
    searchParams,
  });

  const templateDataset = getTemplateDataset(membership.space.type);

  return (
    <main
      data-template={templateDataset}
      className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-[calc(5.5rem+max(env(safe-area-inset-bottom,0px),var(--vv-bottom,0px)))] pt-4 sm:px-5"
    >
      <SpaceTheme type={membership.space.type} />
      <SpacePageHero
        spaceId={id}
        membership={membership}
        ctxPromise={ctxPromise}
      />
      <Suspense fallback={<TabsFallback />}>
        <SpacePageBody ctxPromise={ctxPromise} />
      </Suspense>
    </main>
  );
}
