"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guards";
import { getTemplate } from "@/lib/templates/registry";

export type JoinSpaceResult =
  | { ok: true; alreadyMember: boolean }
  | { ok: false; error: string };

export async function getInviteSpace(spaceId: string) {
  return prisma.space.findUnique({
    where: { id: spaceId },
    select: {
      id: true,
      name: true,
      type: true,
      currency: true,
      _count: { select: { members: true } },
    },
  });
}

export async function joinSpace(spaceId: string): Promise<JoinSpaceResult> {
  const session = await requireUser();

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { id: true },
  });

  if (!space) {
    return { ok: false, error: "فضا پیدا نشد." };
  }

  const existing = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: { spaceId, userId: session.userId },
    },
  });

  if (existing) {
    return { ok: true, alreadyMember: true };
  }

  await prisma.spaceMember.create({
    data: {
      spaceId,
      userId: session.userId,
      role: "EDITOR",
    },
  });

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath("/app");
  revalidatePath(`/invite/${spaceId}`);

  return { ok: true, alreadyMember: false };
}

export async function joinSpaceAndRedirect(spaceId: string) {
  const result = await joinSpace(spaceId);
  if (!result.ok) {
    redirect(`/invite/${spaceId}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/spaces/${spaceId}`);
}

export async function getInviteMeta(spaceId: string) {
  const space = await getInviteSpace(spaceId);
  if (!space) return null;
  return {
    ...space,
    templateLabel: getTemplate(space.type).label,
  };
}
