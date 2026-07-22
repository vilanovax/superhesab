"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";

export type VirtualMemberResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/**
 * Path B — Ghost user: create a non-login User + SpaceMember so they
 * participate in expenses/splits/settlements without installing the app.
 */
export async function addVirtualMember(
  spaceId: string,
  name: string,
): Promise<VirtualMemberResult> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "به این فضا دسترسی ندارید." };
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
          role: "EDITOR",
        },
      },
    },
    select: { id: true },
  });

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath("/app");

  return { ok: true, userId: user.id };
}
