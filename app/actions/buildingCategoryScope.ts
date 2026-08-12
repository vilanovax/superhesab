"use server";

import { revalidatePath } from "next/cache";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import {
  mergeScopesWithDefaults,
  type BuildingCategoryScopeConfig,
  type BuildingScopeMode,
  type BuildingUnitRule,
} from "@/lib/building-category-scope";
import { BUILDING_CATEGORIES, type ExpenseCategory } from "@/lib/categorizer";
import { prisma } from "@/lib/db/prisma";
import { getTemplate } from "@/lib/templates/registry";
import { setBuildingCategoryScopeSchema } from "@/lib/validations/building-category-scope";

export type BuildingCategoryScopeDTO = BuildingCategoryScopeConfig & {
  unitNames: { id: string; name: string }[];
};

export type BuildingScopeContextDTO = {
  units: { id: string; name: string; isActive: boolean }[];
  scopes: BuildingCategoryScopeDTO[];
};

type ActionResult = { ok: true } | { ok: false; error: string };

async function assertBuildingOwner(spaceId: string, userId: string) {
  const membership = await requireSpaceMember(spaceId, userId);
  if (!membership) {
    return { ok: false as const, error: "به این فضا دسترسی ندارید." };
  }
  if (!getTemplate(membership.space.type).features.buildingCharges) {
    return { ok: false as const, error: "این فضا قالب ساختمان نیست." };
  }
  if (membership.role !== "OWNER") {
    return { ok: false as const, error: "فقط مالک می‌تواند محدوده دسته را تنظیم کند." };
  }
  return { ok: true as const, membership };
}

async function assertBuildingEditor(spaceId: string, userId: string) {
  const membership = await requireSpaceMember(spaceId, userId);
  if (!membership) {
    return { ok: false as const, error: "به این فضا دسترسی ندارید." };
  }
  if (!getTemplate(membership.space.type).features.buildingCharges) {
    return { ok: false as const, error: "این فضا قالب ساختمان نیست." };
  }
  if (membership.role === "VIEWER") {
    return { ok: false as const, error: "نقش ناظر اجازه این کار را ندارد." };
  }
  return { ok: true as const, membership };
}

function toDTO(row: {
  category: ExpenseCategory;
  mode: BuildingScopeMode;
  unitRule: BuildingUnitRule;
  units: { unitId: string; unit: { id: string; name: string } }[];
}): BuildingCategoryScopeDTO {
  return {
    category: row.category,
    mode: row.mode,
    unitRule: row.unitRule,
    unitIds: row.units.map((u) => u.unitId),
    unitNames: row.units.map((u) => ({
      id: u.unit.id,
      name: u.unit.name,
    })),
  };
}

/** Settings + expense form: scopes merged with defaults for all BUILDING_* cats. */
export async function listBuildingCategoryScopes(
  spaceId: string,
): Promise<BuildingCategoryScopeDTO[]> {
  const session = await requireUser();
  const access = await assertBuildingEditor(spaceId, session.userId);
  if (!access.ok) return [];

  const rows = await prisma.buildingCategoryScope.findMany({
    where: { spaceId, category: { in: [...BUILDING_CATEGORIES] } },
    select: {
      category: true,
      mode: true,
      unitRule: true,
      units: {
        select: {
          unitId: true,
          unit: { select: { id: true, name: true } },
        },
      },
    },
  });

  const mapped = rows.map((r) =>
    toDTO({
      category: r.category as ExpenseCategory,
      mode: r.mode,
      unitRule: r.unitRule,
      units: r.units,
    }),
  );
  return mergeScopesWithDefaults(mapped).map((cfg) => {
    const existing = mapped.find((m) => m.category === cfg.category);
    return existing ?? { ...cfg, unitNames: [] };
  });
}

/** Compact context for expense form (units + scopes). */
export async function getBuildingScopeContext(
  spaceId: string,
): Promise<BuildingScopeContextDTO | null> {
  const session = await requireUser();
  const access = await assertBuildingEditor(spaceId, session.userId);
  if (!access.ok) return null;

  const [units, scopes] = await Promise.all([
    prisma.unit.findMany({
      where: { spaceId, isActive: true },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    listBuildingCategoryScopes(spaceId),
  ]);

  return { units, scopes };
}

export async function setBuildingCategoryScope(
  input: unknown,
): Promise<ActionResult> {
  const parsed = setBuildingCategoryScopeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

  const session = await requireUser();
  const access = await assertBuildingOwner(
    parsed.data.spaceId,
    session.userId,
  );
  if (!access.ok) return access;

  const { spaceId, category, mode, unitRule, unitIds } = parsed.data;

  if (mode === "FIXED" && unitIds.length > 0) {
    const validCount = await prisma.unit.count({
      where: {
        spaceId,
        id: { in: unitIds },
        isActive: true,
      },
    });
    if (validCount !== unitIds.length) {
      return { ok: false, error: "یکی از واحدهای انتخاب‌شده معتبر نیست." };
    }
  }

  const listed =
    mode === "FIXED" ? [...new Set(unitIds)] : ([] as string[]);

  try {
    await prisma.$transaction(async (tx) => {
      if (mode === "ALL") {
        await tx.buildingCategoryScope.deleteMany({
          where: { spaceId, category },
        });
        return;
      }

      const scope = await tx.buildingCategoryScope.upsert({
        where: { spaceId_category: { spaceId, category } },
        create: {
          spaceId,
          category,
          mode,
          unitRule: mode === "FIXED" ? unitRule : "EXCLUDE",
        },
        update: {
          mode,
          unitRule: mode === "FIXED" ? unitRule : "EXCLUDE",
        },
        select: { id: true },
      });

      await tx.buildingCategoryScopeUnit.deleteMany({
        where: { scopeId: scope.id },
      });

      if (mode === "FIXED" && listed.length > 0) {
        await tx.buildingCategoryScopeUnit.createMany({
          data: listed.map((unitId) => ({
            scopeId: scope.id,
            unitId,
          })),
        });
      }
    });

    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath(`/spaces/${spaceId}/settings`);
    return { ok: true };
  } catch {
    return { ok: false, error: "ذخیره محدوده دسته ناموفق بود." };
  }
}
