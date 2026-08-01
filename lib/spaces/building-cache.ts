import "server-only";

import { unstable_cache, updateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";

/** Cross-request cache tags — only for rarely-changing BUILDING meta. */
export function spaceUnitsTag(spaceId: string): string {
  return `space:${spaceId}:units`;
}

export function spaceChargePlanTag(spaceId: string, year: number): string {
  return `space:${spaceId}:charge-plan:${year}`;
}

export type CachedBuildingUnit = {
  id: string;
  name: string;
  area: number | null;
  multiplier: number;
  isActive: boolean;
  inviteToken: string;
  linkedUserId: string | null;
  linkedAt: Date | null;
  linkedUser: { name: string | null; phone: string } | null;
};

export type CachedChargePlan = {
  id: string;
  year: number;
  baseCharge: number;
};

/** Units change on create/update/link/invite — not on every payment. */
export function getCachedBuildingUnits(
  spaceId: string,
): Promise<CachedBuildingUnit[]> {
  return unstable_cache(
    async () =>
      prisma.unit.findMany({
        where: { spaceId },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          area: true,
          multiplier: true,
          isActive: true,
          inviteToken: true,
          linkedUserId: true,
          linkedAt: true,
          linkedUser: { select: { name: true, phone: true } },
        },
      }),
    ["building-units", spaceId],
    {
      tags: [spaceUnitsTag(spaceId)],
      revalidate: 3600,
    },
  )();
}

/** Base charge plan for a Jalali year — rare writes. */
export function getCachedChargePlan(
  spaceId: string,
  year: number,
): Promise<CachedChargePlan | null> {
  return unstable_cache(
    async () =>
      prisma.chargePlan.findUnique({
        where: { spaceId_year: { spaceId, year } },
        select: { id: true, year: true, baseCharge: true },
      }),
    ["building-charge-plan", spaceId, String(year)],
    {
      tags: [spaceChargePlanTag(spaceId, year)],
      revalidate: 3600,
    },
  )();
}

/** Immediate invalidation from Server Actions (read-your-own-writes). */
export function invalidateSpaceUnits(spaceId: string): void {
  updateTag(spaceUnitsTag(spaceId));
}

export function invalidateSpaceChargePlan(
  spaceId: string,
  year: number,
): void {
  updateTag(spaceChargePlanTag(spaceId, year));
}
