"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { clampShare, MAX_SHARE } from "@/lib/money";
import { getTemplate } from "@/lib/templates/registry";
import type { SpaceRole } from "@/types";

export type MemberActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function changeMemberRole(
  spaceId: string,
  memberUserId: string,
  newRole: "EDITOR" | "VIEWER",
): Promise<MemberActionResult> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership || membership.role !== "OWNER") {
    return { ok: false, error: "فقط مالک می‌تواند نقش‌ها را تغییر دهد." };
  }

  if (memberUserId === session.userId) {
    return { ok: false, error: "نمی‌توانید نقش خودتان را عوض کنید." };
  }

  const target = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: { spaceId, userId: memberUserId },
    },
  });
  if (!target) {
    return { ok: false, error: "عضو پیدا نشد." };
  }
  if (target.role === "OWNER") {
    return { ok: false, error: "نقش مالک قابل تغییر نیست." };
  }

  await prisma.spaceMember.update({
    where: { id: target.id },
    data: { role: newRole },
  });

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath(`/spaces/${spaceId}/settings`);
  return { ok: true };
}

export async function updateMemberDefaultShare(
  spaceId: string,
  memberUserId: string,
  defaultShare: number,
): Promise<MemberActionResult> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership || membership.role !== "OWNER") {
    return { ok: false, error: "فقط مالک می‌تواند ضریب تسهیم را عوض کند." };
  }

  const share = clampShare(defaultShare);

  const target = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: { spaceId, userId: memberUserId },
    },
    select: { id: true },
  });
  if (!target) {
    return { ok: false, error: "عضو پیدا نشد." };
  }

  await prisma.spaceMember.update({
    where: { id: target.id },
    data: { defaultShare: share },
  });

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath(`/spaces/${spaceId}/settings`);
  return { ok: true };
}

/**
 * Claim a virtual member's identity: reassign money rows to the real user,
 * inherit membership role, remove virtual membership (and User if unused).
 */
export async function claimVirtualProfile(
  spaceId: string,
  virtualUserId: string,
): Promise<MemberActionResult> {
  const session = await requireUser();
  const realUserId = session.userId;

  if (virtualUserId === realUserId) {
    return { ok: false, error: "این پروفایل متعلق به خودتان است." };
  }

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { id: true, type: true },
  });
  if (!space) {
    return { ok: false, error: "فضا پیدا نشد." };
  }

  const template = getTemplate(space.type);
  if (template.features.solo) {
    return { ok: false, error: "فضای شخصی عضو مجازی ندارد." };
  }

  const virtualUser = await prisma.user.findUnique({
    where: { id: virtualUserId },
    select: { id: true, isVirtual: true, name: true },
  });
  if (!virtualUser || !virtualUser.isVirtual) {
    return { ok: false, error: "پروفایل مجازی معتبر نیست." };
  }

  const virtualMembership = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: { spaceId, userId: virtualUserId },
    },
  });
  if (!virtualMembership) {
    return { ok: false, error: "این عضو در فضا نیست یا قبلاً ادعا شده." };
  }

  const inheritedRole: SpaceRole =
    virtualMembership.role === "OWNER" ? "EDITOR" : virtualMembership.role;

  try {
    await prisma.$transaction(async (tx) => {
      // a) Expenses paid by virtual → real
      await tx.expense.updateMany({
        where: { spaceId, paidById: virtualUserId },
        data: { paidById: realUserId },
      });

      // a2) Audit actors on expenses
      await tx.expense.updateMany({
        where: { spaceId, createdById: virtualUserId },
        data: { createdById: realUserId },
      });
      await tx.expense.updateMany({
        where: { spaceId, updatedById: virtualUserId },
        data: { updatedById: realUserId },
      });

      // b) Splits — merge if real already has a row on same expense
      const virtualSplits = await tx.expenseSplit.findMany({
        where: {
          userId: virtualUserId,
          expense: { spaceId },
        },
      });

      for (const split of virtualSplits) {
        const existing = await tx.expenseSplit.findUnique({
          where: {
            expenseId_userId: {
              expenseId: split.expenseId,
              userId: realUserId,
            },
          },
        });
        if (existing) {
          await tx.expenseSplit.update({
            where: { id: existing.id },
            data: {
              owedAmount: existing.owedAmount + split.owedAmount,
              share: Math.min(MAX_SHARE, existing.share + split.share),
            },
          });
          await tx.expenseSplit.delete({ where: { id: split.id } });
        } else {
          await tx.expenseSplit.update({
            where: { id: split.id },
            data: { userId: realUserId },
          });
        }
      }

      // c) Settlements both directions
      await tx.settlement.updateMany({
        where: { spaceId, fromUserId: virtualUserId },
        data: { fromUserId: realUserId },
      });
      await tx.settlement.updateMany({
        where: { spaceId, toUserId: virtualUserId },
        data: { toUserId: realUserId },
      });
      await tx.settlement.deleteMany({
        where: {
          spaceId,
          fromUserId: realUserId,
          toUserId: realUserId,
        },
      });

      // d) Upsert real membership — inherit virtual role (never OWNER)
      const realMembership = await tx.spaceMember.findUnique({
        where: {
          spaceId_userId: { spaceId, userId: realUserId },
        },
      });

      if (realMembership) {
        if (
          realMembership.role !== "OWNER" &&
          inheritedRole === "EDITOR" &&
          realMembership.role === "VIEWER"
        ) {
          await tx.spaceMember.update({
            where: { id: realMembership.id },
            data: { role: "EDITOR" },
          });
        }
      } else {
        await tx.spaceMember.create({
          data: {
            spaceId,
            userId: realUserId,
            role: inheritedRole,
          },
        });
      }

      // e) Remove virtual membership in this space
      await tx.spaceMember.delete({
        where: { id: virtualMembership.id },
      });

      // f) Delete virtual User only if no other memberships
      const otherMemberships = await tx.spaceMember.count({
        where: { userId: virtualUserId },
      });
      if (otherMemberships === 0) {
        await tx.user.delete({ where: { id: virtualUserId } });
      }
    });
  } catch {
    return {
      ok: false,
      error: "ادغام پروفایل ناموفق بود. دوباره تلاش کنید.",
    };
  }

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath("/app");
  revalidatePath(`/invite/${spaceId}`);
  return { ok: true };
}

export async function getClaimPreview(spaceId: string, virtualUserId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: virtualUserId,
      isVirtual: true,
      memberships: { some: { spaceId } },
    },
    select: {
      id: true,
      name: true,
      memberships: {
        where: { spaceId },
        select: { role: true },
        take: 1,
      },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name?.trim() || "همسفر",
    role: user.memberships[0]?.role ?? "EDITOR",
  };
}
