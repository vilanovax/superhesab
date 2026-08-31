"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { buildBackupForOwnedSpaces } from "@/lib/backup/export";
import { restoreSpaceFromBackup } from "@/lib/backup/restore";
import type { BackupFileV2, RestoreSpaceResult } from "@/lib/backup/types";
import { parseBackupFile } from "@/lib/backup/validate";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import {
  canonicalizeSpaceType,
  getTemplate,
} from "@/lib/templates/registry";
import type { SpaceType } from "@/types";

export type BackupActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type OwnedBackupSpaceDTO = {
  id: string;
  name: string;
  type: SpaceType;
  /** Canonical product label (PERSONAL → خانه). */
  typeLabel: string;
  archived: boolean;
};

const exportAccountSchema = z.object({
  spaceIds: z.array(z.string().min(1)).max(200).optional(),
});

/** Owned spaces for the account backup picker (active + archived). */
export async function listOwnedSpacesForBackup(): Promise<
  OwnedBackupSpaceDTO[]
> {
  const session = await requireUser();
  const rows = await prisma.spaceMember.findMany({
    where: { userId: session.userId, role: "OWNER" },
    orderBy: { createdAt: "asc" },
    select: {
      space: {
        select: {
          id: true,
          name: true,
          type: true,
          archivedAt: true,
        },
      },
    },
  });

  return rows.map((r) => {
    const type = canonicalizeSpaceType(r.space.type as SpaceType);
    return {
      id: r.space.id,
      name: r.space.name,
      type,
      typeLabel: getTemplate(type).label,
      archived: r.space.archivedAt != null,
    };
  });
}

/**
 * Account JSON backup — OWNER spaces only.
 * Omit `spaceIds` (or pass all) for full account export; pass a subset to filter.
 */
export async function exportAccountBackup(
  input?: { spaceIds?: string[] },
): Promise<BackupActionResult<BackupFileV2>> {
  const parsed = exportAccountSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, error: "انتخاب دفاتر نامعتبر است." };
  }

  const session = await requireUser();
  const data = await buildBackupForOwnedSpaces({
    userId: session.userId,
    scope: "account",
    spaceIds: parsed.data.spaceIds,
  });

  if (
    parsed.data.spaceIds &&
    parsed.data.spaceIds.length > 0 &&
    data.spaces.length === 0
  ) {
    return {
      ok: false,
      error: "هیچ دفتر مالک انتخاب‌شده‌ای برای بک‌آپ پیدا نشد.",
    };
  }

  return { ok: true, data };
}

/** Single-space JSON backup — OWNER only. */
export async function exportSpaceBackup(
  spaceId: string,
): Promise<BackupActionResult<BackupFileV2>> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "به این فضا دسترسی ندارید." };
  }
  if (membership.role !== "OWNER") {
    return {
      ok: false,
      error: "فقط مالک می‌تواند بک‌آپ JSON این دفتر را بگیرد.",
    };
  }

  const data = await buildBackupForOwnedSpaces({
    userId: session.userId,
    scope: "space",
    spaceId,
  });
  if (data.spaces.length === 0) {
    return { ok: false, error: "دفتری برای بک‌آپ پیدا نشد." };
  }
  return { ok: true, data };
}

/**
 * Restore backup file → one or more **new** spaces.
 * Never overwrites an existing space.
 */
export async function restoreBackupFile(
  raw: unknown,
): Promise<
  BackupActionResult<{ spaces: RestoreSpaceResult[]; warnings: string[] }>
> {
  const session = await requireUser();
  const parsed = parseBackupFile(raw);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  if (parsed.data.spaces.length === 0) {
    return { ok: false, error: "فایل بک‌آپ هیچ دفتری ندارد." };
  }

  const restored: RestoreSpaceResult[] = [];
  const allWarnings: string[] = [];

  try {
    for (const space of parsed.data.spaces) {
      const result = await restoreSpaceFromBackup({
        payload: space,
        restorerUserId: session.userId,
      });
      restored.push(result);
      allWarnings.push(...result.warnings);
    }
  } catch {
    return {
      ok: false,
      error: "بازیابی ناموفق بود. فایل را بررسی کنید و دوباره تلاش کنید.",
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/archive");
  for (const s of restored) {
    revalidatePath(`/spaces/${s.spaceId}`);
  }

  return {
    ok: true,
    data: {
      spaces: restored,
      warnings: [...new Set(allWarnings)],
    },
  };
}

/** @deprecated Use exportAccountBackup — kept for older imports */
export async function exportUserBackup(): Promise<
  BackupActionResult<BackupFileV2>
> {
  return exportAccountBackup();
}
