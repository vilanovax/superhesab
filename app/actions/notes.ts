"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { canEditChecklist } from "@/lib/rbac";
import { getTemplate } from "@/lib/templates/registry";

export type SpaceNoteDTO = {
  spaceId: string;
  body: string;
  updatedAt: string | null;
  updatedByName: string | null;
};

export type NoteActionResult =
  | { ok: true }
  | { ok: false; error: string };

const MAX_NOTE_BODY = 12_000;

async function assertNotesAccess(spaceId: string, userId: string, needWrite: boolean) {
  const membership = await requireSpaceMember(spaceId, userId);
  if (!membership) {
    return { ok: false as const, error: "به این فضا دسترسی ندارید." };
  }
  if (!getTemplate(membership.space.type).features.checklist) {
    return { ok: false as const, error: "یادداشت در این قالب فعال نیست." };
  }
  if (needWrite && !canEditChecklist(membership.role)) {
    return {
      ok: false as const,
      error: "نقش ناظر اجازه ویرایش یادداشت ندارد.",
    };
  }
  return { ok: true as const, membership };
}

export async function getSpaceNote(spaceId: string): Promise<SpaceNoteDTO> {
  const session = await requireUser();
  const access = await assertNotesAccess(spaceId, session.userId, false);
  if (!access.ok) {
    return { spaceId, body: "", updatedAt: null, updatedByName: null };
  }

  const row = await prisma.spaceNote.findUnique({
    where: { spaceId },
    select: {
      body: true,
      updatedAt: true,
      updatedBy: { select: { name: true } },
    },
  });

  if (!row) {
    return { spaceId, body: "", updatedAt: null, updatedByName: null };
  }

  return {
    spaceId,
    body: row.body,
    updatedAt: row.updatedAt.toISOString(),
    updatedByName: row.updatedBy?.name?.trim() || null,
  };
}

export async function saveSpaceNote(
  spaceId: string,
  body: string,
): Promise<NoteActionResult> {
  const session = await requireUser();
  const access = await assertNotesAccess(spaceId, session.userId, true);
  if (!access.ok) return access;

  const trimmed = body.replace(/\r\n/g, "\n");
  if (trimmed.length > MAX_NOTE_BODY) {
    return {
      ok: false,
      error: `یادداشت حداکثر ${MAX_NOTE_BODY.toLocaleString("fa-IR")} کاراکتر است.`,
    };
  }

  await prisma.spaceNote.upsert({
    where: { spaceId },
    create: {
      spaceId,
      body: trimmed,
      updatedById: session.userId,
    },
    update: {
      body: trimmed,
      updatedById: session.userId,
    },
  });

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath(`/spaces/${spaceId}/notes`);
  return { ok: true };
}
