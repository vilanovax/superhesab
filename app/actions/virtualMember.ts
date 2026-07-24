"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { canManageMembers } from "@/lib/rbac";
import { assertCanAddSpaceMember } from "@/lib/spaces/membership-guards";
import { getTemplate } from "@/lib/templates/registry";

export type VirtualMemberResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/**
 * Path B — Ghost user: create a non-login User + SpaceMember so they
 * participate in expenses/splits/settlements without installing the app.
 * OWNER only. Role defaults to EDITOR (claimable later via invite link).
 */
export async function addVirtualMember(
  spaceId: string,
  name: string,
  role: "EDITOR" | "VIEWER" = "EDITOR",
): Promise<VirtualMemberResult> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "به این فضا دسترسی ندارید." };
  }
  if (!canManageMembers(membership.role)) {
    return { ok: false, error: "فقط مالک می‌تواند عضو دستی اضافه کند." };
  }

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { type: true },
  });
  if (!space) {
    return { ok: false, error: "فضا پیدا نشد." };
  }

  const template = getTemplate(space.type);
  if (!template.features.invites || template.features.solo) {
    return { ok: false, error: "این فضا عضو جدید نمی‌پذیرد." };
  }

  const canAdd = await assertCanAddSpaceMember(spaceId);
  if (!canAdd.ok) {
    return canAdd;
  }

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "نام باید حداقل ۲ حرف باشد." };
  }
  if (trimmed.length > 40) {
    return { ok: false, error: "نام خیلی طولانی است." };
  }

  const phone = `virtual_${randomUUID().replace(/-/g, "")}`;

  const user = await prisma.user.create({
    data: {
      phone,
      name: trimmed,
      isVirtual: true,
      memberships: {
        create: {
          spaceId,
          role,
        },
      },
    },
    select: { id: true },
  });

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath("/app");

  return { ok: true, userId: user.id };
}
