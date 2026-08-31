"use client";

import { useState, useTransition } from "react";
import {
  createRecurringRule,
  deleteRecurringRule,
  setRecurringRuleActive,
  type RecurringRuleDTO,
} from "@/app/actions/recurring";
import { SettingsDisclosure } from "@/components/spaces/settings-disclosure";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const cats = categoriesForType(transactionType);
  const deleteRule = deleteId
    ? (rules.find((r) => r.id === deleteId) ?? null)
    : null;
  const activeCount = rules.filter((r) => r.active).length;

  function onTypeChange(next: TransactionType) {
    setTransactionType(next);
    const nextCats = categoriesForType(next);
    if (!nextCats.includes(category)) {
      setCategory(nextCats[0] ?? "OTHER");
    }
  }

  function resetForm() {
    setTitle("");
    setAmount("");
    setDayOfMonth("1");
    setTransactionType("EXPENSE");
    setCategory("OTHER");
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (disabled || pending) return;
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
      resetForm();
      setFormOpen(false);
    });
  }

  function onToggle(rule: RecurringRuleDTO) {
    if (disabled || pending) return;
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

  function onConfirmDelete() {
    if (!deleteId || disabled || pending) return;
    const ruleId = deleteId;
    setError(null);
    startTransition(async () => {
      const result = await deleteRecurringRule({ spaceId, ruleId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      setDeleteId(null);
    });
  }

  const summary =
    rules.length === 0
      ? "هنوز قانونی ثبت نشده"
      : `${rules.length.toLocaleString("fa-IR")} قانون · ${activeCount.toLocaleString("fa-IR")} فعال`;

  return (
    <>
      <SettingsDisclosure
        title="تراکنش‌های تکرارپذیر"
        summary={summary}
        defaultOpen={rules.length > 0}
      >
        <p className="mb-2.5 text-[11px] leading-relaxed text-muted-foreground">
          هر ماه در روز مشخص، هنگام باز کردن فضا ثبت می‌شود.
        </p>

        {rules.length > 0 ? (
          <ul className="mb-2.5 divide-y divide-border/35 overflow-hidden rounded-xl border border-border/40">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2 [content-visibility:auto] [contain-intrinsic-size:auto_3rem]",
                  !rule.active && "opacity-55",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-caption font-semibold text-foreground">
                    {rule.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {rule.transactionType === "INCOME" ? "درآمد" : "هزینه"} ·{" "}
                    {CATEGORY_LABELS[rule.category]} · روز{" "}
                    {rule.dayOfMonth.toLocaleString("fa-IR")} ·{" "}
                    {formatCurrency(rule.amount, currency)}
                  </p>
                </div>
                {!disabled ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-lg px-2 text-[11px]"
                      disabled={pending}
                      aria-label={
                        rule.active
                          ? `خاموش کردن ${rule.title}`
                          : `فعال کردن ${rule.title}`
                      }
                      onClick={() => onToggle(rule)}
                    >
                      {rule.active ? "خاموش" : "فعال"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-lg px-2 text-[11px] text-destructive"
                      disabled={pending}
                      aria-label={`حذف ${rule.title}`}
                      onClick={() => {
                        setError(null);
                        setDeleteId(rule.id);
                      }}
                    >
                      حذف
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-2.5 rounded-xl border border-dashed border-border/50 px-3 py-3 text-center text-[11px] text-muted-foreground">
            قانونی ثبت نشده — برای اجاره، قبض و حقوق ماهانه اضافه کنید.
          </p>
        )}

        {!disabled ? (
          formOpen ? (
            <form
              onSubmit={onCreate}
              className="space-y-2.5 rounded-xl border border-border/50 bg-muted/20 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-caption font-semibold text-foreground">
                  قانون جدید
                </p>
                <button
                  type="button"
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setFormOpen(false);
                    setError(null);
                    resetForm();
                  }}
                >
                  بستن
                </button>
              </div>
              <div
                role="radiogroup"
                aria-label="نوع تراکنش"
                className="grid grid-cols-2 gap-1 rounded-xl bg-muted/80 p-1"
              >
                {(
                  [
                    { value: "EXPENSE" as const, label: "هزینه" },
                    { value: "INCOME" as const, label: "درآمد" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={transactionType === opt.value}
                    onClick={() => onTypeChange(opt.value)}
                    className={cn(
                      "h-8 rounded-lg text-[11px] font-semibold",
                      "transition-[background-color,color,box-shadow] duration-150 ease-out",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      transactionType === opt.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="recurring-title"
                  className="text-[11px] text-muted-foreground"
                >
                  عنوان
                </label>
                <Input
                  id="recurring-title"
                  name="title"
                  autoComplete="off"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلاً اجاره…"
                  className="h-10 rounded-xl"
                  required
                  minLength={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label
                    htmlFor="recurring-amount"
                    className="text-[11px] text-muted-foreground"
                  >
                    مبلغ
                  </label>
                  <Input
                    id="recurring-amount"
                    name="amount"
                    autoComplete="off"
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value.replace(/[^\d]/g, ""))
                    }
                    placeholder="مثلاً ۵۰۰۰۰۰…"
                    className="h-10 rounded-xl tabular-nums"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="recurring-day"
                    className="text-[11px] text-muted-foreground"
                  >
                    روز ماه
                  </label>
                  <Input
                    id="recurring-day"
                    name="dayOfMonth"
                    autoComplete="off"
                    type="text"
                    inputMode="numeric"
                    value={dayOfMonth}
                    onChange={(e) => {
                      const n = e.target.value.replace(/[^\d]/g, "");
                      setDayOfMonth(n);
                    }}
                    placeholder="۱ تا ۲۸…"
                    className="h-10 rounded-xl tabular-nums"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="recurring-category"
                  className="text-[11px] text-muted-foreground"
                >
                  دسته
                </label>
                <select
                  id="recurring-category"
                  name="category"
                  autoComplete="off"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as ExpenseCategory)
                  }
                  className="flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {cats.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              {error ? (
                <p
                  className="rounded-lg bg-destructive-soft px-2.5 py-1.5 text-caption text-destructive"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                className="h-10 w-full rounded-xl text-caption active:scale-[0.98]"
                disabled={pending}
              >
                {pending ? "در حال افزودن…" : "افزودن قانون"}
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-xl text-caption"
              onClick={() => {
                setError(null);
                setFormOpen(true);
              }}
            >
              افزودن قانون
            </Button>
          )
        ) : null}

        {error && !formOpen ? (
          <p
            className="mt-2 text-caption text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        ) : null}
      </SettingsDisclosure>

      <ConfirmDialog
        open={Boolean(deleteRule)}
        onOpenChange={(open) => {
          if (!open && !pending) setDeleteId(null);
        }}
        title="حذف قانون تکرارپذیر؟"
        description={
          deleteRule
            ? `«${deleteRule.title}» دیگر هر ماه ثبت نمی‌شود.`
            : "این قانون حذف می‌شود."
        }
        confirmLabel="حذف قانون"
        pending={pending}
        error={deleteId ? error : null}
        destructive
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
