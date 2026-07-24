import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/session";

export async function requireUser() {
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
}

export async function requireSpaceMember(
  spaceId: string,
  userId: string,
  opts?: { allowArchived?: boolean },
) {
  const membership = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: { spaceId, userId },
    },
    include: {
      space: {
        select: {
          id: true,
          name: true,
          type: true,
          ownerId: true,
          archivedAt: true,
        },
      },
    },
  });

  if (!membership) {
    return null;
  }

  if (membership.space.archivedAt && !opts?.allowArchived) {
    return null;
  }

  return membership;
}
