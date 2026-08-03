import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { BackupFileV2, BackupRestoreDryRun } from "@/lib/backup/types";

/**
 * Analyze a backup file without writing — for admin restore confirmation.
 */
export async function dryRunBackupRestore(
  data: BackupFileV2,
): Promise<BackupRestoreDryRun> {
  const phones = new Set<string>();
  for (const space of data.spaces) {
    for (const m of space.members) {
      if (!m.user.isVirtual && !m.user.phone.startsWith("virtual")) {
        phones.add(m.user.phone);
      }
    }
  }
  for (const u of data.users ?? []) {
    if (!u.isVirtual && !u.phone.startsWith("virtual")) {
      phones.add(u.phone);
    }
  }

  const phoneList = [...phones];
  const existing =
    phoneList.length === 0
      ? []
      : await prisma.user.findMany({
          where: { phone: { in: phoneList }, isVirtual: false },
          select: { phone: true },
        });
  const existingSet = new Set(existing.map((u) => u.phone));
  const phonesExisting = phoneList.filter((p) => existingSet.has(p)).length;
  const phonesMissing = phoneList.length - phonesExisting;

  const typeMap = new Map<string, number>();
  let expenseCount = 0;
  for (const space of data.spaces) {
    typeMap.set(space.type, (typeMap.get(space.type) ?? 0) + 1);
    expenseCount += space.expenses.length;
  }

  const warnings: string[] = [];
  if (data.spaces.length === 0) {
    warnings.push("فایل هیچ دفتری ندارد.");
  }
  if (phonesMissing > 0) {
    warnings.push(
      `${phonesMissing} شماره در سیستم نیست؛ هنگام بازیابی عضو مجازی ساخته می‌شود.`,
    );
  }
  warnings.push(
    "بازیابی همیشه دفتر جدید می‌سازد (overwrite نمی‌کند). مالک فعلی ادمین اجراکننده خواهد بود.",
  );
  if (data.users?.some((u) => u.platformRole === "ADMIN")) {
    warnings.push(
      "فهرست کاربران شامل ادمین است؛ نقش/رمز از این فایل بازیابی نمی‌شود.",
    );
  }

  return {
    scope: data.scope,
    spaceCount: data.spaces.length,
    expenseCount,
    memberPhoneCount: phoneList.length,
    phonesExisting,
    phonesMissing,
    spacesByType: [...typeMap.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    warnings,
  };
}
