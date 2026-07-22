"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";

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
    orderBy: { createdAt: "asc" },
  });
}

export async function addChecklistItem(
  spaceId: string,
  title: string,
): Promise<ChecklistActionResult> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "به این فضا دسترسی ندارید." };
  }

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
  return { ok: true };
}

export async function toggleChecklistItem(
  itemId: string,
  currentStatus: boolean,
  spaceId: string,
): Promise<ChecklistActionResult> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "به این فضا دسترسی ندارید." };
  }

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
  return { ok: true };
}

export async function deleteChecklistItem(
  itemId: string,
  spaceId: string,
): Promise<ChecklistActionResult> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "به این فضا دسترسی ندارید." };
  }

  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, spaceId },
  });
  if (!item) {
    return { ok: false, error: "آیتم پیدا نشد." };
  }

  await prisma.checklistItem.delete({ where: { id: itemId } });
  revalidatePath(`/spaces/${spaceId}`);
  return { ok: true };
}
