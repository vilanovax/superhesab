"use client";

import { useMemo, useState, useTransition } from "react";
import {
  saveCategoryBudgets,
  type CategoryBudgetDTO,
} from "@/app/actions/categoryBudget";
import { SettingsDisclosure } from "@/components/spaces/settings-disclosure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATEGORY_LABELS,
  SPEND_CATEGORIES,
  type ExpenseCategory,
} from "@/lib/categorizer";

type CategoryBudgetSettingsProps = {
  spaceId: string;
  initial: CategoryBudgetDTO[];
  disabled?: boolean;
};

export function CategoryBudgetSettings({
  spaceId,
  initial,
  disabled = false,
}: CategoryBudgetSettingsProps) {
  const map = Object.fromEntries(
    initial.map((b) => [b.category, String(b.amount)]),
  ) as Partial<Record<ExpenseCategory, string>>;

  const [values, setValues] = useState<Partial<Record<ExpenseCategory, string>>>(
    () => {
      const next: Partial<Record<ExpenseCategory, string>> = {};
      for (const c of SPEND_CATEGORIES) {
        next[c] = map[c] ?? "";
      }
      return next;
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const setCount = useMemo(
    () =>
      SPEND_CATEGORIES.filter((c) => {
        const n = Math.trunc(Number(values[c] || 0)) || 0;
        return n > 0;
      }).length,
    [values],
  );

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (disabled || pending) return;
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const budgets = SPEND_CATEGORIES.map((category) => ({
        category,
        amount: Math.trunc(Number(values[category] || 0)) || 0,
      }));
      const result = await saveCategoryBudgets({ spaceId, budgets });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  const summary =
    setCount > 0
      ? `${setCount.toLocaleString("fa-IR")} از ${SPEND_CATEGORIES.length.toLocaleString("fa-IR")} سقف تنظیم شده`
      : `${SPEND_CATEGORIES.length.toLocaleString("fa-IR")} دسته · هنوز سقفی نیست`;

  return (
    <SettingsDisclosure
      title="بودجه هر دسته"
      summary={summary}
      defaultOpen={setCount > 0}
    >
      <form onSubmit={onSave} className="space-y-2.5">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          سقف ماهانه اختیاری. خالی = بدون سقف.
        </p>

        <ul className="divide-y divide-border/35 overflow-hidden rounded-xl border border-border/40">
          {SPEND_CATEGORIES.map((category) => (
            <li
              key={category}
              className="flex items-center gap-2 px-2.5 py-1.5 [content-visibility:auto] [contain-intrinsic-size:auto_2.5rem]"
            >
              <label
                htmlFor={`cat-budget-${category}`}
                className="min-w-0 flex-1 truncate text-caption font-medium text-foreground"
              >
                {CATEGORY_LABELS[category]}
              </label>
              <Input
                id={`cat-budget-${category}`}
                name={`categoryBudget_${category}`}
                autoComplete="off"
                type="text"
                inputMode="numeric"
                value={values[category] ?? ""}
                disabled={disabled || pending}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [category]: e.target.value.replace(/[^\d]/g, ""),
                  }))
                }
                placeholder="سقف…"
                className="h-8 w-28 rounded-lg border-border/70 bg-card px-2 text-end text-caption tabular-nums"
              />
            </li>
          ))}
        </ul>

        {error ? (
          <p
            className="rounded-lg bg-destructive-soft px-2.5 py-1.5 text-caption text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="text-[11px] text-success" aria-live="polite">
            ذخیره شد.
          </p>
        ) : null}

        {disabled ? (
          <p className="text-caption text-muted-foreground">
            فقط مالک می‌تواند بودجه دسته‌ها را تغییر دهد.
          </p>
        ) : (
          <Button
            type="submit"
            className="h-10 w-full rounded-xl text-caption active:scale-[0.98]"
            disabled={pending}
          >
            {pending ? "در حال ذخیره…" : "ذخیره بودجه دسته‌ها"}
          </Button>
        )}
      </form>
    </SettingsDisclosure>
  );
}
