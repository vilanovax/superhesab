import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { AdminAuditAction } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";

export type { AdminAuditAction };

export type LogAdminAuditInput = {
  actorId: string;
  action: AdminAuditAction;
  summary: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/** Failures must not break the admin action. */
export async function logAdminAudit(input: LogAdminAuditInput): Promise<void> {
  try {
    await prisma.adminAuditEvent.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        summary: input.summary.slice(0, 280),
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (err) {
    console.error("[admin-audit] failed to persist", err);
  }
}

export const ADMIN_AUDIT_LABELS: Record<AdminAuditAction, string> = {
  USER_DISABLE: "غیرفعال‌سازی کاربر",
  USER_ENABLE: "فعال‌سازی کاربر",
  USER_RENAME: "تغییر نام کاربر",
  USER_ROLE_GRANT: "اعطای ادمین",
  USER_ROLE_REVOKE: "حذف ادمین",
  BACKUP_EXPORT_PLATFORM: "خروجی بک‌آپ پلتفرم",
  BACKUP_EXPORT_USER: "خروجی بک‌آپ کاربر",
  BACKUP_EXPORT_SPACES: "خروجی بک‌آپ دفاتر",
  BACKUP_DRY_RUN: "dry-run بازیابی",
  BACKUP_RESTORE: "بازیابی بک‌آپ",
};

export async function listAdminAuditEvents(limit = 80) {
  return prisma.adminAuditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
    include: {
      actor: {
        select: { id: true, phone: true, name: true },
      },
    },
  });
}
