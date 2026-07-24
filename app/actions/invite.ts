"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guards";
import { assertCanAddSpaceMember } from "@/lib/spaces/membership-guards";
import { getTemplate } from "@/lib/templates/registry";
import type { SpaceRole } from "@/types";

export type JoinSpaceResult =
  | { ok: true; alreadyMember: boolean }
  | { ok: false; error: string };

function resolveInviteRole(
  spaceType: Parameters<typeof getTemplate>[0],
  requested?: string | null,
): SpaceRole {
  const template = getTemplate(spaceType);
  if (requested === "VIEWER" || requested === "EDITOR") {
    return requested;
  }
  return template.defaultInviteRole;
}

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

export async function joinSpace(
  spaceId: string,
  inviteRole?: string | null,
): Promise<JoinSpaceResult> {
  const session = await requireUser();

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { id: true, type: true },
  });

  if (!space) {
    return { ok: false, error: "فضا پیدا نشد." };
  }

  const template = getTemplate(space.type);
  if (!template.features.invites) {
    return { ok: false, error: "این فضا دعوت‌پذیر نیست." };
  }

  const existing = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: { spaceId, userId: session.userId },
    },
  });

  if (existing) {
    return { ok: true, alreadyMember: true };
  }

  const canAdd = await assertCanAddSpaceMember(spaceId);
  if (!canAdd.ok) {
    return canAdd;
  }

  const role = resolveInviteRole(space.type, inviteRole);

  await prisma.spaceMember.create({
    data: {
      spaceId,
      userId: session.userId,
      role,
    },
  });

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath("/app");
  revalidatePath(`/invite/${spaceId}`);

  return { ok: true, alreadyMember: false };
}

export async function joinSpaceAndRedirect(
  spaceId: string,
  inviteRole?: string | null,
) {
  const result = await joinSpace(spaceId, inviteRole);
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
    invitesEnabled: getTemplate(space.type).features.invites,
    allowInviteRolePick: getTemplate(space.type).features.householdLedger,
  };
}
