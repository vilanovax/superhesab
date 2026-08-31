import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { canMutateMoney } from "@/lib/rbac";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";
import { getTemplate } from "@/lib/templates/registry";
import type { SpaceRole, SpaceType } from "@/types";

export type ExportAuth =
  | {
      ok: true;
      userId: string;
      role: SpaceRole;
      space: {
        id: string;
        name: string;
        type: SpaceType;
        currency: "TOMAN" | "RIAL" | "USD" | "AED" | "EUR";
      };
    }
  | { ok: false; status: number; error: string };

export async function authorizeSpaceExport(
  spaceId: string,
  opts: { needMutate?: boolean; buildingOnly?: boolean } = {},
): Promise<ExportAuth> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return { ok: false, status: 401, error: "unauthorized" };
  const session = await verifySessionToken(token);
  if (!session) return { ok: false, status: 401, error: "unauthorized" };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, disabledAt: true, isVirtual: true },
  });
  if (!user || user.isVirtual || user.disabledAt) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const membership = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: { spaceId, userId: session.userId },
    },
    select: { role: true },
  });
  if (!membership) return { ok: false, status: 404, error: "not found" };

  if (opts.needMutate && !canMutateMoney(membership.role)) {
    return { ok: false, status: 403, error: "forbidden" };
  }

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { id: true, name: true, type: true, currency: true },
  });
  if (!space) return { ok: false, status: 404, error: "not found" };

  if (opts.buildingOnly && !getTemplate(space.type).features.buildingCharges) {
    return { ok: false, status: 400, error: "not a building space" };
  }

  return {
    ok: true,
    userId: session.userId,
    role: membership.role,
    space,
  };
}
