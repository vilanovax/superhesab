import { prisma } from "@/lib/db/prisma";

/** Comma-separated phones in env promoted to platform ADMIN on ensure. */
export function platformAdminPhonesFromEnv(): string[] {
  const raw = process.env.PLATFORM_ADMIN_PHONES?.trim() ?? "";
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((p) => p.replace(/[\s\-()]/g, "").trim())
    .filter(Boolean);
}

/**
 * Promote configured phones to ADMIN (idempotent).
 * Call from admin layout so ops can grant access without SQL.
 */
export async function ensurePlatformAdminsFromEnv(): Promise<number> {
  const phones = platformAdminPhonesFromEnv();
  if (phones.length === 0) return 0;

  const result = await prisma.user.updateMany({
    where: {
      phone: { in: phones },
      isVirtual: false,
      platformRole: { not: "ADMIN" },
    },
    data: { platformRole: "ADMIN" },
  });
  return result.count;
}
