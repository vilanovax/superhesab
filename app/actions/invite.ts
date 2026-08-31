"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import {
  inviteRoleForToken,
  signSpaceInviteToken,
  verifySpaceInviteToken,
} from "@/lib/invite-token";
import { canMutateMoney } from "@/lib/rbac";
import { assertCanAddSpaceMember } from "@/lib/spaces/membership-guards";
import { getTemplate } from "@/lib/templates/registry";
import type { SpaceRole } from "@/types";

export type JoinSpaceResult =
  | { ok: true; alreadyMember: boolean }
  | { ok: false; error: string };

export type MintInviteLinkResult =
  | { ok: true; path: string; urlPath: string }
  | { ok: false; error: string };

function resolveInviteRoleForSpace(
  spaceType: Parameters<typeof getTemplate>[0],
  tokenRole: "EDITOR" | "VIEWER",
): SpaceRole {
  // Building public invite = co-manager. Residents join only via unit claim.
  if (spaceType === "BUILDING") {
    return "EDITOR";
  }
  return tokenRole;
}

export async function getInviteSpace(spaceId: string) {
  return prisma.space.findUnique({
    where: { id: spaceId },
    select: {
      id: true,
      name: true,
      type: true,
      currency: true,
      archivedAt: true,
      _count: { select: { members: true } },
    },
  });
}

/**
 * Mint a signed invite URL path. Role is embedded in the token — clients
 * cannot escalate by changing query params.
 */
export async function mintSpaceInviteLink(
  spaceId: string,
  requestedRole?: string | null,
): Promise<MintInviteLinkResult> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "به این فضا دسترسی ندارید." };
  }
  if (!canMutateMoney(membership.role)) {
    return { ok: false, error: "نقش شما اجازه ساخت لینک دعوت ندارد." };
  }

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { type: true, archivedAt: true },
  });
  if (!space) {
    return { ok: false, error: "فضا پیدا نشد." };
  }
  if (space.archivedAt) {
    return { ok: false, error: "این دفتر آرشیو شده و دعوت‌پذیر نیست." };
  }

  const template = getTemplate(space.type);
  if (!template.features.invites) {
    return { ok: false, error: "این فضا دعوت‌پذیر نیست." };
  }

  const fallback = inviteRoleForToken(template.defaultInviteRole);
  const role =
    space.type === "BUILDING"
      ? ("EDITOR" as const)
      : template.features.householdLedger && requestedRole === "VIEWER"
        ? ("VIEWER" as const)
        : requestedRole === "EDITOR"
          ? ("EDITOR" as const)
          : fallback;

  const token = await signSpaceInviteToken({ spaceId, role });
  const urlPath = `/invite/${spaceId}?t=${encodeURIComponent(token)}`;
  return { ok: true, path: urlPath, urlPath };
}

export async function joinSpace(
  spaceId: string,
  inviteToken: string,
): Promise<JoinSpaceResult> {
  const session = await requireUser();

  const verified = await verifySpaceInviteToken(inviteToken);
  if (!verified || verified.spaceId !== spaceId) {
    return {
      ok: false,
      error: "لینک دعوت نامعتبر یا منقضی است. لینک جدید بخواهید.",
    };
  }

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { id: true, type: true, archivedAt: true },
  });

  if (!space) {
    return { ok: false, error: "فضا پیدا نشد." };
  }

  if (space.archivedAt) {
    return { ok: false, error: "این دفتر آرشیو شده و دعوت‌پذیر نیست." };
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

  const role = resolveInviteRoleForSpace(space.type, verified.role);

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
  inviteToken: string,
) {
  const result = await joinSpace(spaceId, inviteToken);
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
