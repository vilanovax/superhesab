"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { canEditChecklist } from "@/lib/rbac";
import { getTemplate } from "@/lib/templates/registry";

export type ChecklistItemDTO = {
  id: string;
  spaceId: string;
  title: string;
  isCompleted: boolean;
  createdAt: Date;
};

export type ChecklistActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function getChecklist(
  spaceId: string,
): Promise<ChecklistItemDTO[]> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return [];
  }

  return prisma.checklistItem.findMany({
    where: { spaceId },
    orderBy: [{ isCompleted: "asc" }, { createdAt: "asc" }],
  });
}

async function assertCanEditChecklist(spaceId: string, userId: string) {
  const membership = await requireSpaceMember(spaceId, userId);
  if (!membership) {
    return { ok: false as const, error: "به این فضا دسترسی ندارید." };
  }
  if (!getTemplate(membership.space.type).features.checklist) {
    return { ok: false as const, error: "لیست کار در این قالب فعال نیست." };
  }
  if (!canEditChecklist(membership.role)) {
    return {
      ok: false as const,
      error: "نقش ناظر اجازه تغییر لیست کار ندارد.",
    };
  }
  return { ok: true as const };
}

export async function addChecklistItem(
  spaceId: string,
  title: string,
): Promise<ChecklistActionResult> {
  const session = await requireUser();
  const access = await assertCanEditChecklist(spaceId, session.userId);
  if (!access.ok) return access;

  const trimmed = title.trim();
  if (trimmed.length < 1) {
    return { ok: false, error: "عنوان آیتم خالی است." };
  }

  await prisma.checklistItem.create({
    data: {
      spaceId,
      title: trimmed,
      isCompleted: false,
    },
  });

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath(`/spaces/${spaceId}/notes`);
  return { ok: true };
}

export async function toggleChecklistItem(
  itemId: string,
  currentStatus: boolean,
  spaceId: string,
): Promise<ChecklistActionResult> {
  const session = await requireUser();
  const access = await assertCanEditChecklist(spaceId, session.userId);
  if (!access.ok) return access;

  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, spaceId },
  });
  if (!item) {
    return { ok: false, error: "آیتم پیدا نشد." };
  }

  await prisma.checklistItem.update({
    where: { id: itemId },
    data: { isCompleted: !currentStatus },
  });

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath(`/spaces/${spaceId}/notes`);
  return { ok: true };
}

export async function deleteChecklistItem(
  itemId: string,
  spaceId: string,
): Promise<ChecklistActionResult> {
  const session = await requireUser();
  const access = await assertCanEditChecklist(spaceId, session.userId);
  if (!access.ok) return access;

  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, spaceId },
  });
  if (!item) {
    return { ok: false, error: "آیتم پیدا نشد." };
  }

  await prisma.checklistItem.delete({ where: { id: itemId } });
  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath(`/spaces/${spaceId}/notes`);
  return { ok: true };
}
