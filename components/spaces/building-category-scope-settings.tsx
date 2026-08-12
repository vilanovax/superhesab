"use client";

import { useMemo, useState, useTransition } from "react";
import {
  setBuildingCategoryScope,
  type BuildingCategoryScopeDTO,
} from "@/app/actions/buildingCategoryScope";
import { Button } from "@/components/ui/button";
import {
  BUILDING_CATEGORIES,
  BUILDING_CATEGORY_LABELS,
  type ExpenseCategory,
} from "@/lib/categorizer";
import {
  resolveUnitsFromScope,
  scopeSummaryFa,
  type BuildingScopeMode,
  type BuildingUnitRule,
} from "@/lib/building-category-scope";
import { cn } from "@/lib/utils";

type UnitOption = { id: string; name: string };

type Props = {
  spaceId: string;
  initialScopes: BuildingCategoryScopeDTO[];
  units: UnitOption[];
  disabled?: boolean;
};

const MODE_OPTIONS: {
  value: BuildingScopeMode;
  label: string;
  hint: string;
}[] = [
  { value: "ALL", label: "همه", hint: "همیشه همه واحدهای فعال" },
  { value: "FIXED", label: "ثابت", hint: "لیست از پیش‌تعیین‌شده" },
  { value: "HYBRID", label: "هیبرید", hint: "پیش‌فرض همه؛ قابل تغییر در ثبت" },
];

function labelFor(category: ExpenseCategory): string {
  return BUILDING_CATEGORY_LABELS[category] ?? category;
}

type Draft = {
  mode: BuildingScopeMode;
  unitRule: BuildingUnitRule;
  unitIds: string[];
};

