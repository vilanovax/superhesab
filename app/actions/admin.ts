"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAdminAudit } from "@/lib/admin/audit";
import { dryRunBackupRestore } from "@/lib/backup/dry-run";
import {
  buildBackupForSpaceIds,
  buildBackupForUserOwnedSpaces,
  buildPlatformBackup,
} from "@/lib/backup/export";
import { restoreSpaceFromBackup } from "@/lib/backup/restore";
import type {
  BackupFileV2,
  BackupRestoreDryRun,
  RestoreSpaceResult,
} from "@/lib/backup/types";
import { parseBackupFile } from "@/lib/backup/validate";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export type AdminActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type AdminBackupResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const nameSchema = z.string().trim().max(80);

export async function setUserDisabled(input: {
  userId: string;
  disabled: boolean;
}): Promise<AdminActionResult> {
  const { user: admin } = await requirePlatformAdmin();

  if (input.userId === admin.id) {
    return { ok: false, error: "نمی‌توانید حساب خودتان را غیرفعال کنید." };
  }

  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, phone: true, isVirtual: true, platformRole: true },
  });
  if (!target || target.isVirtual) {
    return { ok: false, error: "کاربر پیدا نشد." };
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { disabledAt: input.disabled ? new Date() : null },
  });

  await logAdminAudit({
    actorId: admin.id,
    action: input.disabled ? "USER_DISABLE" : "USER_ENABLE",
    targetType: "user",
    targetId: target.id,
    summary: input.disabled
      ? `کاربر ${target.phone} غیرفعال شد`
      : `کاربر ${target.phone} فعال شد`,
    metadata: { phone: target.phone },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  return { ok: true };
}

export async function updateAdminUserName(input: {
  userId: string;
  name: string;
}): Promise<AdminActionResult> {
  const { user: admin } = await requirePlatformAdmin();

  const parsed = nameSchema.safeParse(input.name);
  if (!parsed.success) {
    return { ok: false, error: "نام نامعتبر است." };
  }

  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, phone: true, name: true, isVirtual: true },
  });
  if (!target || target.isVirtual) {
    return { ok: false, error: "کاربر پیدا نشد." };
  }

  const nextName = parsed.data.length > 0 ? parsed.data : null;
  await prisma.user.update({
    where: { id: target.id },
    data: { name: nextName },
  });

  await logAdminAudit({
    actorId: admin.id,
    action: "USER_RENAME",
    targetType: "user",
    targetId: target.id,
    summary: `نام ${target.phone} به «${nextName ?? "—"}» تغییر کرد`,
    metadata: { phone: target.phone, from: target.name, to: nextName },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  return { ok: true };
}

export async function setUserPlatformRole(input: {
  userId: string;
  role: "USER" | "ADMIN";
}): Promise<AdminActionResult> {
  const { user: admin } = await requirePlatformAdmin();

  if (input.userId === admin.id && input.role !== "ADMIN") {
    return { ok: false, error: "نمی‌توانید نقش ادمین خودتان را بردارید." };
  }

  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, phone: true, isVirtual: true },
  });
  if (!target || target.isVirtual) {
    return { ok: false, error: "کاربر پیدا نشد." };
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { platformRole: input.role },
  });

  await logAdminAudit({
    actorId: admin.id,
    action: input.role === "ADMIN" ? "USER_ROLE_GRANT" : "USER_ROLE_REVOKE",
    targetType: "user",
    targetId: target.id,
    summary:
      input.role === "ADMIN"
        ? `نقش ادمین به ${target.phone} داده شد`
        : `نقش ادمین از ${target.phone} برداشته شد`,
    metadata: { phone: target.phone, role: input.role },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  return { ok: true };
}

/** Full platform JSON — users directory (no passwords) + all spaces. */
export async function exportPlatformBackup(): Promise<
  AdminBackupResult<BackupFileV2>
> {
  const { user } = await requirePlatformAdmin();
  const data = await buildPlatformBackup(user.id);

  await logAdminAudit({
    actorId: user.id,
    action: "BACKUP_EXPORT_PLATFORM",
    summary: `خروجی پلتفرم: ${data.users?.length ?? 0} کاربر · ${data.spaces.length} دفتر`,
    metadata: {
      users: data.users?.length ?? 0,
      spaces: data.spaces.length,
    },
  });
  revalidatePath("/admin/audit");

  return { ok: true, data };
}

/** Spaces owned by one user. */
export async function exportUserSpacesBackup(input: {
  userId?: string;
  phone?: string;
}): Promise<AdminBackupResult<BackupFileV2>> {
  const { user: admin } = await requirePlatformAdmin();

  let targetId = input.userId?.trim();
  let phone = input.phone?.replace(/[\s\-()]/g, "").trim();
  if (!targetId && phone) {
    const found = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, isVirtual: true },
    });
    if (!found || found.isVirtual) {
      return { ok: false, error: "کاربری با این موبایل پیدا نشد." };
    }
    targetId = found.id;
  }
  if (!targetId) {
    return { ok: false, error: "شناسه یا موبایل کاربر لازم است." };
  }

  const data = await buildBackupForUserOwnedSpaces({
    adminUserId: admin.id,
    targetUserId: targetId,
  });

  await logAdminAudit({
    actorId: admin.id,
    action: "BACKUP_EXPORT_USER",
    targetType: "user",
    targetId: targetId,
    summary: `خروجی دفاتر کاربر ${phone ?? targetId}: ${data.spaces.length} دفتر`,
    metadata: { phone: phone ?? null, spaces: data.spaces.length },
  });
  revalidatePath("/admin/audit");

  return { ok: true, data };
}

