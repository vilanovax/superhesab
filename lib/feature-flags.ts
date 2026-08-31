import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { SpaceType } from "@/types";

export const FEATURE_FLAG_KEYS = [
  "proof_uploads",
  "space_type_building",
  "space_type_fund",
  "new_registrations",
  "backup_restore",
  "category_privacy",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export type FeatureFlagDef = {
  key: FeatureFlagKey;
  label: string;
  description: string;
  /** Circuit-breaker default: on unless admin disables. */
  defaultEnabled: boolean;
};

export const FEATURE_FLAG_DEFS: FeatureFlagDef[] = [
  {
    key: "proof_uploads",
    label: "آپلود فیش (S3)",
    description: "رسید شارژ ساختمان و فیش صندوق",
    defaultEnabled: true,
  },
  {
    key: "space_type_building",
    label: "قالب ساختمان",
    description: "ساخت دفتر جدید از نوع ساختمان",
    defaultEnabled: true,
  },
  {
    key: "space_type_fund",
    label: "قالب صندوق",
    description: "ساخت دفتر جدید از نوع صندوق نوبتی",
    defaultEnabled: true,
  },
  {
    key: "new_registrations",
    label: "ثبت‌نام جدید",
    description: "مسیر /register برای کاربران تازه",
    defaultEnabled: true,
  },
  {
    key: "backup_restore",
    label: "بازیابی بک‌آپ",
    description: "restore از پنل ادمین (خروجی همچنان آزاد است)",
    defaultEnabled: true,
  },
  {
    key: "category_privacy",
    label: "حریم دسته خانه",
    description: "خصوصی کردن دسته‌ها در دفتر خانه",
    defaultEnabled: true,
  },
];

const DEF_BY_KEY = Object.fromEntries(
  FEATURE_FLAG_DEFS.map((d) => [d.key, d]),
) as Record<FeatureFlagKey, FeatureFlagDef>;

function isFlagKey(key: string): key is FeatureFlagKey {
  return (FEATURE_FLAG_KEYS as readonly string[]).includes(key);
}

/** Upsert catalog rows without overwriting admin-chosen `enabled`. */
export async function ensureFeatureFlags(): Promise<void> {
  await Promise.all(
    FEATURE_FLAG_DEFS.map((def) =>
      prisma.featureFlag.upsert({
        where: { key: def.key },
        create: {
          key: def.key,
          enabled: def.defaultEnabled,
          description: def.description,
        },
        update: {
          description: def.description,
        },
      }),
    ),
  );
}

/** Fail-open to default when row missing / DB hiccup. */
export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const fallback = DEF_BY_KEY[key].defaultEnabled;
  try {
    const row = await prisma.featureFlag.findUnique({
      where: { key },
      select: { enabled: true },
    });
    return row?.enabled ?? fallback;
  } catch (err) {
    console.error("[feature-flags] read failed", key, err);
    return fallback;
  }
}

export async function assertFeatureEnabled(
  key: FeatureFlagKey,
  disabledMessage: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const on = await isFeatureEnabled(key);
  if (!on) return { ok: false, error: disabledMessage };
  return { ok: true };
}

const SPACE_TYPE_FLAG: Partial<Record<SpaceType, FeatureFlagKey>> = {
  BUILDING: "space_type_building",
  FUND: "space_type_fund",
};

export async function assertSpaceTypeCreatable(
  type: SpaceType,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const flag = SPACE_TYPE_FLAG[type];
  if (!flag) return { ok: true };
  return assertFeatureEnabled(
    flag,
    type === "BUILDING"
      ? "ساخت دفتر ساختمان فعلاً غیرفعال است."
      : "ساخت دفتر صندوق فعلاً غیرفعال است.",
  );
}

export async function listDisabledSpaceTypes(): Promise<SpaceType[]> {
  const [buildingOn, fundOn] = await Promise.all([
    isFeatureEnabled("space_type_building"),
    isFeatureEnabled("space_type_fund"),
  ]);
  const disabled: SpaceType[] = [];
  if (!buildingOn) disabled.push("BUILDING");
  if (!fundOn) disabled.push("FUND");
  return disabled;
}

export type FeatureFlagRow = {
  key: FeatureFlagKey;
  label: string;
  description: string;
  enabled: boolean;
  updatedAt: Date;
  updatedBy: { id: string; phone: string; name: string | null } | null;
};

export async function listFeatureFlags(): Promise<FeatureFlagRow[]> {
  await ensureFeatureFlags();
  const rows = await prisma.featureFlag.findMany({
    where: { key: { in: [...FEATURE_FLAG_KEYS] } },
    include: {
      updatedBy: {
        select: { id: true, phone: true, name: true },
      },
    },
  });
  const byKey = new Map(rows.map((r) => [r.key, r]));

  return FEATURE_FLAG_DEFS.map((def) => {
    const row = byKey.get(def.key);
    return {
      key: def.key,
      label: def.label,
      description: def.description,
      enabled: row?.enabled ?? def.defaultEnabled,
      updatedAt: row?.updatedAt ?? new Date(0),
      updatedBy: row?.updatedBy ?? null,
    };
  });
}

export function parseFeatureFlagKey(raw: string): FeatureFlagKey | null {
  return isFlagKey(raw) ? raw : null;
}
