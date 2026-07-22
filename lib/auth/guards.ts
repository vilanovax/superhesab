import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/session";

export async function requireUser() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireSpaceMember(spaceId: string, userId: string) {
  const membership = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: { spaceId, userId },
    },
    include: {
      space: {
        select: { id: true, name: true, type: true, ownerId: true },
      },
    },
  });

  if (!membership) {
    return null;
  }

  return membership;
}
