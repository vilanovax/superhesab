"use client";

import { useState, useTransition } from "react";
import {
  saveCategoryBudgets,
  type CategoryBudgetDTO,
} from "@/app/actions/categoryBudget";
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

  function onSave(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <form onSubmit={onSave} className="space-y-3">
      <div>
        <h2 className="text-body-sm font-semibold text-foreground">
          بودجه هر دسته
        </h2>
        <p className="mt-0.5 text-caption text-muted-foreground">
          سقف ماهانه اختیاری برای هر دسته هزینه. خالی = بدون سقف.
        </p>
      </div>

      <ul className="space-y-2">
        {SPEND_CATEGORIES.map((category) => (
          <li
            key={category}
            className="flex items-center gap-2 rounded-xl border border-border/50 bg-sheet-muted/60 px-3 py-2"
          >
            <label
              htmlFor={`cat-budget-${category}`}
              className="min-w-0 flex-1 text-body-sm font-medium text-foreground"
            >
              {CATEGORY_LABELS[category]}
            </label>
            <Input
              id={`cat-budget-${category}`}
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
              placeholder="—"
              className="h-10 w-32 rounded-xl border-border/70 bg-card text-end tabular-nums"
            />
          </li>
        ))}
      </ul>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-caption text-success">ذخیره شد.</p>
      ) : null}

      {!disabled ? (
        <Button
          type="submit"
          className="h-11 w-full rounded-xl"
          disabled={pending}
        >
          {pending ? "…" : "ذخیره بودجه دسته‌ها"}
        </Button>
      ) : null}
    </form>
  );
}
