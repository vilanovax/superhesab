import { prisma } from "@/lib/db/prisma";
import { getTemplate } from "@/lib/templates/registry";
import type { SpaceType } from "@/types";

/**
 * Server-side guard before any SpaceMember create (invite, virtual, claim).
 * Enforces solo templates and maxMembers (خانه / PARTNER / …).
 */
export async function assertCanAddSpaceMember(
  spaceId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: {
      type: true,
      _count: { select: { members: true } },
    },
  });

  if (!space) {
    return { ok: false, error: "فضا پیدا نشد." };
  }

  return assertMembershipLimit(space.type, space._count.members);
}

export function assertSoloMembershipLimit(
  type: SpaceType,
  existingMemberCount: number,
): { ok: true } | { ok: false; error: string } {
  return assertMembershipLimit(type, existingMemberCount);
}

export function assertMembershipLimit(
  type: SpaceType,
  existingMemberCount: number,
): { ok: true } | { ok: false; error: string } {
  const template = getTemplate(type);

  if (template.features.solo && existingMemberCount >= 1) {
    return {
      ok: false,
      error: "فضای شخصی نمی‌تواند بیش از یک عضو داشته باشد.",
    };
  }

  const max = template.maxMembers;
  if (max != null && existingMemberCount >= max) {
    return {
      ok: false,
      error:
        type === "FAMILY"
          ? "دفتر خانه حداکثر ۸ عضو دارد."
          : type === "PARTNER"
            ? "حساب مشترک حداکثر ۲ عضو دارد."
            : `ظرفیت اعضا تکمیل است (حداکثر ${max}).`,
    };
  }

  return { ok: true };
}