/** One or more spaces by id. */
export async function exportSpacesBackup(input: {
  spaceIds: string[];
}): Promise<AdminBackupResult<BackupFileV2>> {
  const { user: admin } = await requirePlatformAdmin();
  const ids = input.spaceIds.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    return { ok: false, error: "حداقل یک شناسه دفتر لازم است." };
  }

  const data = await buildBackupForSpaceIds({
    adminUserId: admin.id,
    spaceIds: ids,
  });
  if (data.spaces.length === 0) {
    return { ok: false, error: "دفتری با این شناسه‌ها پیدا نشد." };
  }

  await logAdminAudit({
    actorId: admin.id,
    action: "BACKUP_EXPORT_SPACES",
    summary: `خروجی ${data.spaces.length} دفتر انتخابی`,
    metadata: { requested: ids.length, spaces: data.spaces.length },
  });
  revalidatePath("/admin/audit");

  return { ok: true, data };
}

export async function dryRunAdminBackupRestore(
  raw: unknown,
): Promise<AdminBackupResult<BackupRestoreDryRun>> {
  const { user: admin } = await requirePlatformAdmin();
  const parsed = parseBackupFile(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const summary = await dryRunBackupRestore(parsed.data);

  await logAdminAudit({
    actorId: admin.id,
    action: "BACKUP_DRY_RUN",
    summary: `dry-run: ${summary.spaceCount} دفتر · ${summary.expenseCount} هزینه`,
    metadata: {
      scope: summary.scope,
      spaceCount: summary.spaceCount,
      expenseCount: summary.expenseCount,
      phonesMissing: summary.phonesMissing,
    },
  });
  revalidatePath("/admin/audit");

  return { ok: true, data: summary };
}

/**
 * Restore backup spaces as **new** spaces (admin is OWNER).
 * Never overwrites. Prefer dry-run first.
 */
export async function restoreAdminBackupFile(
  raw: unknown,
): Promise<
  AdminBackupResult<{ spaces: RestoreSpaceResult[]; warnings: string[] }>
> {
  const { user: admin } = await requirePlatformAdmin();
  const parsed = parseBackupFile(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (parsed.data.spaces.length === 0) {
    return { ok: false, error: "فایل بک‌آپ هیچ دفتری ندارد." };
  }

  const restored: RestoreSpaceResult[] = [];
  const allWarnings: string[] = [];

  try {
    for (const space of parsed.data.spaces) {
      const result = await restoreSpaceFromBackup({
        payload: space,
        restorerUserId: admin.id,
      });
      restored.push(result);
      allWarnings.push(...result.warnings);
    }
  } catch {
    return {
      ok: false,
      error: "بازیابی ناموفق بود. ابتدا dry-run را بررسی کنید.",
    };
  }

  await logAdminAudit({
    actorId: admin.id,
    action: "BACKUP_RESTORE",
    summary: `بازیابی ${restored.length} دفتر`,
    metadata: {
      spaceIds: restored.map((s) => s.spaceId),
      names: restored.map((s) => s.name),
      warningCount: allWarnings.length,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/spaces");
  revalidatePath("/admin/audit");
  revalidatePath("/app");
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
