import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/session";

/** Lean space row reused across a single RSC/action request. */
export const getSpaceMeta = cache(async (id: string) => {
  return prisma.space.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      type: true,
      ownerId: true,
      currency: true,
      defaultPlanYear: true,
      archivedAt: true,
      roundUpToThousand: true,
      monthlyBudget: true,
    },
  });
});

/**
 * Request-scoped session + stale-JWT check.
 * Wrapped in React cache() so parallel Server Actions / loaders in one render
 * share a single user.findUnique.
 */
export const requireUser = cache(async function requireUser() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Stale JWT after db seed/reset → clear cookie or /login ↔ /app loops
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true },
  });
  if (!user) {
    redirect("/auth/session/clear?next=/login");
  }

  return session;
});

/**
 * Membership + space meta for one (spaceId, userId) per request.
 * `allowArchived` is a primitive so cache() keys correctly (objects would miss).
 */
export const requireSpaceMember = cache(async function requireSpaceMember(
  spaceId: string,
  userId: string,
  allowArchived = false,
) {
  const [membership, space] = await Promise.all([
    prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: { spaceId, userId },
      },
      select: {
        id: true,
        spaceId: true,
        userId: true,
        role: true,
        defaultShare: true,
        createdAt: true,
      },
    }),
    getSpaceMeta(spaceId),
  ]);

  if (!membership || !space) {
    return null;
  }

  if (space.archivedAt && !allowArchived) {
    return null;
  }

  return { ...membership, space };
});
