"use server";

import { revalidatePath } from "next/cache";
import { buildBackupForOwnedSpaces } from "@/lib/backup/export";
import { restoreSpaceFromBackup } from "@/lib/backup/restore";
import type { BackupFileV2, RestoreSpaceResult } from "@/lib/backup/types";
import { parseBackupFile } from "@/lib/backup/validate";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";

export type BackupActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Account-wide JSON backup — OWNER spaces only. */
export async function exportAccountBackup(): Promise<BackupFileV2> {
  const session = await requireUser();
  return buildBackupForOwnedSpaces({
    userId: session.userId,
    scope: "account",
  });
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
export async function exportUserBackup(): Promise<BackupFileV2> {
  return exportAccountBackup();
}
