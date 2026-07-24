"use client";

import { useState, useTransition } from "react";
import {
  createRecurringRule,
  deleteRecurringRule,
  setRecurringRuleActive,
  type RecurringRuleDTO,
} from "@/app/actions/recurring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATEGORY_LABELS,
  categoriesForType,
  type ExpenseCategory,
  type TransactionType,
} from "@/lib/categorizer";
import { formatCurrency } from "@/lib/formatters";
import type { SpaceCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type RecurringSettingsProps = {
  spaceId: string;
  initial: RecurringRuleDTO[];
  currency: SpaceCurrency;
  disabled?: boolean;
};

export function RecurringSettings({
  spaceId,
  initial,
  currency,
  disabled = false,
}: RecurringSettingsProps) {
  const [rules, setRules] = useState(initial);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] =
    useState<TransactionType>("EXPENSE");
  const [category, setCategory] = useState<ExpenseCategory>("OTHER");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cats = categoriesForType(transactionType);

  function onTypeChange(next: TransactionType) {
    setTransactionType(next);
    const nextCats = categoriesForType(next);
    if (!nextCats.includes(category)) {
      setCategory(nextCats[0] ?? "OTHER");
    }
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createRecurringRule({
        spaceId,
        title,
        amount: Math.trunc(Number(amount)) || 0,
        transactionType,
        category,
        dayOfMonth: Math.trunc(Number(dayOfMonth)) || 1,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRules((prev) => [
        {
          id: result.id!,
          title: title.trim(),
          amount: Math.trunc(Number(amount)),
          transactionType,
          category,
          dayOfMonth: Math.trunc(Number(dayOfMonth)) || 1,
          active: true,
        },
        ...prev,
      ]);
      setTitle("");
      setAmount("");
      setDayOfMonth("1");
    });
  }

  function onToggle(rule: RecurringRuleDTO) {
    setError(null);
    startTransition(async () => {
      const next = !rule.active;
      const result = await setRecurringRuleActive({
        spaceId,
        ruleId: rule.id,
        active: next,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, active: next } : r)),
      );
    });
  }

  function onDelete(ruleId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteRecurringRule({ spaceId, ruleId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-body-sm font-semibold text-foreground">
          تراکنش‌های تکرارپذیر
        </h2>
        <p className="mt-0.5 text-caption text-muted-foreground">
          هر ماه در روز مشخص، هنگام باز کردن فضا ثبت می‌شود.
        </p>
      </div>

      {rules.length > 0 ? (
        <ul className="space-y-2">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className={cn(
                "rounded-xl border border-border/50 bg-sheet-muted/60 px-3 py-2.5",
                !rule.active && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-semibold text-foreground">
                    {rule.title}
                  </p>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    {rule.transactionType === "INCOME" ? "درآمد" : "هزینه"} ·{" "}
                    {CATEGORY_LABELS[rule.category]} · روز {rule.dayOfMonth} ·{" "}
                    {formatCurrency(rule.amount, currency)}
                  </p>
                </div>
                {!disabled ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg px-2 text-caption"
                      disabled={pending}
                      onClick={() => onToggle(rule)}
                    >
                      {rule.active ? "خاموش" : "فعال"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg px-2 text-caption text-destructive"
                      disabled={pending}
                      onClick={() => onDelete(rule.id)}
                    >
                      حذف
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border/60 px-3 py-4 text-center text-caption text-muted-foreground">
          هنوز قانونی ثبت نشده
        </p>
      )}

      {!disabled ? (
        <form onSubmit={onCreate} className="space-y-3 rounded-2xl border border-border/55 bg-card p-3.5">
          <p className="text-caption font-semibold text-muted-foreground">
            قانون جدید
          </p>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/80 p-1">
            {(
              [
                { value: "EXPENSE" as const, label: "هزینه" },
                { value: "INCOME" as const, label: "درآمد" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onTypeChange(opt.value)}
                className={cn(
                  "h-9 rounded-lg text-caption font-semibold",
                  transactionType === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان (مثلاً اجاره)"
            className="h-11 rounded-xl"
            required
            minLength={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^\d]/g, ""))
              }
              placeholder="مبلغ"
              className="h-11 rounded-xl tabular-nums"
              required
            />
            <Input
              type="text"
              inputMode="numeric"
              value={dayOfMonth}
              onChange={(e) => {
                const n = e.target.value.replace(/[^\d]/g, "");
                setDayOfMonth(n);
              }}
              placeholder="روز (۱–۲۸)"
              className="h-11 rounded-xl tabular-nums"
              required
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {cats.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            className="h-11 w-full rounded-xl"
            disabled={pending}
          >
            {pending ? "…" : "افزودن قانون"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
