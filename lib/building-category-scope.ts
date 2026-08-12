/**
 * BUILDING category → unit participation (transparency / reporting).
 * Does not allocate charge debt; ExpenseSplit stays manager-paid.
 */

import type { ExpenseCategory } from "@/lib/categorizer";
import { BUILDING_CATEGORIES } from "@/lib/categorizer";

export type BuildingScopeMode = "ALL" | "FIXED" | "HYBRID";
export type BuildingUnitRule = "INCLUDE" | "EXCLUDE";

export type BuildingCategoryScopeConfig = {
  category: ExpenseCategory;
  mode: BuildingScopeMode;
  unitRule: BuildingUnitRule;
  /** Unit ids listed in settings (INCLUDE or EXCLUDE set for FIXED). */
  unitIds: string[];
};

export type ActiveUnit = {
  id: string;
  name: string;
  isActive: boolean;
};

/** Default when no BuildingCategoryScope row exists. */
export function defaultScopeForCategory(
  category: ExpenseCategory,
): BuildingCategoryScopeConfig {
  return {
    category,
    mode: "ALL",
    unitRule: "EXCLUDE",
    unitIds: [],
  };
}

export function mergeScopesWithDefaults(
  rows: BuildingCategoryScopeConfig[],
): BuildingCategoryScopeConfig[] {
  const byCat = new Map(rows.map((r) => [r.category, r]));
  return BUILDING_CATEGORIES.map(
    (category) => byCat.get(category) ?? defaultScopeForCategory(category),
  );
}

/**
 * Resolve which active units a FIXED/ALL/HYBRID *settings* policy includes
 * (before per-expense HYBRID overrides).
 */
export function resolveUnitsFromScope(input: {
  mode: BuildingScopeMode;
  unitRule: BuildingUnitRule;
  listedUnitIds: readonly string[];
  activeUnitIds: readonly string[];
}): string[] {
  const active = [...input.activeUnitIds];
  const listed = new Set(input.listedUnitIds);

  if (input.mode === "ALL" || input.mode === "HYBRID") {
    return active;
  }

  // FIXED
  if (input.unitRule === "INCLUDE") {
    return active.filter((id) => listed.has(id));
  }
  return active.filter((id) => !listed.has(id));
}

/**
 * Final included set for an expense at save time.
 * - ALL: empty snapshot (means “all”, including future units at read time for legacy/ALL).
 * - FIXED: settings resolution (client list ignored).
 * - HYBRID: client includedUnitIds, defaulting to all active when omitted/empty-after-filter.
 */
export function resolveExpenseIncludedUnitIds(input: {
  mode: BuildingScopeMode;
  unitRule: BuildingUnitRule;
  listedUnitIds: readonly string[];
  activeUnitIds: readonly string[];
  /** From form when HYBRID; ignored otherwise. */
  clientIncludedUnitIds?: readonly string[] | null;
}): {
  /** null = do not write participation rows (ALL). */
  snapshotUnitIds: string[] | null;
} {
  const activeSet = new Set(input.activeUnitIds);

  if (input.mode === "ALL") {
    return { snapshotUnitIds: null };
  }

  if (input.mode === "FIXED") {
    return {
      snapshotUnitIds: resolveUnitsFromScope({
        mode: "FIXED",
        unitRule: input.unitRule,
        listedUnitIds: input.listedUnitIds,
        activeUnitIds: input.activeUnitIds,
      }),
    };
  }

  // HYBRID
  const raw = input.clientIncludedUnitIds;
  let included =
    raw == null
      ? [...input.activeUnitIds]
      : raw.filter((id) => activeSet.has(id));

  // Non-intrusive: if client sent nothing usable, fall back to all active.
  if (included.length === 0 && input.activeUnitIds.length > 0) {
    included = [...input.activeUnitIds];
  }

  return { snapshotUnitIds: included };
}

/**
 * Whether a unit should see an expense in resident portal / filtered views.
 *
 * Priority:
 * 1. Snapshot rows exist → unit must be in the included set.
 * 2. No snapshot → resolve from live category scope (ALL/FIXED); HYBRID w/o rows = all.
 */
export function unitSeesExpense(input: {
  unitId: string;
  /** Included unit ids from ExpenseUnitParticipation; null/undefined = no snapshot. */
  snapshotIncludedUnitIds: readonly string[] | null | undefined;
  scope: BuildingCategoryScopeConfig | null | undefined;
  activeUnitIds: readonly string[];
}): boolean {
  const snap = input.snapshotIncludedUnitIds;
  if (snap != null) {
    return snap.includes(input.unitId);
  }

  const mode = input.scope?.mode ?? "ALL";
  if (mode === "ALL" || mode === "HYBRID") {
    return input.activeUnitIds.includes(input.unitId);
  }

  const resolved = resolveUnitsFromScope({
    mode: "FIXED",
    unitRule: input.scope?.unitRule ?? "EXCLUDE",
    listedUnitIds: input.scope?.unitIds ?? [],
    activeUnitIds: input.activeUnitIds,
  });
  return resolved.includes(input.unitId);
}

export function scopeSummaryFa(input: {
  mode: BuildingScopeMode;
  includedCount: number;
  totalActive: number;
}): string {
  if (input.mode === "ALL") return "همه واحدها";
  if (input.totalActive <= 0) return "بدون واحد فعال";
  if (input.includedCount >= input.totalActive) return "همه واحدها";
  return `${input.includedCount} از ${input.totalActive} واحد`;
}
