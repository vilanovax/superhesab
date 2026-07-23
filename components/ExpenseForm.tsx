"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addExpense, updateExpense } from "@/app/actions/expense";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDateFa,
  payerName,
  todayIsoDateTehran,
  type SpaceCurrency,
} from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import {
  asMoney,
  calculateWeightedSplits,
  clampShare,
  MAX_SHARE,
  MIN_SHARE,
  splitEqual,
} from "@/lib/money";
import {
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from "@/lib/categorizer";
import {
  expenseSchema,
  type ExpenseFormValues,
} from "@/lib/validations/expense";
import { cn } from "@/lib/utils";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import type { SpaceType } from "@/types";

function parseAmountInput(raw: string): number {
  if (raw === "" || raw == null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function asAmount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export type ExpenseMember = {
  userId: string;
  name: string | null;
  phone: string;
  isVirtual?: boolean;
  defaultShare?: number;
};

export type ExpenseInitialValues = {
  expenseId: string;
  title: string;
  totalAmount: number;
  paidById: string;
  date: string;
  splitAmounts: Record<string, number>;
  splitShares?: Record<string, number>;
  category: ExpenseCategory;
};

type ExpenseFormProps = {
  spaceId: string;
  currentUserId: string;
  members: ExpenseMember[];
  currency?: SpaceCurrency;
  initialExpense?: ExpenseInitialValues;
  onSuccess?: () => void;
  spaceType?: SpaceType;
};

function personLabel(member: ExpenseMember, currentUserId: string): string {
  return payerName(member, {
    isCurrentUser: member.userId === currentUserId,
  });
}

/** True when amounts match a weighted equal split for the given shares. */
function looksLikeWeightedEqual(
  rows: { amount: number; share: number }[],
): boolean {
  if (rows.length === 0) return true;
  const total = rows.reduce((acc, r) => acc + r.amount, 0);
  if (total <= 0) return true;
  try {
    const parts = calculateWeightedSplits(
      total,
      rows.map((r, i) => ({
        userId: `u${i}`,
        share: clampShare(r.share),
      })),
    );
    return rows.every((r, i) => r.amount === parts[i]?.amount);
  } catch {
    return false;
  }
}

function redistributeAmongSelected(
  rows: ExpenseFormValues["splits"],
  total: number,
  selectedIndexes: number[],
): ExpenseFormValues["splits"] {
  if (selectedIndexes.length === 0 || total <= 0) {
    return rows.map((row) =>
      row.selected ? row : { ...row, amount: 0 },
    );
  }
  try {
    const parts = splitEqual(asMoney(total), selectedIndexes.length);
    return rows.map((row, index) => {
      const pos = selectedIndexes.indexOf(index);
      if (pos < 0) return { ...row, amount: 0 };
      return { ...row, amount: parts[pos] ?? 0 };
    });
  } catch {
    return rows;
  }
}

function buildDefaultValues(
  spaceId: string,
  currentUserId: string,
  members: ExpenseMember[],
  initialExpense?: ExpenseInitialValues,
): ExpenseFormValues {
  if (!initialExpense) {
    return {
      spaceId,
      title: "",
      totalAmount: 0,
      paidById: currentUserId,
      date: todayIsoDateTehran(),
      splitMode: "EQUAL",
      splits: members.map((m) => ({
        userId: m.userId,
        amount: 0,
        selected: true,
        share: clampShare(m.defaultShare ?? MIN_SHARE),
      })),
    };
  }

  const selectedIds = new Set(Object.keys(initialExpense.splitAmounts));
  const priorRows = Object.entries(initialExpense.splitAmounts).map(
    ([userId, amount]) => ({
      amount,
      share: clampShare(
        initialExpense.splitShares?.[userId] ?? MIN_SHARE,
      ),
    }),
  );
  const splitMode = looksLikeWeightedEqual(priorRows) ? "EQUAL" : "EXACT";

  return {
    spaceId,
    title: initialExpense.title,
    totalAmount: initialExpense.totalAmount,
    paidById: initialExpense.paidById,
    date: initialExpense.date || todayIsoDateTehran(),
    splitMode,
    category: initialExpense.category,
    splits: members.map((m) => ({
      userId: m.userId,
      amount: initialExpense.splitAmounts[m.userId] ?? 0,
      selected: selectedIds.has(m.userId),
      share: clampShare(
        initialExpense.splitShares?.[m.userId] ??
          m.defaultShare ??
          MIN_SHARE,
      ),
    })),
  };
}

export function ExpenseForm({
  spaceId,
  currentUserId,
  members,
  currency: _currency = "TOMAN",
  initialExpense,
  onSuccess,
  spaceType = "TRIP",
}: ExpenseFormProps) {
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(initialExpense?.expenseId);
  const isPartner = spaceType === "PARTNER";
  const initialDate = initialExpense?.date ?? todayIsoDateTehran();
  const [changeDate, setChangeDate] = useState(
    Boolean(initialExpense && initialDate !== todayIsoDateTehran()),
  );

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: buildDefaultValues(
      spaceId,
      currentUserId,
      members,
      initialExpense,
    ),
  });

  const splitMode = useWatch({ control: form.control, name: "splitMode" });
  const totalAmount = asAmount(
    useWatch({ control: form.control, name: "totalAmount" }),
  );
  const splits = useWatch({ control: form.control, name: "splits" });
  const watchedDate = useWatch({ control: form.control, name: "date" });

  const selectedIndexes = useMemo(
    () =>
      (splits ?? [])
        .map((s, i) => (s.selected ? i : -1))
        .filter((i) => i >= 0),
    [splits],
  );

  const weightedParts = useMemo(() => {
    if (!totalAmount || selectedIndexes.length === 0) {
      return [] as { userId: string; amount: number; share: number }[];
    }
    try {
      const selected = selectedIndexes.map((i) => {
        const row = splits![i]!;
        return {
          userId: row.userId,
          share: clampShare(row.share ?? MIN_SHARE),
        };
      });
      return calculateWeightedSplits(asMoney(totalAmount), selected).map(
        (row) => ({
          userId: row.userId,
          amount: row.amount,
          share: row.share,
        }),
      );
    } catch {
      return [];
    }
  }, [totalAmount, selectedIndexes, splits]);

  const amountByUserId = useMemo(() => {
    return Object.fromEntries(
      weightedParts.map((p) => [p.userId, p.amount]),
    ) as Record<string, number>;
  }, [weightedParts]);

  useEffect(() => {
    if (splitMode !== "EQUAL") return;
    const current = form.getValues("splits");
    const next = current.map((row) => {
      if (!row.selected) return { ...row, amount: 0 };
      return { ...row, amount: amountByUserId[row.userId] ?? 0 };
    });
    const changed = next.some((row, i) => row.amount !== current[i]?.amount);
    if (changed) {
      form.setValue("splits", next, { shouldValidate: false });
    }
  }, [splitMode, amountByUserId, form]);

  const exactAllocated = useMemo(() => {
    return (splits ?? [])
      .filter((s) => s.selected)
      .reduce((acc, s) => acc + (Number.isFinite(s.amount) ? s.amount : 0), 0);
  }, [splits]);

  const remaining = totalAmount - exactAllocated;
  const selectedCount = selectedIndexes.length;
  const totalShareWeight = useMemo(
    () =>
      (splits ?? [])
        .filter((s) => s.selected)
        .reduce((acc, s) => acc + clampShare(s.share ?? MIN_SHARE), 0),
    [splits],
  );

  const datePreview = formatDateFa(
    watchedDate ? `${watchedDate}T12:00:00+03:30` : new Date(),
  );
  const isToday =
    (watchedDate || todayIsoDateTehran()) === todayIsoDateTehran();

  function onSubmit(values: ExpenseFormValues) {
    startTransition(async () => {
      const payload: ExpenseFormValues = isPartner
        ? {
            ...values,
            paidById: isEdit ? values.paidById : currentUserId,
            splitMode: "EQUAL",
            date: todayIsoDateTehran(),
            splits: members.map((m) => ({
              userId: m.userId,
              amount: 0,
              selected: true,
              share: MIN_SHARE,
            })),
          }
        : {
            ...values,
            date:
              !changeDate && !isEdit
                ? todayIsoDateTehran()
                : values.date || todayIsoDateTehran(),
          };

      const result = isEdit
        ? await updateExpense(initialExpense!.expenseId, payload)
        : await addExpense(payload);
      if (!result.ok) {
        form.setError("root", { message: result.error });
        return;
      }
      if (!isEdit) {
        form.reset(buildDefaultValues(spaceId, currentUserId, members));
        setChangeDate(false);
      }
      onSuccess?.();
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-3"
      >
        <div className="space-y-3 rounded-2xl border border-border/55 bg-white p-3.5">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[12px] text-muted-foreground">
                  عنوان
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="مثلاً ناهار"
                    className="h-11 rounded-xl border-border/70 bg-[#f7fafb]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isEdit ? (
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[12px] text-muted-foreground">
                    دسته‌بندی
                  </FormLabel>
                  <Select
                    value={field.value ?? "OTHER"}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl border-border/70 bg-[#f7fafb]">
                        <SelectValue placeholder="دسته" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {CATEGORY_LABELS[code]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    اگر عوض کنید، همین دسته قفل می‌شود و با تغییر عنوان عوض نمی‌شود.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          <FormField
            control={form.control}
            name="totalAmount"
            render={({ field }) => {
              const live = asAmount(field.value);
              return (
                <FormItem className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel className="text-[12px] text-muted-foreground">
                      مبلغ (تومان)
                    </FormLabel>
                    {live > 0 ? (
                      <span className="text-[11px] font-medium tabular-nums text-primary">
                        {formatCurrency(live)}
                      </span>
                    ) : null}
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      placeholder="۲۵۰۰۰۰"
                      className="h-12 rounded-xl border-border/70 bg-[#f7fafb] text-lg font-bold tabular-nums"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(parseAmountInput(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {!isPartner ? (
          <div className="space-y-2 rounded-xl bg-[#f7fafb] px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] text-muted-foreground">تاریخ</p>
              <p className="text-[13px] font-semibold text-foreground">
                {isToday && !changeDate ? "امروز" : datePreview}
                {isToday && !changeDate ? (
                  <span className="ms-1.5 text-[11px] font-normal text-muted-foreground">
                    ({datePreview})
                  </span>
                ) : null}
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5">
              <Checkbox
                checked={changeDate}
                onCheckedChange={(v) => {
                  const on = v === true;
                  setChangeDate(on);
                  if (!on && !isEdit) {
                    form.setValue("date", todayIsoDateTehran());
                  }
                }}
                className="size-4.5 rounded data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              />
              <span className="text-[12.5px] text-foreground">
                تاریخ دیگری ثبت کنم
              </span>
            </label>
            {changeDate ? (
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormControl>
                      <JalaliDatePicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </div>
          ) : null}

          {!isPartner ? (
          <FormField
            control={form.control}
            name="paidById"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[12px] text-muted-foreground">
                  پرداخت‌کننده
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-11 rounded-xl border-border/70 bg-[#f7fafb]">
                      <SelectValue placeholder="انتخاب کنید" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {personLabel(m, currentUserId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          ) : null}

          {!isPartner ? (
          <FormField
            control={form.control}
            name="splitMode"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[12px] text-muted-foreground">
                  تسهیم
                </FormLabel>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/80 p-1">
                  {(
                    [
                      { value: "EQUAL", label: "مساوی" },
                      { value: "EXACT", label: "دقیق" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={cn(
                        "h-9 rounded-lg text-[13px] font-semibold transition-colors duration-150",
                        field.value === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          ) : (
            <p className="rounded-xl bg-[#f7fafb] px-3 py-2.5 text-[12px] text-muted-foreground">
              هزینه به‌صورت مساوی بین شما و طرف مقابل تسهیم می‌شود.
            </p>
          )}
        </div>

        {!isPartner ? (
        <div className="rounded-2xl border border-border/55 bg-white p-3.5">
          <div className="mb-2.5 flex items-baseline justify-between gap-2">
            <p className="text-[13px] font-semibold text-foreground">چه کسانی</p>
            <p className="text-[11px] text-muted-foreground">
              {selectedCount} نفر
              {splitMode === "EQUAL" && totalShareWeight > 0
                ? ` · ${totalShareWeight} سهم`
                : ""}
            </p>
          </div>

          <ul className="divide-y divide-border/45">
            {members.map((member, index) => {
              const selected = splits?.[index]?.selected ?? false;
              const equalAmount = selected
                ? amountByUserId[member.userId]
                : undefined;
              const shareValue = clampShare(
                splits?.[index]?.share ?? member.defaultShare ?? MIN_SHARE,
              );

              return (
                <li key={member.userId} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5">
                    <FormField
                      control={form.control}
                      name={`splits.${index}.selected`}
                      render={({ field }) => (
                        <FormItem className="flex min-w-0 flex-1 flex-row items-center gap-2.5 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(v) => {
                                const nextSelected = v === true;
                                field.onChange(nextSelected);

                                if (form.getValues("splitMode") !== "EXACT") {
                                  return;
                                }
                                const total = asAmount(
                                  form.getValues("totalAmount"),
                                );
                                const current = form.getValues("splits");
                                const nextRows = current.map((row, i) =>
                                  i === index
                                    ? { ...row, selected: nextSelected }
                                    : row,
                                );
                                const nextIndexes = nextRows
                                  .map((row, i) => (row.selected ? i : -1))
                                  .filter((i) => i >= 0);
                                form.setValue(
                                  "splits",
                                  redistributeAmongSelected(
                                    nextRows,
                                    total,
                                    nextIndexes,
                                  ),
                                  { shouldValidate: true },
                                );
                              }}
                              className="size-5 rounded-md data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                            />
                          </FormControl>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(member.name || member.phone)}`}
                            alt=""
                            width={28}
                            height={28}
                            className={cn(
                              "size-7 shrink-0 rounded-full bg-secondary",
                              !selected && "opacity-50",
                            )}
                          />
                          <FormLabel
                            className={cn(
                              "min-w-0 truncate text-[13px] font-medium",
                              !selected && "text-muted-foreground",
                            )}
                          >
                            {personLabel(member, currentUserId)}
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    {splitMode === "EQUAL" && selected ? (
                      <span className="shrink-0 text-[12px] font-semibold tabular-nums text-ink">
                        {equalAmount != null
                          ? formatCurrency(equalAmount)
                          : "—"}
                      </span>
                    ) : null}
                  </div>

                  {splitMode === "EQUAL" && selected ? (
                    <FormField
                      control={form.control}
                      name={`splits.${index}.share`}
                      render={({ field }) => (
                        <FormItem className="mt-2 ps-8">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">
                              ضریب
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-8 rounded-lg"
                              disabled={shareValue <= MIN_SHARE}
                              onClick={() =>
                                field.onChange(clampShare(shareValue - 1))
                              }
                              aria-label="کاهش ضریب"
                            >
                              −
                            </Button>
                            <span className="min-w-8 text-center text-[13px] font-semibold tabular-nums">
                              ×{shareValue}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-8 rounded-lg"
                              disabled={shareValue >= MAX_SHARE}
                              onClick={() =>
                                field.onChange(clampShare(shareValue + 1))
                              }
                              aria-label="افزایش ضریب"
                            >
                              +
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}

                  {splitMode === "EXACT" && selected ? (
                    <FormField
                      control={form.control}
                      name={`splits.${index}.amount`}
                      render={({ field }) => {
                        const live = asAmount(field.value);
                        return (
                          <FormItem className="mt-2 ps-8">
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  step={1}
                                  className="h-10 rounded-xl border-border/70 bg-[#f7fafb] text-sm font-semibold"
                                  placeholder="سهم"
                                  name={field.name}
                                  ref={field.ref}
                                  onBlur={field.onBlur}
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseAmountInput(e.target.value),
                                    )
                                  }
                                />
                              </FormControl>
                              {live > 0 ? (
                                <span className="shrink-0 text-[11px] text-muted-foreground">
                                  {formatCurrency(live)}
                                </span>
                              ) : null}
                            </div>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>

          {splitMode === "EXACT" ? (
            <div
              className={cn(
                "mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-[13px]",
                remaining === 0
                  ? "bg-success-soft text-success"
                  : remaining > 0
                    ? "bg-muted text-muted-foreground"
                    : "bg-destructive-soft text-destructive",
              )}
            >
              <span>باقی‌مانده</span>
              <span className="font-bold tabular-nums">
                {formatCurrency(remaining)}
              </span>
            </div>
          ) : null}
        </div>
        ) : null}

        {form.formState.errors.root?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        {form.formState.errors.splits?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.splits.message}
          </p>
        ) : null}
        {typeof form.formState.errors.splits?.root?.message === "string" ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.splits.root.message}
          </p>
        ) : null}

        <div className="sticky bottom-0 -mx-1 bg-linear-to-t from-[#eef5f4] via-[#eef5f4]/95 to-transparent pt-2 pb-1">
          <Button
            type="submit"
            className="h-12 w-full rounded-2xl text-[15px] font-semibold"
            disabled={pending}
          >
            {pending
              ? isEdit
                ? "در حال ذخیره…"
                : "در حال ثبت…"
              : isEdit
                ? "ذخیره تغییرات"
                : "ثبت هزینه"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
