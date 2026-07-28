"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
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
  currencyLabel,
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
  DEFAULT_SHARE,
  formatShareLabel,
  MAX_SHARE,
  MIN_SHARE,
  SHARE_STEP,
  splitEqual,
} from "@/lib/money";
import { useUiStore } from "@/lib/stores/ui-store";
import {
  BUILDING_CATEGORY_LABELS,
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  categoriesForBuilding,
  categoriesForType,
  guessCategoryFromTitle,
  type ExpenseCategory,
} from "@/lib/categorizer";
import {
  expenseSchema,
  type ExpenseFormValues,
  type TransactionTypeForm,
} from "@/lib/validations/expense";
import { cn } from "@/lib/utils";
import { CategoryPickerSheet } from "@/components/expenses/category-picker-sheet";
import { getTemplate } from "@/lib/templates/registry";
import type { SpaceType } from "@/types";

const JalaliDatePicker = dynamic(
  () =>
    import("@/components/ui/jalali-date-picker").then(
      (m) => m.JalaliDatePicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 animate-pulse rounded-2xl bg-muted/40" />
    ),
  },
);

const CATEGORY_DEBOUNCE_MS = 300;
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
  transactionType?: TransactionTypeForm;
};

type ExpenseFormProps = {
  spaceId: string;
  currentUserId: string;
  members: ExpenseMember[];
  currency?: SpaceCurrency;
  initialExpense?: ExpenseInitialValues;
  onSuccess?: () => void;
  spaceType?: SpaceType;
  defaultTransactionType?: TransactionTypeForm;
  /** خانه: hide others' private categories from the picker. */
  hiddenCategories?: ExpenseCategory[];
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
  defaultTransactionType: TransactionTypeForm = "EXPENSE",
): ExpenseFormValues {
  if (!initialExpense) {
    return {
      spaceId,
      title: "",
      totalAmount: 0,
      paidById: currentUserId,
      date: todayIsoDateTehran(),
      splitMode: "EQUAL",
      transactionType: defaultTransactionType,
      splits: members.map((m) => ({
        userId: m.userId,
        amount: 0,
        selected: true,
        share: clampShare(m.defaultShare ?? DEFAULT_SHARE),
      })),
    };
  }

  const selectedIds = new Set(Object.keys(initialExpense.splitAmounts));
  const priorRows = Object.entries(initialExpense.splitAmounts).map(
    ([userId, amount]) => ({
      amount,
      share: clampShare(
        initialExpense.splitShares?.[userId] ?? DEFAULT_SHARE,
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
    transactionType: initialExpense.transactionType ?? "EXPENSE",
    category: initialExpense.category,
    splits: members.map((m) => ({
      userId: m.userId,
      amount: initialExpense.splitAmounts[m.userId] ?? 0,
      selected: selectedIds.has(m.userId),
      share: clampShare(
        initialExpense.splitShares?.[m.userId] ??
          m.defaultShare ??
          DEFAULT_SHARE,
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
  defaultTransactionType = "EXPENSE",
  hiddenCategories = [],
}: ExpenseFormProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(initialExpense?.expenseId);
  const features = getTemplate(spaceType).features;
  const isBuilding = features.buildingCharges;
  /** Income/expense toggle — not for building shared costs. */
  const showIncomeExpense = features.incomeExpense && !isBuilding;
  const showManualSplits = features.manualSplits;
  const isSoloLedger = features.solo;
  /** Family shared ledger only — do not conflate with building. */
  const isHouseholdLedger = features.householdLedger;
  const isPartnerEqual = spaceType === "PARTNER";
  const hideSplits = !showManualSplits;
  const showPaidByPicker =
    (!hideSplits || isHouseholdLedger) && !isBuilding;
  const initialDate = initialExpense?.date ?? todayIsoDateTehran();
  const [changeDate, setChangeDate] = useState(
    Boolean(initialExpense && initialDate !== todayIsoDateTehran()),
  );
  const [manualCategory, setManualCategory] = useState<ExpenseCategory | null>(
    null,
  );
  const [customCategoryLabel, setCustomCategoryLabel] = useState<string | null>(
    null,
  );
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [debouncedTitle, setDebouncedTitle] = useState("");
  /** Trip split list — collapsed by default to keep the bottom sheet compact. */
  const [splitsOpen, setSplitsOpen] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: buildDefaultValues(
      spaceId,
      currentUserId,
      members,
      initialExpense,
      defaultTransactionType,
    ),
  });

  const splitMode = useWatch({ control: form.control, name: "splitMode" });
  const transactionType =
    useWatch({ control: form.control, name: "transactionType" }) ?? "EXPENSE";
  const watchedTitle = useWatch({ control: form.control, name: "title" }) ?? "";
  const totalAmount = asAmount(
    useWatch({ control: form.control, name: "totalAmount" }),
  );
  const splits = useWatch({ control: form.control, name: "splits" });
  const watchedDate = useWatch({ control: form.control, name: "date" });

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedTitle(watchedTitle.trim());
    }, CATEGORY_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [watchedTitle]);

  useEffect(() => {
    if (form.formState.errors.splits) {
      setSplitsOpen(true);
    }
  }, [form.formState.errors.splits]);

  const predictedCategory = useMemo(
    () =>
      guessCategoryFromTitle(
        debouncedTitle,
        showIncomeExpense ? transactionType : "EXPENSE",
        { building: isBuilding },
      ),
    [debouncedTitle, showIncomeExpense, transactionType, isBuilding],
  );

  const activeCategory = manualCategory ?? predictedCategory;
  const showSmartChip = !isEdit && debouncedTitle.length >= 2;
  const categoryLabelFor = (code: ExpenseCategory) =>
    (isBuilding ? BUILDING_CATEGORY_LABELS[code] : undefined) ??
    CATEGORY_LABELS[code];
  const chipLabel = customCategoryLabel
    ? customCategoryLabel
    : categoryLabelFor(activeCategory);
  const chipEmoji = customCategoryLabel
    ? "🏷️"
    : CATEGORY_EMOJI[activeCategory];
  const isManualPick = Boolean(manualCategory || customCategoryLabel);

  useEffect(() => {
    if (isEdit) return;
    if (customCategoryLabel) {
      form.setValue("categoryLabel", customCategoryLabel, {
        shouldDirty: false,
        shouldValidate: false,
      });
      form.setValue(
        "category",
        transactionType === "INCOME" ? "OTHER_INCOME" : "OTHER",
        { shouldDirty: false, shouldValidate: false },
      );
      return;
    }
    form.setValue("categoryLabel", null, {
      shouldDirty: false,
      shouldValidate: false,
    });
    form.setValue("category", activeCategory, {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [
    activeCategory,
    customCategoryLabel,
    form,
    isEdit,
    transactionType,
  ]);

  useEffect(() => {
    setManualCategory(null);
    setCustomCategoryLabel(null);
  }, [transactionType]);

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
          share: clampShare(row.share ?? DEFAULT_SHARE),
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
        .reduce((acc, s) => acc + clampShare(s.share ?? DEFAULT_SHARE), 0),
    [splits],
  );

  const datePreview = formatDateFa(
    watchedDate ? `${watchedDate}T12:00:00+03:30` : new Date(),
  );
  const isToday =
    (watchedDate || todayIsoDateTehran()) === todayIsoDateTehran();

  function onSubmit(values: ExpenseFormValues) {
    const base: ExpenseFormValues = { ...values };
    if (!isEdit) {
      if (customCategoryLabel) {
        base.categoryLabel = customCategoryLabel;
        base.category =
          (values.transactionType ?? "EXPENSE") === "INCOME"
            ? "OTHER_INCOME"
            : "OTHER";
      } else if (manualCategory) {
        base.category = manualCategory;
        base.categoryLabel = null;
      } else {
        delete base.category;
        base.categoryLabel = null;
      }
    }

    const payload: ExpenseFormValues = isSoloLedger
      ? {
          ...base,
          paidById: currentUserId,
          splitMode: "EQUAL",
          transactionType: values.transactionType ?? "EXPENSE",
          date:
            !changeDate && !isEdit
              ? todayIsoDateTehran()
              : values.date || todayIsoDateTehran(),
          splits: [
            {
              userId: currentUserId,
              amount: values.totalAmount,
              selected: true,
              share: DEFAULT_SHARE,
            },
          ],
        }
      : isBuilding
        ? {
            ...base,
            paidById: currentUserId,
            splitMode: "EQUAL",
            transactionType: "EXPENSE",
            date:
              !changeDate && !isEdit
                ? todayIsoDateTehran()
                : values.date || todayIsoDateTehran(),
            splits: [
              {
                userId: currentUserId,
                amount: values.totalAmount,
                selected: true,
                share: DEFAULT_SHARE,
              },
            ],
          }
        : isHouseholdLedger
          ? {
              ...base,
              paidById: values.paidById || currentUserId,
              splitMode: "EQUAL",
              transactionType: values.transactionType ?? "EXPENSE",
              date:
                !changeDate && !isEdit
                  ? todayIsoDateTehran()
                  : values.date || todayIsoDateTehran(),
              splits: [
                {
                  userId: values.paidById || currentUserId,
                  amount: values.totalAmount,
                  selected: true,
                  share: DEFAULT_SHARE,
                },
              ],
            }
          : isPartnerEqual
            ? {
                ...base,
                paidById: isEdit ? values.paidById : currentUserId,
                splitMode: "EQUAL",
                transactionType: "EXPENSE",
                date: todayIsoDateTehran(),
                splits: members.map((m) => ({
                  userId: m.userId,
                  amount: 0,
                  selected: true,
                  share: clampShare(m.defaultShare ?? DEFAULT_SHARE),
                })),
              }
            : {
                ...base,
                transactionType: showIncomeExpense
                  ? (values.transactionType ?? "EXPENSE")
                  : "EXPENSE",
                date:
                  !changeDate && !isEdit
                    ? todayIsoDateTehran()
                    : values.date || todayIsoDateTehran(),
              };

    // Fast-close: drawer closes before the server round-trip.
    onSuccess?.();
    showToast(isEdit ? "ذخیره شد" : "ثبت شد");
    if (!isEdit) {
      form.reset(
        buildDefaultValues(
          spaceId,
          currentUserId,
          members,
          undefined,
          defaultTransactionType,
        ),
      );
      setChangeDate(false);
      setManualCategory(null);
      setCustomCategoryLabel(null);
      setDebouncedTitle("");
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateExpense(initialExpense!.expenseId, payload)
        : await addExpense(payload);
      if (!result.ok) {
        showToast(result.error || "خطا در ثبت اطلاعات", "error");
        return;
      }
      router.refresh();
    });
  }

  const categoryOptions = (
    isBuilding
      ? categoriesForBuilding()
      : categoriesForType(showIncomeExpense ? transactionType : "EXPENSE")
  ).filter((c) => !hiddenCategories.includes(c));
  const submitLabel = isBuilding
    ? isEdit
      ? "ذخیره هزینه مشاع"
      : "ثبت هزینه"
    : showIncomeExpense
      ? transactionType === "INCOME"
        ? isEdit
          ? "ذخیره درآمد"
          : "ثبت درآمد"
        : isEdit
          ? "ذخیره هزینه"
          : "ثبت هزینه"
      : isEdit
        ? "ذخیره تغییرات"
        : "ثبت هزینه";

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-3"
      >
        {showIncomeExpense ? (
          <FormField
            control={form.control}
            name="transactionType"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border/55 bg-card p-1 shadow-sm">
                  {(
                    [
                      {
                        value: "EXPENSE" as const,
                        label: "هزینه",
                        hint: "خروجی",
                      },
                      {
                        value: "INCOME" as const,
                        label: "درآمد",
                        hint: "ورودی",
                      },
                    ] as const
                  ).map((opt) => {
                    const selected = field.value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          field.onChange(opt.value);
                          setManualCategory(null);
                          setCustomCategoryLabel(null);
                          if (isEdit) {
                            const cats = categoriesForType(opt.value);
                            const current = form.getValues("category");
                            if (current && !cats.includes(current)) {
                              form.setValue("category", cats[0]);
                            }
                          }
                        }}
                        className={cn(
                          "flex flex-col items-center rounded-xl px-2 py-2.5 transition-all",
                          selected && opt.value === "EXPENSE"
                            ? "bg-destructive text-destructive-foreground shadow-sm"
                            : selected && opt.value === "INCOME"
                              ? "bg-success text-success-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                        )}
                      >
                        <span className="text-body-sm font-bold">
                          {opt.label}
                        </span>
                        <span className="mt-0.5 text-micro opacity-80">
                          {opt.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <div className="space-y-3 rounded-2xl border border-border/55 bg-card p-3.5">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-label text-muted-foreground">
                  عنوان
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={
                      isBuilding
                        ? "مثلاً قبض برق مشاع یا تعمیر آسانسور"
                        : showIncomeExpense && transactionType === "INCOME"
                          ? "مثلاً حقوق فروردین"
                          : "مثلاً ناهار"
                    }
                    className="h-11 rounded-xl border-border/70 bg-sheet-muted"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {showSmartChip ? (
            <>
              <button
                type="button"
                onClick={() => setCategoryDrawerOpen(true)}
                className={cn(
                  "inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-semibold transition-all",
                  "ring-1 ring-inset active:scale-[0.98]",
                  isManualPick
                    ? "bg-success-soft text-success ring-success/25"
                    : "bg-primary/8 text-primary ring-primary/20 hover:bg-primary/12",
                )}
              >
                <span aria-hidden>{isManualPick ? "✅" : "✨"}</span>
                <span className="truncate">
                  {isManualPick
                    ? `${chipEmoji} ${chipLabel}`
                    : `پیشنهاد: ${chipEmoji} ${chipLabel}`}
                </span>
                <span
                  className="ms-0.5 text-micro opacity-70"
                  aria-hidden
                >
                  ▾
                </span>
              </button>

              <CategoryPickerSheet
                open={categoryDrawerOpen}
                onOpenChange={setCategoryDrawerOpen}
                spaceId={spaceId}
                options={categoryOptions}
                predictedCategory={predictedCategory}
                labelOverrides={isBuilding ? BUILDING_CATEGORY_LABELS : undefined}
                value={
                  customCategoryLabel
                    ? { kind: "custom", label: customCategoryLabel }
                    : manualCategory
                      ? { kind: "builtin", category: manualCategory }
                      : null
                }
                onSelect={(next) => {
                  if (next.kind === "custom") {
                    setCustomCategoryLabel(next.label);
                    setManualCategory(null);
                    form.setValue("categoryLabel", next.label, {
                      shouldDirty: true,
                    });
                    form.setValue(
                      "category",
                      transactionType === "INCOME"
                        ? "OTHER_INCOME"
                        : "OTHER",
                      { shouldDirty: true },
                    );
                    return;
                  }
                  setCustomCategoryLabel(null);
                  setManualCategory(next.category);
                  form.setValue("categoryLabel", null, { shouldDirty: true });
                  form.setValue("category", next.category, {
                    shouldDirty: true,
                  });
                }}
              />
            </>
          ) : null}

          {isEdit ? (
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-label text-muted-foreground">
                    دسته‌بندی
                  </FormLabel>
                  <Select
                    value={field.value ?? categoryOptions[0]}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl border-border/70 bg-sheet-muted">
                        <SelectValue placeholder="دسته" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((code) => (
                        <SelectItem key={code} value={code}>
                          {categoryLabelFor(code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-caption text-muted-foreground">
                    اگر عوض کنید، همین دسته قفل می‌شود و با تغییر عنوان عوض
                    نمی‌شود.
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
                    <FormLabel className="text-label text-muted-foreground">
                      مبلغ ({currencyLabel(_currency)})
                    </FormLabel>
                    {live > 0 ? (
                      <span className="text-caption font-medium tabular-nums text-primary">
                        {formatCurrency(live, _currency)}
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
                      className="h-12 rounded-xl border-border/70 bg-sheet-muted text-lg font-bold tabular-nums"
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

          {!isPartnerEqual ? (
          <div className="space-y-2 rounded-xl bg-sheet-muted px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-label text-muted-foreground">تاریخ</p>
              <p className="text-body-sm font-semibold text-foreground">
                {isToday && !changeDate ? "امروز" : datePreview}
                {isToday && !changeDate ? (
                  <span className="ms-1.5 text-caption font-normal text-muted-foreground">
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
              <span className="text-label text-foreground">
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

          {showPaidByPicker ? (
          <FormField
            control={form.control}
            name="paidById"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-label text-muted-foreground">
                  {isHouseholdLedger ? "پرداخت از کارت / جیب" : "پرداخت‌کننده"}
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-11 rounded-xl border-border/70 bg-sheet-muted">
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

          {!hideSplits ? (
          <FormField
            control={form.control}
            name="splitMode"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-label text-muted-foreground">
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
                        "h-9 rounded-lg text-body-sm font-semibold transition-colors duration-150",
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
          ) : isPartnerEqual ? (
            <p className="rounded-xl bg-sheet-muted px-3 py-2.5 text-label text-muted-foreground">
              هزینه به‌صورت مساوی بین شما و طرف مقابل تسهیم می‌شود.
            </p>
          ) : isBuilding ? (
            <p className="rounded-xl bg-sheet-muted px-3 py-2.5 text-label text-muted-foreground">
              این هزینه مشاع از صندوق ساختمان کسر می‌شود.
            </p>
          ) : isHouseholdLedger ? (
            <p className="rounded-xl bg-sheet-muted px-3 py-2.5 text-label text-muted-foreground">
              این تراکنش در لجر مشترک خانواده ثبت می‌شود — بدون بدهی بین اعضا.
            </p>
          ) : isSoloLedger ? (
            <p className="rounded-xl bg-sheet-muted px-3 py-2.5 text-label text-muted-foreground">
              {transactionType === "INCOME"
                ? "این مبلغ به عنوان درآمد شخصی شما ثبت می‌شود."
                : "این مبلغ به عنوان هزینه شخصی شما ثبت می‌شود."}
            </p>
          ) : null}
        </div>

        {!hideSplits ? (
        <div className="rounded-2xl border border-border/55 bg-card p-3.5">
          <button
            type="button"
            onClick={() => setSplitsOpen((o) => !o)}
            className="flex w-full items-center gap-2 text-start active:opacity-80"
            aria-expanded={splitsOpen}
            aria-controls="expense-splits-panel"
          >
            <div className="min-w-0 flex-1">
              <p className="text-body-sm font-semibold text-foreground">
                چه کسانی
              </p>
              <p className="mt-0.5 text-caption text-muted-foreground">
                {selectedCount} نفر
                {splitMode === "EQUAL" && totalShareWeight > 0
                  ? ` · ${totalShareWeight} سهم`
                  : ""}
                {!splitsOpen ? " · برای ویرایش باز کنید" : ""}
              </p>
            </div>
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-transform duration-200 ease-out",
                splitsOpen && "rotate-180",
              )}
              aria-hidden
            >
              <ChevronDownIcon className="size-4" />
            </span>
          </button>

          <div
            id="expense-splits-panel"
            className={cn(
              "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
              splitsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <ul className="mt-2.5 divide-y divide-border/45 border-t border-border/40 pt-2.5">
            {members.map((member, index) => {
              const selected = splits?.[index]?.selected ?? false;
              const equalAmount = selected
                ? amountByUserId[member.userId]
                : undefined;
              const shareValue = clampShare(
                splits?.[index]?.share ?? member.defaultShare ?? DEFAULT_SHARE,
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
                              "min-w-0 truncate text-body-sm font-medium",
                              !selected && "text-muted-foreground",
                            )}
                          >
                            {personLabel(member, currentUserId)}
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    {splitMode === "EQUAL" && selected ? (
                      <span className="shrink-0 text-label font-semibold tabular-nums text-ink">
                        {equalAmount != null
                          ? formatCurrency(equalAmount, _currency)
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
                            <span className="text-caption text-muted-foreground">
                              ضریب
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-8 rounded-lg"
                              disabled={shareValue <= MIN_SHARE}
                              onClick={() =>
                                field.onChange(
                                  clampShare(shareValue - SHARE_STEP),
                                )
                              }
                              aria-label="کاهش ضریب نیم‌نفر"
                            >
                              −
                            </Button>
                            <span className="min-w-10 text-center text-body-sm font-semibold tabular-nums">
                              ×{formatShareLabel(shareValue)}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-8 rounded-lg"
                              disabled={shareValue >= MAX_SHARE}
                              onClick={() =>
                                field.onChange(
                                  clampShare(shareValue + SHARE_STEP),
                                )
                              }
                              aria-label="افزایش ضریب نیم‌نفر"
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
                                  className="h-10 rounded-xl border-border/70 bg-sheet-muted text-sm font-semibold"
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
                                <span className="shrink-0 text-caption text-muted-foreground">
                                  {formatCurrency(live, _currency)}
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
                    "mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-body-sm",
                    remaining === 0
                      ? "bg-success-soft text-success"
                      : remaining > 0
                        ? "bg-muted text-muted-foreground"
                        : "bg-destructive-soft text-destructive",
                  )}
                >
                  <span>باقی‌مانده</span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(remaining, _currency)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
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

        <div className="pt-1">
          <Button
            type="submit"
            className="h-11 w-full rounded-xl text-body-sm font-semibold text-primary-foreground"
            disabled={pending}
          >
            {pending
              ? isEdit
                ? "در حال ذخیره…"
                : "در حال ثبت…"
              : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
