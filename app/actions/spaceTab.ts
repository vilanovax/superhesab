"use server";

import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { tehranCivilYear } from "@/lib/building";
import { privateCategoriesHiddenFromViewer } from "@/lib/category-privacy";
import { prisma } from "@/lib/db/prisma";
import { jalaliMonthBounds, jalaliYearBounds } from "@/lib/jalali";
import { loadDeferredTabData } from "@/lib/spaces/load-deferred-tab";
import {
  resolveDefaultTab,
  type DeferredTabPayload,
  type SpaceTabId,
} from "@/lib/spaces/space-tab-data";
import { getTemplate } from "@/lib/templates/registry";

export type LoadSpaceTabResult =
  | { ok: true; tab: SpaceTabId; data: DeferredTabPayload }
  | { ok: false; error: string };

/**
 * Client-triggered fetch when the user opens a tab that was not on the
 * initial RSC payload.
 */
export async function loadSpaceTabData(input: {
  spaceId: string;
  tab: string;
  year?: number;
  reportMonth?: number | null;
}): Promise<LoadSpaceTabResult> {
  const session = await requireUser();
  const membership = await requireSpaceMember(input.spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "به این فضا دسترسی ندارید." };
  }

  const features = getTemplate(membership.space.type).features;
  const tab = resolveDefaultTab(features, input.tab);

  const needsPlanYear =
    tab === "charges" ||
    tab === "units" ||
    tab === "report" ||
    (tab === "expenses" && features.buildingCharges) ||
    Boolean(features.buildingCharges && input.year);

  const planYear = needsPlanYear
    ? input.year && input.year >= 1390 && input.year <= 1500
      ? input.year
      : membership.space.defaultPlanYear &&
          membership.space.defaultPlanYear >= 1390 &&
          membership.space.defaultPlanYear <= 1500
        ? membership.space.defaultPlanYear
        : tehranCivilYear()
    : tehranCivilYear();

  const reportMonth =
    tab === "report" &&
    features.buildingCharges &&
    input.reportMonth != null &&
    input.reportMonth >= 1 &&
    input.reportMonth <= 12
      ? input.reportMonth
      : null;

  /** Report tab range; BUILDING expenses use planYear inside loadDeferredTabData. */
  const reportRange =
    tab === "report" && features.buildingCharges
      ? reportMonth != null
        ? jalaliMonthBounds(planYear, reportMonth)
        : jalaliYearBounds(planYear)
      : null;

  const categoryPolicies =
    features.categoryPrivacy &&
    (tab === "expenses" || tab === "report")
      ? await prisma.spaceCategoryPolicy.findMany({
          where: { spaceId: input.spaceId, visibility: "PRIVATE" },
          select: {
            category: true,
            visibility: true,
            ownerUserId: true,
          },
        })
      : [];
  const hiddenCategories = privateCategoriesHiddenFromViewer(
    categoryPolicies,
    session.userId,
    {
      spaceOwnerId: membership.space.ownerId,
      viewerIsSpaceOwner: membership.role === "OWNER",
    },
  );

  const data = await loadDeferredTabData({
    spaceId: input.spaceId,
    tab,
    features,
    role: membership.role,
    planYear,
    reportRange,
    hiddenCategories,
    viewerUserId: session.userId,
    // Proofs hydrate after charges paint on the client.
    includeChargeProofs: false,
  });

  return { ok: true, tab, data };
}

/** Lightweight proofs fetch after charges paint (BUILDING Phase A). */
export async function loadSpaceChargeProofs(input: {
  spaceId: string;
  year?: number;
}): Promise<
  | {
      ok: true;
      proofs: import("@/app/actions/building").ChargePaymentProofDTO[];
    }
  | { ok: false; error: string }
> {
  const { listChargeProofsForManager } = await import(
    "@/app/actions/building"
  );
  const session = await requireUser();
  const membership = await requireSpaceMember(input.spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "به این فضا دسترسی ندارید." };
  }
  if (membership.role !== "OWNER" && membership.role !== "EDITOR") {
    return { ok: true, proofs: [] };
  }
  const features = getTemplate(membership.space.type).features;
  if (!features.buildingCharges) {
    return { ok: true, proofs: [] };
  }
  const planYear =
    input.year && input.year >= 1390 && input.year <= 1500
      ? input.year
      : membership.space.defaultPlanYear &&
          membership.space.defaultPlanYear >= 1390 &&
          membership.space.defaultPlanYear <= 1500
        ? membership.space.defaultPlanYear
        : tehranCivilYear();
  const proofs = await listChargeProofsForManager(input.spaceId, planYear);
  return { ok: true, proofs };
}
