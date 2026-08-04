"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  type ExpenseCategory,
} from "@/lib/categorizer";
import {
  loadCustomCategories,
  rememberCustomCategory,
} from "@/lib/custom-categories";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CATEGORY_ACCENT: Partial<Record<ExpenseCategory, string>> = {
  FOOD: "from-blue-500/15 to-blue-500/5",
  TRANSPORT: "from-orange-500/15 to-orange-500/5",
  ACCOMMODATION: "from-teal-500/15 to-teal-500/5",
  ENTERTAINMENT: "from-rose-500/15 to-rose-500/5",
  SHOPPING: "from-amber-500/15 to-amber-500/5",
  OTHER: "from-slate-500/15 to-slate-500/5",
  SALARY: "from-emerald-500/15 to-emerald-500/5",
  TRANSFER: "from-sky-500/15 to-sky-500/5",
  OTHER_INCOME: "from-slate-500/15 to-slate-500/5",
};

export type CategoryPickerValue =
  | { kind: "builtin"; category: ExpenseCategory }
  | { kind: "custom"; label: string };

type CategoryPickerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  options: ExpenseCategory[];
  predictedCategory: ExpenseCategory;
  value: CategoryPickerValue | null;
  onSelect: (value: CategoryPickerValue) => void;
  /** Override builtin labels (e.g. building shared-cost names). */
  labelOverrides?: Partial<Record<ExpenseCategory, string>>;
};

export function CategoryPickerSheet({
  open,
  onOpenChange,
  spaceId,
  options,
  predictedCategory,
  value,
  onSelect,
  labelOverrides,
}: CategoryPickerSheetProps) {
  const [query, setQuery] = useState("");
  const [customDraft, setCustomDraft] = useState("");
  const [customs, setCustoms] = useState<string[]>([]);

  const labelFor = (code: ExpenseCategory) =>
    labelOverrides?.[code] ?? CATEGORY_LABELS[code];

  useEffect(() => {
    if (!open) return;
    setCustoms(loadCustomCategories(spaceId));
    setQuery("");
    setCustomDraft("");
  }, [open, spaceId]);

  const filteredBuiltins = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((code) => {
      const label = labelFor(code).toLowerCase();
      return label.includes(q) || code.toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- labelFor is stable via labelOverrides
  }, [options, query, labelOverrides]);

  const filteredCustoms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customs;
    return customs.filter((label) => label.toLowerCase().includes(q));
  }, [customs, query]);

  const selectedBuiltin =
    value?.kind === "builtin" ? value.category : null;
  const selectedCustom = value?.kind === "custom" ? value.label : null;

  function pickBuiltin(code: ExpenseCategory) {
    onSelect({ kind: "builtin", category: code });
    onOpenChange(false);
  }

  function pickCustom(label: string) {
    const next = rememberCustomCategory(spaceId, label);
    setCustoms(next);
    onSelect({ kind: "custom", label: label.trim() });
    onOpenChange(false);
  }

  function submitCustom(e: React.FormEvent) {
    e.preventDefault();
    const label = customDraft.trim();
    if (label.length < 1) return;
    pickCustom(label);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="gap-0 border-border/50 bg-background p-0">
        <div className="relative overflow-hidden rounded-t-2xl">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-primary/12 via-primary/4 to-transparent"
            aria-hidden
          />
          <DrawerHeader className="relative space-y-2 px-5 pb-3 pt-2 text-start">
            <DrawerTitle className="text-pretty text-title tracking-tight">
              انتخاب دسته
            </DrawerTitle>
            <DrawerDescription className="text-body-sm leading-relaxed">
              حدس فعلی{" "}
              <span className="font-semibold text-foreground">
                {CATEGORY_EMOJI[predictedCategory]}{" "}
                {labelFor(predictedCategory)}
              </span>
              — یا دسته خودت را بساز.
            </DrawerDescription>
          </DrawerHeader>

          <div className="relative space-y-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="relative">
              <span
                className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-muted-foreground"
                aria-hidden
              >
                ⌕
              </span>
              <Input
                name="category-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجوی دسته…"
                autoComplete="off"
                aria-label="جستجوی دسته"
                className="h-11 rounded-2xl border-border/60 bg-sheet-muted pe-3 ps-9"
              />
            </div>

            {filteredCustoms.length > 0 ? (
              <section className="space-y-2">
                <h3 className="px-0.5 text-caption font-semibold text-muted-foreground">
                  دسته‌های شما
                </h3>
                <div className="flex flex-wrap gap-2">
                  {filteredCustoms.map((label) => {
                    const selected = selectedCustom === label;
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => pickCustom(label)}
                        className={cn(
                          "inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-2 text-caption font-semibold transition-[transform,background-color,color,box-shadow]",
                          "ring-1 ring-inset active:scale-[0.98]",
                          selected
                            ? "bg-success-soft text-success ring-success/30"
                            : "bg-card text-foreground ring-border/70 hover:bg-muted/60",
                        )}
                      >
                        <span aria-hidden>🏷️</span>
                        <span className="truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="space-y-2">
              <h3 className="px-0.5 text-caption font-semibold text-muted-foreground">
                دسته‌های پیش‌فرض
              </h3>
              {filteredBuiltins.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border/60 bg-muted/30 px-4 py-6 text-center text-body-sm text-muted-foreground">
                  چیزی پیدا نشد — پایین‌تر دسته جدید بساز.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {filteredBuiltins.map((code) => {
                    const selected =
                      selectedBuiltin === code && !selectedCustom;
                    const isPredicted =
                      !selectedCustom &&
                      !selectedBuiltin &&
                      predictedCategory === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        aria-pressed={selected}
                        aria-label={labelFor(code)}
                        onClick={() => pickBuiltin(code)}
                        className={cn(
                          "relative flex flex-col items-center gap-2 rounded-2xl border bg-linear-to-b px-2 py-4 transition-[transform,border-color,box-shadow]",
                          CATEGORY_ACCENT[code] ?? "from-muted/40 to-card",
                          selected
                            ? "border-primary shadow-md ring-2 ring-primary/25"
                            : isPredicted
                              ? "border-primary/40 shadow-sm"
                              : "border-border/50 hover:border-border hover:shadow-sm",
                          "active:scale-[0.97]",
                        )}
                      >
                        {isPredicted && !selected ? (
                          <span className="absolute end-1.5 top-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                            پیشنهاد
                          </span>
                        ) : null}
                        {selected ? (
                          <span className="absolute end-1.5 top-1.5 text-caption text-primary">
                            ✓
                          </span>
                        ) : null}
                        <span className="text-[1.75rem] leading-none" aria-hidden>
                          {CATEGORY_EMOJI[code]}
                        </span>
                        <span className="text-caption font-bold text-foreground">
                          {labelFor(code)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <form
              onSubmit={submitCustom}
              className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-3"
            >
              <p className="mb-2 text-caption font-semibold text-primary">
                دسته جدید بساز
              </p>
              <div className="flex gap-2">
                <Input
                  value={customDraft}
                  onChange={(e) => setCustomDraft(e.target.value)}
                  placeholder="مثلاً کتاب، دارو، قبض…"
                  maxLength={40}
                  className="h-11 flex-1 rounded-xl border-border/60 bg-card"
                />
                <Button
                  type="submit"
                  disabled={customDraft.trim().length < 1}
                  className="h-11 shrink-0 rounded-xl px-4"
                >
                  افزودن
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