export function BuildingCategoryScopeSettings({
  spaceId,
  initialScopes,
  units,
  disabled = false,
}: Props) {
  const [scopes, setScopes] = useState(initialScopes);
  const [drafts, setDrafts] = useState<Partial<Record<ExpenseCategory, Draft>>>(
    {},
  );
  const [openCategory, setOpenCategory] = useState<ExpenseCategory | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeIds = useMemo(() => units.map((u) => u.id), [units]);

  function stored(category: ExpenseCategory): BuildingCategoryScopeDTO {
    return (
      scopes.find((s) => s.category === category) ?? {
        category,
        mode: "ALL",
        unitRule: "EXCLUDE",
        unitIds: [],
        unitNames: [],
      }
    );
  }

  function view(category: ExpenseCategory): Draft {
    const d = drafts[category];
    if (d) return d;
    const s = stored(category);
    return { mode: s.mode, unitRule: s.unitRule, unitIds: s.unitIds };
  }

  function summary(category: ExpenseCategory): string {
    const row = view(category);
    const included = resolveUnitsFromScope({
      mode: row.mode,
      unitRule: row.unitRule,
      listedUnitIds: row.unitIds,
      activeUnitIds: activeIds,
    });
    return scopeSummaryFa({
      mode: row.mode,
      includedCount: included.length,
      totalActive: activeIds.length,
    });
  }

  function persist(category: ExpenseCategory, next: Draft) {
    setError(null);
    setPendingKey(category);
    startTransition(async () => {
      const result = await setBuildingCategoryScope({
        spaceId,
        category,
        mode: next.mode,
        unitRule: next.unitRule,
        unitIds: next.unitIds,
      });
      setPendingKey(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDrafts((prev) => {
        const copy = { ...prev };
        delete copy[category];
        return copy;
      });
      setScopes((prev) => {
        const without = prev.filter((p) => p.category !== category);
        return [
          ...without,
          {
            category,
            mode: next.mode,
            unitRule: next.unitRule,
            unitIds: next.mode === "FIXED" ? next.unitIds : [],
            unitNames:
              next.mode === "FIXED"
                ? units
                    .filter((u) => next.unitIds.includes(u.id))
                    .map((u) => ({ id: u.id, name: u.name }))
                : [],
          },
        ];
      });
    });
  }

  function setMode(category: ExpenseCategory, mode: BuildingScopeMode) {
    const cur = view(category);
    if (mode === "ALL" || mode === "HYBRID") {
      const next: Draft = { mode, unitRule: cur.unitRule, unitIds: [] };
      setDrafts((prev) => ({ ...prev, [category]: next }));
      persist(category, next);
      return;
    }
    // FIXED: keep draft until units are chosen (or keep existing list).
    const next: Draft = {
      mode: "FIXED",
      unitRule: cur.unitRule,
      unitIds: cur.unitIds,
    };
    setDrafts((prev) => ({ ...prev, [category]: next }));
    if (next.unitIds.length > 0) {
      persist(category, next);
    }
  }

  function setRule(category: ExpenseCategory, unitRule: BuildingUnitRule) {
    const cur = view(category);
    const next: Draft = { ...cur, mode: "FIXED", unitRule };
    setDrafts((prev) => ({ ...prev, [category]: next }));
    if (next.unitIds.length > 0) persist(category, next);
  }

  function toggleUnit(
    category: ExpenseCategory,
    unitId: string,
    checked: boolean,
  ) {
    const cur = view(category);
    const set = new Set(cur.unitIds);
    if (checked) set.add(unitId);
    else set.delete(unitId);
    const next: Draft = {
      mode: "FIXED",
      unitRule: cur.unitRule,
      unitIds: [...set],
    };
    setDrafts((prev) => ({ ...prev, [category]: next }));
    if (next.unitIds.length > 0) persist(category, next);
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-pretty text-body-sm font-semibold text-foreground">
          محدوده واحد دسته‌ها
        </h2>
        <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
          مشخص کنید هر هزینه مشاع برای کدام واحدهاست. هیبرید پیش‌فرض همه واحدها
          است تا وقتی در ثبت هزینه واحدی را حذف کنید. روی بدهی شارژ اثر ندارد.
        </p>
      </div>

      {units.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-sheet-muted/40 px-3 py-3 text-caption text-muted-foreground">
          ابتدا واحد فعال تعریف کنید.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {BUILDING_CATEGORIES.map((category) => {
            const row = view(category);
            const busy = pending && pendingKey === category;
            const open = openCategory === category;
            const fixedNeedsUnits =
              row.mode === "FIXED" && row.unitIds.length === 0;
            return (
              <li
                key={category}
                className="rounded-xl border border-border/50 bg-sheet-muted/50"
              >
                <button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() =>
                    setOpenCategory((c) => (c === category ? null : category))
                  }
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-start"
                >
                  <span className="text-sm font-medium text-foreground">
                    {labelFor(category)}
                  </span>
                  <span className="shrink-0 text-micro text-muted-foreground">
                    {fixedNeedsUnits ? "واحد انتخاب نشده" : summary(category)}
                    <span className="ms-1.5 text-foreground/50">
                      {open ? "▴" : "▾"}
                    </span>
                  </span>
                </button>

                {open ? (
                  <div className="space-y-3 border-t border-border/40 px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {MODE_OPTIONS.map((opt) => (
                        <Button
                          key={opt.value}
                          type="button"
                          size="sm"
                          variant={
                            row.mode === opt.value ? "default" : "outline"
                          }
                          disabled={disabled || busy}
                          className="h-8 rounded-full px-3 text-caption"
                          onClick={() => setMode(category, opt.value)}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                    <p className="text-micro text-muted-foreground">
                      {
                        MODE_OPTIONS.find((m) => m.value === row.mode)?.hint
                      }
                    </p>

                    {row.mode === "FIXED" ? (
                      <>
                        <div className="flex flex-wrap gap-1.5">
                          {(
                            [
                              ["EXCLUDE", "همه به‌جز…"],
                              ["INCLUDE", "فقط این‌ها"],
                            ] as const
                          ).map(([rule, label]) => (
                            <Button
                              key={rule}
                              type="button"
                              size="sm"
                              variant={
                                row.unitRule === rule ? "secondary" : "ghost"
                              }
                              disabled={disabled || busy}
                              className="h-8 rounded-full px-3 text-caption"
                              onClick={() => setRule(category, rule)}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                        {fixedNeedsUnits ? (
                          <p className="text-micro text-amber-700 dark:text-amber-400">
                            حداقل یک واحد را تیک بزنید تا ذخیره شود.
                          </p>
                        ) : null}
                        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                          {units.map((unit) => {
                            const checked = row.unitIds.includes(unit.id);
                            return (
                              <li key={unit.id}>
                                <label
                                  className={cn(
                                    "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-caption transition-colors",
                                    checked
                                      ? "border-primary/40 bg-primary/8"
                                      : "border-border/50 bg-card",
                                    (disabled || busy) &&
                                      "pointer-events-none opacity-60",
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    className="size-3.5 accent-primary"
                                    checked={checked}
                                    disabled={disabled || busy}
                                    onChange={(e) =>
                                      toggleUnit(
                                        category,
                                        unit.id,
                                        e.target.checked,
                                      )
                                    }
                                  />
                                  <span className="truncate font-medium">
                                    واحد {unit.name}
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p className="text-caption text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
