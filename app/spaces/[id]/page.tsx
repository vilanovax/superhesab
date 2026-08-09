import { notFound, redirect } from "next/navigation";
import { ensureRecurringExpenses } from "@/app/actions/recurring";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { getTemplate } from "@/lib/templates/registry";
import { after } from "next/server";
import { SpacePageContent } from "./space-page-content";

type SpacePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    year?: string;
    tab?: string;
    rm?: string;
    period?: string;
  }>;
};

/**
 * Auth + redirects return immediately. SpacePageContent is sync and starts
 * ctx without awaiting — hero/body stream via inner Suspense boundaries.
 */
export default async function SpacePage({ params, searchParams }: SpacePageProps) {
  const [{ id }, sp, session] = await Promise.all([
    params,
    searchParams,
    requireUser(),
  ]);
  const membership = await requireSpaceMember(id, session.userId);

  if (!membership) {
    notFound();
  }

  const features = getTemplate(membership.space.type).features;

  // Building residents (VIEWER) use the unit portal, not the manager dashboard.
  if (features.buildingCharges && membership.role === "VIEWER") {
    redirect(`/spaces/${id}/resident`);
  }

  // FUND members with VIEWER role use the member portal (+ payment proofs).
  if (features.fundRotating && membership.role === "VIEWER") {
    redirect(`/spaces/${id}/member`);
  }

  // Board moved out of the tab bar → dedicated route.
  if (sp.tab === "suggestions") {
    redirect(`/spaces/${id}/board`);
  }

  if (features.recurring) {
    after(() => {
      void ensureRecurringExpenses(id);
    });
  }

  return (
    <SpacePageContent
      id={id}
      session={session}
      membership={membership}
      searchParams={sp}
    />
  );
}
