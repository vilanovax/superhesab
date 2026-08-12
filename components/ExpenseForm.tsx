"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useFormState, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getBuildingScopeContext } from "@/app/actions/buildingCategoryScope";
import { addExpense, updateExpense } from "@/app/actions/expense";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  resolveUnitsFromScope,
  scopeSummaryFa,
  type BuildingScopeMode,
} from "@/lib/building-category-scope";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
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
  calculatePercentageSplits,
  calculateWeightedSplits,
  clampShare,
  DEFAULT_SHARE,
  distributeEqualPercents,
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
  type SplitMode,
  type TransactionTypeForm,
} from "@/lib/validations/expense";
import { cn } from "@/lib/utils";
import { BuildingBillTags } from "@/components/expenses/building-bill-tags";
import { CategoryPickerSheet } from "@/components/expenses/category-picker-sheet";
import {
  DEFAULT_BILL_TAGS,
  formatCategoryWithTag,
  guessBillTagFromTitle,
  rememberCustomBillTag,
} from "@/lib/building-bill-tags";

const DEFAULT_BILL_TAGS_SET = new Set<string>(DEFAULT_BILL_TAGS);
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
  splitPercents?: Record<string, number>;
  splitMode?: SplitMode;
  category: ExpenseCategory;
  /** Sub-tag under a builtin (e.g. قبوض → آب) or freeform custom name. */
  categoryLabel?: string | null;
  transactionType?: TransactionTypeForm;
  /** BUILDING: snapshotted included units (null = ALL / no snapshot). */
  includedUnitIds?: string[] | null;
};

type ExpenseFormProps = {
  spaceId: string;
  currentUserId: string;
  members: ExpenseMember[];
  currency?: SpaceCurrency;
  initialExpense?: ExpenseInitialValues;
  onSuccess?: () => void;
  /** Notify parent when the draft has unsaved edits (for dismiss guards). */
  onDirtyChange?: (dirty: boolean) => void;
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
    const equalPercents = distributeEqualPercents(members.length);
    return {
      spaceId,
      title: "",
      totalAmount: 0,
      paidById: currentUserId,
      date: todayIsoDateTehran(),
      splitMode: "EQUAL",
      transactionType: defaultTransactionType,
      splits: members.map((m, i) => ({
        userId: m.userId,
        amount: 0,
        selected: true,
        share: clampShare(m.defaultShare ?? DEFAULT_SHARE),
        percent: equalPercents[i] ?? 0,
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
  const storedMode = initialExpense.splitMode;
  const splitMode: SplitMode =
    storedMode === "EQUAL" ||
    storedMode === "EXACT" ||
    storedMode === "PERCENT"
      ? storedMode
      : looksLikeWeightedEqual(priorRows)
        ? "EQUAL"
        : "EXACT";

  const selectedCount = selectedIds.size || 1;
  const fallbackPercents = distributeEqualPercents(selectedCount);
  let percentSlot = 0;

  return {
    spaceId,
    title: initialExpense.title,
    totalAmount: initialExpense.totalAmount,
    paidById: initialExpense.paidById,
    date: initialExpense.date || todayIsoDateTehran(),
    splitMode,
    transactionType: initialExpense.transactionType ?? "EXPENSE",
    category: initialExpense.category,
    categoryLabel: initialExpense.categoryLabel ?? null,
    splits: members.map((m) => {
      const selected = selectedIds.has(m.userId);
      const storedPercent = initialExpense.splitPercents?.[m.userId];
      let percent = 0;
      if (selected) {
        percent =
          typeof storedPercent === "number" && Number.isFinite(storedPercent)
            ? Math.trunc(storedPercent)
            : (fallbackPercents[percentSlot] ?? 0);
        percentSlot += 1;
      }
      return {
        userId: m.userId,
        amount: initialExpense.splitAmounts[m.userId] ?? 0,
        selected,
        share: clampShare(
          initialExpense.splitShares?.[m.userId] ??
            m.defaultShare ??
            DEFAULT_SHARE,
        ),
        percent,
      };
    }),
  };
}

export function ExpenseForm({
  spaceId,
  currentUserId,
  members,
  currency: _currency = "TOMAN",
  initialExpense,
  onSuccess,
  onDirtyChange,
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
  /** Trip / partner sheet — same dense chrome as building (sticky footer, chips). */
  const isPartnerEqual = spaceType === "PARTNER";
  const isLedgerDense = spaceType === "TRIP" || isPartnerEqual;
  const useDenseChrome = isBuilding || isLedgerDense;
  /** Income/expense toggle — not for building shared costs. */
  const showIncomeExpense = features.incomeExpense && !isBuilding;
  const showManualSplits = features.manualSplits;
  const isSoloLedger = features.solo;
  /** Family shared ledger only — do not conflate with building. */
  const isHouseholdLedger = features.householdLedger;
  const hideSplits = !showManualSplits;
  const showPaidByPicker =
    (!hideSplits || isHouseholdLedger || isPartnerEqual) && !isBuilding;
  const partnerOther = isPartnerEqual
    ? members.find((m) => m.userId !== currentUserId)
    : undefined;
  const partnerOtherLabel = partnerOther
    ? personLabel(partnerOther, currentUserId)
    : "طرف مقابل";
  const initialDate = initialExpense?.date ?? todayIsoDateTehran();
  const initialChangeDate = Boolean(
    initialExpense && initialDate !== todayIsoDateTehran(),
  );
  const [changeDate, setChangeDate] = useState(initialChangeDate);
  const [manualCategory, setManualCategory] = useState<ExpenseCategory | null>(
    null,
  );
  const [customCategoryLabel, setCustomCategoryLabel] = useState<string | null>(
    null,
  );
  const [billTag, setBillTag] = useState<string | null>(() =>
    initialExpense?.category === "BUILDING_BILLS"
      ? (initialExpense.categoryLabel?.trim() || null)
      : null,
  );
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [debouncedTitle, setDebouncedTitle] = useState("");
  /** Trip split list — collapsed by default to keep the bottom sheet compact. */
  const [splitsOpen, setSplitsOpen] = useState(false);
  /** BUILDING: category → unit scope context (loaded once). */
  const [buildingUnits, setBuildingUnits] = useState<
    { id: string; name: string; isActive: boolean }[]
  >([]);
  const [buildingScopes, setBuildingScopes] = useState<
    {
      category: ExpenseCategory;
      mode: BuildingScopeMode;
      unitRule: "INCLUDE" | "EXCLUDE";
      unitIds: string[];
    }[]
  >([]);
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  /** HYBRID: which units are included (default = all active). */
  const [includedUnitIds, setIncludedUnitIds] = useState<string[]>(
    () => initialExpense?.includedUnitIds ?? [],
  );
  const [unitIdsTouched, setUnitIdsTouched] = useState(
    () => Boolean(initialExpense?.includedUnitIds?.length),
  );

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

  const { isDirty: formDirty } = useFormState({ control: form.control });
  const draftDirty =
    formDirty ||
    Boolean(manualCategory) ||
    Boolean(customCategoryLabel) ||
    changeDate !== initialChangeDate;
  const blockDismiss = draftDirty || pending;

  useEffect(() => {
    onDirtyChange?.(blockDismiss);
  }, [blockDismiss, onDirtyChange]);

  useEffect(() => {
    if (!blockDismiss) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [blockDismiss]);

  const splitMode = useWatch({ control: form.control, name: "splitMode" });
  const transactionType =
    useWatch({ control: form.control, name: "transactionType" }) ?? "EXPENSE";
  const watchedTitle = useWatch({ control: form.control, name: "title" }) ?? "";
  const totalAmount = asAmount(
    useWatch({ control: form.control, name: "totalAmount" }),
  );
  const splits = useWatch({ control: form.control, name: "splits" });
  const watchedDate = useWatch({ control: form.control, name: "date" });
  const watchedCategory = useWatch({ control: form.control, name: "category" });

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

  useEffect(() => {
    if (!isBuilding) return;
    let cancelled = false;
    void getBuildingScopeContext(spaceId).then((ctx) => {
      if (cancelled || !ctx) return;
      setBuildingUnits(ctx.units);
      setBuildingScopes(
        ctx.scopes.map((s) => ({
          category: s.category,
          mode: s.mode,
          unitRule: s.unitRule,
          unitIds: s.unitIds,
        })),
      );
      if (!unitIdsTouched) {
        setIncludedUnitIds(ctx.units.map((u) => u.id));
      } else if (
        initialExpense?.includedUnitIds &&
        initialExpense.includedUnitIds.length > 0
      ) {
        setIncludedUnitIds(initialExpense.includedUnitIds);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per open
  }, [isBuilding, spaceId]);

  const predictedCategory = useMemo(
    () =>
      guessCategoryFromTitle(
        debouncedTitle,
        showIncomeExpense ? transactionType : "EXPENSE",
        { building: isBuilding },
      ),
    [debouncedTitle, showIncomeExpense, transactionType, isBuilding],
  );

  const activeCategory =
    manualCategory ??
    (isEdit ? (watchedCategory ?? predictedCategory) : predictedCategory);

  const activeScope = useMemo(() => {
    if (!isBuilding) return null;
    return (
      buildingScopes.find((s) => s.category === activeCategory) ?? {
        category: activeCategory,
        mode: "ALL" as BuildingScopeMode,
        unitRule: "EXCLUDE" as const,
        unitIds: [] as string[],
      }
    );
  }, [isBuilding, buildingScopes, activeCategory]);

  const scopeMode = activeScope?.mode ?? "ALL";
  const fixedIncludedIds = useMemo(() => {
    if (!activeScope || activeScope.mode !== "FIXED") return [];
    return resolveUnitsFromScope({
      mode: "FIXED",
      unitRule: activeScope.unitRule,
      listedUnitIds: activeScope.unitIds,
      activeUnitIds: buildingUnits.map((u) => u.id),
    });
  }, [activeScope, buildingUnits]);

  const displayIncludedCount =
    scopeMode === "FIXED"
      ? fixedIncludedIds.length
      : scopeMode === "HYBRID"
        ? includedUnitIds.length
        : buildingUnits.length;

  useEffect(() => {
    if (!isBuilding || scopeMode !== "HYBRID") return;
    if (unitIdsTouched) return;
    setIncludedUnitIds(buildingUnits.map((u) => u.id));
  }, [isBuilding, scopeMode, buildingUnits, unitIdsTouched, activeCategory]);

  /** Building/trip use always-visible chips; others wait for a short title. */
  const showSmartChip =
    !useDenseChrome && !isEdit && debouncedTitle.length >= 2;
  const categoryLabelFor = (code: ExpenseCategory) =>
    (isBuilding ? BUILDING_CATEGORY_LABELS[code] : undefined) ??
    CATEGORY_LABELS[code];
  const chipLabel = customCategoryLabel
    ? customCategoryLabel
    : isBuilding && activeCategory === "BUILDING_BILLS" && billTag
      ? formatCategoryWithTag(categoryLabelFor(activeCategory), billTag)
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
    form.setValue("category", activeCategory, {
      shouldDirty: false,
      shouldValidate: false,
    });
    if (isBuilding && activeCategory === "BUILDING_BILLS") {
      form.setValue("categoryLabel", billTag, {
        shouldDirty: false,
        shouldValidate: false,
      });
    } else {
      form.setValue("categoryLabel", null, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [
    activeCategory,
    billTag,
    customCategoryLabel,
    form,
    isBuilding,
    isEdit,
    transactionType,
  ]);

  /** Auto-suggest bill tag from title when under قبوض. */
  useEffect(() => {
    if (isEdit || !isBuilding || customCategoryLabel) return;
    if (activeCategory !== "BUILDING_BILLS") return;
    const guessed = guessBillTagFromTitle(debouncedTitle);
    if (guessed) setBillTag(guessed);
  }, [
    activeCategory,
    customCategoryLabel,
    debouncedTitle,
    isBuilding,
    isEdit,
  ]);

  useEffect(() => {
    setManualCategory(null);
    setCustomCategoryLabel(null);
    setBillTag(null);
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

  const percentParts = useMemo(() => {
    if (!totalAmount || selectedIndexes.length === 0) {
      return [] as { userId: string; amount: number; percent: number }[];
    }
    try {
      const selected = selectedIndexes.map((i) => {
        const row = splits![i]!;
        return {
          userId: row.userId,
          percent: Math.trunc(row.percent ?? 0),
        };
      });
      const sum = selected.reduce((acc, s) => acc + s.percent, 0);
      if (sum !== 100) return [];
      return calculatePercentageSplits(asMoney(totalAmount), selected).map(
        (row) => ({
          userId: row.userId,
          amount: row.amount,
          percent: row.percent,
        }),
      );
    } catch {
      return [];
    }
  }, [totalAmount, selectedIndexes, splits]);

  const amountByUserId = useMemo(() => {
    const source = splitMode === "PERCENT" ? percentParts : weightedParts;
    return Object.fromEntries(
      source.map((p) => [p.userId, p.amount]),
    ) as Record<string, number>;
  }, [splitMode, percentParts, weightedParts]);

  useEffect(() => {
    if (splitMode !== "EQUAL" && splitMode !== "PERCENT") return;
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

  const percentAllocated = useMemo(() => {
    return (splits ?? [])
      .filter((s) => s.selected)
      .reduce(
        (acc, s) => acc + (Number.isFinite(s.percent) ? s.percent : 0),
        0,
      );
  }, [splits]);

  const remaining = totalAmount - exactAllocated;
  const percentRemaining = 100 - percentAllocated;
  const selectedCount = selectedIndexes.length;
  const totalShareWeight = useMemo(
    () =>
      (splits ?? [])
        .filter((s) => s.selected)
        .reduce((acc, s) => acc + clampShare(s.share ?? DEFAULT_SHARE), 0),
    [splits],
  );

  function applyEqualPercentsToSelected(
    rows: ExpenseFormValues["splits"],
  ): ExpenseFormValues["splits"] {
    const indexes = rows
      .map((row, i) => (row.selected ? i : -1))
      .filter((i) => i >= 0);
    const percents = distributeEqualPercents(indexes.length);
    return rows.map((row, index) => {
      const pos = indexes.indexOf(index);
      if (pos < 0) return { ...row, percent: 0, amount: 0 };
      return { ...row, percent: percents[pos] ?? 0 };
    });
  }

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
        base.categoryLabel =
          isBuilding && manualCategory === "BUILDING_BILLS" ? billTag : null;
      } else {
        base.category = activeCategory;
        base.categoryLabel =
          isBuilding && activeCategory === "BUILDING_BILLS" ? billTag : null;
      }
      if (
        isBuilding &&
        base.category === "BUILDING_BILLS" &&
        billTag &&
        !(DEFAULT_BILL_TAGS_SET.has(billTag))
      ) {
        rememberCustomBillTag(spaceId, billTag);
      }
    } else if (isBuilding) {
      const cat = values.category ?? "OTHER";
      if (cat === "BUILDING_BILLS") {
        base.categoryLabel = billTag;
        if (billTag && !DEFAULT_BILL_TAGS_SET.has(billTag)) {
          rememberCustomBillTag(spaceId, billTag);
        }
      } else {
        base.categoryLabel = values.categoryLabel ?? null;
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
              percent: 100,
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
                percent: 100,
              },
            ],
            includedUnitIds:
              scopeMode === "HYBRID" ? includedUnitIds : null,
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
                  percent: 100,
                },
              ],
            }
          : isPartnerEqual
            ? {
                ...base,
                paidById: values.paidById || currentUserId,
                splitMode: "EQUAL",
                transactionType: "EXPENSE",
                date: values.date || todayIsoDateTehran(),
                splits: (() => {
                  const percents = distributeEqualPercents(members.length);
                  return members.map((m, i) => ({
                    userId: m.userId,
                    amount: 0,
                    selected: true,
                    share: clampShare(m.defaultShare ?? DEFAULT_SHARE),
                    percent: percents[i] ?? 0,
                  }));
                })(),
              }
            : {
                ...base,
                transactionType: showIncomeExpense
                  ? (values.transactionType ?? "EXPENSE")
                  : "EXPENSE",
                date:
                  isBuilding || changeDate || isEdit
                    ? values.date || todayIsoDateTehran()
                    : todayIsoDateTehran(),
              };

    startTransition(async () => {
      const result = isEdit
        ? await updateExpense(initialExpense!.expenseId, payload)
        : await addExpense(payload);
      if (!result.ok) {
        showToast(result.error || "خطا در ثبت اطلاعات", "error");
        return;
      }
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
        setBillTag(null);
        setDebouncedTitle("");
        setUnitIdsTouched(false);
        setIncludedUnitIds(buildingUnits.map((u) => u.id));
        setUnitPickerOpen(false);
      }
      // Close only after a successful server write.
      onSuccess?.();
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
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          if (errors.splits) setSplitsOpen(true);
          const topFields = [
            "title",
            "totalAmount",
            "paidById",
            "date",
            "category",
            "transactionType",
            "splitMode",
          ] as const;
          for (const name of topFields) {
            if (errors[name]) {
              form.setFocus(name);
              return;
            }
          }
          const splitErrors = errors.splits;
          if (Array.isArray(splitErrors)) {
            for (let i = 0; i < splitErrors.length; i++) {
              const row = splitErrors[i];
              if (!row || typeof row !== "object") continue;
              for (const key of ["amount", "percent", "share", "selected"] as const) {
                if (key in row && row[key]) {
                  form.setFocus(`splits.${i}.${key}`);
                  return;
                }
              }
            }
          }
        })}
        className={cn(
          useDenseChrome
            ? "flex min-h-0 flex-1 flex-col gap-0"
            : "flex flex-col gap-3",
        )}
      >
        <div
          className={cn(
            useDenseChrome &&
              "min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pb-2",
            isLedgerDense && "space-y-2",
            !useDenseChrome && "contents",
          )}
        >
        {showIncomeExpense ? (
          <FormField
            control={form.control}
            name="transactionType"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <div
                  className="grid grid-cols-2 gap-1 rounded-2xl border border-border/55 bg-card p-1 shadow-sm"
                  role="radiogroup"
                  aria-label="نوع تراکنش"
                >
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
                        role="radio"
                        aria-checked={selected}
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
                          "flex flex-col items-center rounded-xl px-2 py-2.5 transition-[color,background-color,box-shadow,transform] duration-150",
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

        <div
          className={cn(
            "space-y-3 rounded-2xl border border-border/55 bg-card p-3.5",
            isBuilding && "space-y-2.5 p-3",
            isLedgerDense &&
              "space-y-2.5 rounded-none border-0 bg-transparent p-0 shadow-none",
          )}
        >
          {(isBuilding && !isEdit) || isLedgerDense ? (
            <div className={cn("space-y-1.5", isLedgerDense && "space-y-1")}>
              {isBuilding ? (
                <p className="text-label text-muted-foreground">دسته‌بندی</p>
              ) : null}
              <div
                role="radiogroup"
                aria-label={
                  isBuilding ? "دسته‌بندی هزینه مشاع" : "دسته‌بندی هزینه"
                }
                className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 scrollbar-none"
              >
                {categoryOptions.map((code) => {
                  const active =
                    !customCategoryLabel && activeCategory === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setCustomCategoryLabel(null);
                        setManualCategory(code);
                        if (code !== "BUILDING_BILLS") setBillTag(null);
                        form.setValue("category", code, {
                          shouldDirty: true,
                        });
                        form.setValue(
                          "categoryLabel",
                          code === "BUILDING_BILLS" ? billTag : null,
                          { shouldDirty: true },
                        );
                      }}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full font-semibold transition-colors",
                        isLedgerDense
                          ? "h-8 px-2.5 text-[11px]"
                          : "h-9 px-3 text-caption",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <span aria-hidden>{CATEGORY_EMOJI[code]}</span>
                      {categoryLabelFor(code)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {isLedgerDense ? (
            <div className="grid grid-cols-[1.35fr_1fr] gap-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="min-w-0 space-y-1">
                    <FormLabel className="text-[11px] text-muted-foreground">
                      عنوان
                    </FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="off"
                        placeholder="مثلاً ناهار…"
                        className="h-11 rounded-xl border-border/60 bg-card"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => {
                  const live = asAmount(field.value);
                  return (
                    <FormItem className="min-w-0 space-y-1">
                      <FormLabel className="text-[11px] text-muted-foreground">
                        مبلغ
                      </FormLabel>
                      <FormControl>
                        <MoneyInput
                          id="expense-amount"
                          name={field.name}
                          value={live}
                          onValueChange={(n) => field.onChange(n)}
                          onBlur={field.onBlur}
                          placeholder="۰"
                          className="h-11 rounded-xl border-border/60 bg-card text-base font-bold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          ) : (
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
                    autoComplete="off"
                    placeholder={
                      isBuilding
                        ? "مثلاً قبض برق مشاع یا تعمیر آسانسور…"
                        : showIncomeExpense && transactionType === "INCOME"
                          ? "مثلاً حقوق فروردین…"
                          : "مثلاً ناهار…"
                    }
                    className="h-11 rounded-xl border-border/70 bg-sheet-muted"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          )}

          {showSmartChip ? (
            <>
              <button
                type="button"
                onClick={() => setCategoryDrawerOpen(true)}
                aria-label={
                  isManualPick
                    ? `دسته‌بندی: ${chipLabel}. تغییر دسته`
                    : `پیشنهاد دسته: ${chipLabel}. تغییر دسته`
                }
                className={cn(
                  "inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-semibold transition-[color,background-color,box-shadow,transform] duration-150",
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
                    setBillTag(null);
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
                  if (next.category !== "BUILDING_BILLS") setBillTag(null);
                  form.setValue(
                    "categoryLabel",
                    next.category === "BUILDING_BILLS" ? billTag : null,
                    { shouldDirty: true },
                  );
                  form.setValue("category", next.category, {
                    shouldDirty: true,
                  });
                }}
              />
            </>
          ) : null}

          {isBuilding &&
          !isEdit &&
          !customCategoryLabel &&
          activeCategory === "BUILDING_BILLS" ? (
            <BuildingBillTags
              spaceId={spaceId}
              value={billTag}
              onChange={(tag) => {
                setBillTag(tag);
                setManualCategory("BUILDING_BILLS");
                form.setValue("category", "BUILDING_BILLS", {
                  shouldDirty: true,
                });
                form.setValue("categoryLabel", tag, { shouldDirty: true });
              }}
            />
          ) : null}

          {isBuilding && buildingUnits.length > 0 && scopeMode !== "ALL" ? (
            <div className="rounded-xl border border-border/50 bg-sheet-muted/40">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start"
                onClick={() => setUnitPickerOpen((o) => !o)}
              >
                <span className="text-caption font-semibold text-foreground">
                  واحدهای مشمول
                </span>
                <span className="text-micro text-muted-foreground">
                  {scopeSummaryFa({
                    mode: scopeMode,
                    includedCount: displayIncludedCount,
                    totalActive: buildingUnits.length,
                  })}
                  {scopeMode === "FIXED" ? " · ثابت" : ""}
                  <span className="ms-1 opacity-60">
                    {unitPickerOpen ? "▴" : "▾"}
                  </span>
                </span>
              </button>
              {unitPickerOpen ? (
                <div className="space-y-2 border-t border-border/40 px-3 py-2.5">
                  {scopeMode === "FIXED" ? (
                    <p className="text-micro text-muted-foreground">
                      از تنظیمات ساختمان ثابت شده؛ در این هزینه قابل تغییر نیست.
                    </p>
                  ) : (
                    <p className="text-micro text-muted-foreground">
                      پیش‌فرض همه واحدهاست. فقط واحدهایی را که مشمول نیستند
                      بردارید.
                    </p>
                  )}
                  <ul className="grid grid-cols-2 gap-1.5">
                    {buildingUnits.map((unit) => {
                      const checked =
                        scopeMode === "FIXED"
                          ? fixedIncludedIds.includes(unit.id)
                          : includedUnitIds.includes(unit.id);
                      const locked = scopeMode === "FIXED";
                      return (
                        <li key={unit.id}>
                          <label
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-caption",
                              checked
                                ? "border-primary/35 bg-primary/8"
                                : "border-border/45 bg-card",
                              locked && "opacity-80",
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={locked || pending}
                              onCheckedChange={(v) => {
                                if (locked) return;
                                setUnitIdsTouched(true);
                                const on = v === true;
                                setIncludedUnitIds((prev) => {
                                  if (on) {
                                    return prev.includes(unit.id)
                                      ? prev
                                      : [...prev, unit.id];
                                  }
                                  return prev.filter((id) => id !== unit.id);
                                });
                              }}
                            />
                            <span className="truncate font-medium">
                              واحد {unit.name}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {isEdit && !isLedgerDense ? (
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
                    onValueChange={(next) => {
                      field.onChange(next);
                      if (next !== "BUILDING_BILLS") {
                        setBillTag(null);
                        form.setValue("categoryLabel", null, {
                          shouldDirty: true,
                        });
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl border-border/70 bg-sheet-muted">
                        <SelectValue placeholder="دسته…" />
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
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    با عوض کردن، دسته قفل می‌شود.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          {isBuilding &&
          isEdit &&
          watchedCategory === "BUILDING_BILLS" ? (
            <BuildingBillTags
              spaceId={spaceId}
              value={billTag}
              onChange={(tag) => {
                setBillTag(tag);
                form.setValue("categoryLabel", tag, { shouldDirty: true });
              }}
            />
          ) : null}

          {!isLedgerDense ? (
          <FormField
            control={form.control}
            name="totalAmount"
            render={({ field }) => {
              const live = asAmount(field.value);
              return (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-label text-muted-foreground">
                    مبلغ ({currencyLabel(_currency)})
                  </FormLabel>
                  <FormControl>
                    <MoneyInput
                      id="expense-amount"
                      name={field.name}
                      value={live}
                      onValueChange={(n) => field.onChange(n)}
                      onBlur={field.onBlur}
                      placeholder="۰"
                      className="h-12 rounded-xl border-border/70 bg-sheet-muted text-lg font-bold"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          ) : null}

          {isLedgerDense ? (
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="min-w-0 space-y-1">
                    <FormLabel className="text-[11px] text-muted-foreground">
                      تاریخ
                    </FormLabel>
                    <FormControl>
                      <JalaliDatePicker
                        id="expense-date"
                        value={field.value}
                        onChange={field.onChange}
                        variant="compact"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {showPaidByPicker ? (
                <FormField
                  control={form.control}
                  name="paidById"
                  render={({ field }) => (
                    <FormItem className="min-w-0 space-y-1">
                      <FormLabel className="text-[11px] text-muted-foreground">
                        پرداخت‌کننده
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border/60 bg-card">
                            <SelectValue placeholder="انتخاب…" />
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
            </div>
          ) : useDenseChrome ? (
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-label text-muted-foreground">
                    تاریخ
                  </FormLabel>
                  <FormControl>
                    <JalaliDatePicker
                      id="expense-date"
                      value={field.value}
                      onChange={field.onChange}
                      variant="compact"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : !isPartnerEqual ? (
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

          {showPaidByPicker && !isLedgerDense ? (
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
                      <SelectValue placeholder="انتخاب کنید…" />
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
              <FormItem className={cn("space-y-1.5", isLedgerDense && "space-y-1")}>
                <FormLabel
                  className={cn(
                    "text-muted-foreground",
                    isLedgerDense ? "text-[11px]" : "text-label",
                  )}
                >
                  تسهیم
                </FormLabel>
                <div
                  className={cn(
                    "grid grid-cols-3 gap-1 rounded-xl bg-muted/80 p-1",
                    isLedgerDense && "rounded-lg",
                  )}
                  role="radiogroup"
                  aria-label="روش تسهیم"
                >
                  {(
                    [
                      { value: "EQUAL", label: "مساوی" },
                      { value: "EXACT", label: "دقیق" },
                      { value: "PERCENT", label: "درصدی" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={field.value === opt.value}
                      onClick={() => {
                        field.onChange(opt.value);
                        if (opt.value === "PERCENT") {
                          const current = form.getValues("splits");
                          form.setValue(
                            "splits",
                            applyEqualPercentsToSelected(current),
                            { shouldValidate: true },
                          );
                        }
                      }}
                      className={cn(
                        "rounded-lg font-semibold transition-colors duration-150",
                        isLedgerDense ? "h-8 text-[11px]" : "h-9 text-body-sm",
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
            <p className="px-0.5 text-[11px] leading-snug text-muted-foreground">
              تسهیم مساوی ۵۰–۵۰ با {partnerOtherLabel}
            </p>
          ) : isBuilding ? null : isHouseholdLedger ? (
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
        <div
          className={cn(
            "rounded-2xl border border-border/55 bg-card p-3.5",
            isLedgerDense && "rounded-xl p-2.5",
          )}
        >
          <button
            type="button"
            onClick={() => setSplitsOpen((o) => !o)}
            className="flex w-full items-center gap-2 text-start active:opacity-80"
            aria-expanded={splitsOpen}
            aria-controls="expense-splits-panel"
          >
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-semibold text-foreground",
                  isLedgerDense ? "text-caption" : "text-body-sm",
                )}
              >
                چه کسانی
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {selectedCount.toLocaleString("fa-IR")} نفر
                {splitMode === "EQUAL" &&
                totalShareWeight > 0 &&
                // Half-units: only show «سهم» when weights differ (not 2×people).
                totalShareWeight !== selectedCount * 2
                  ? ` · جمع ضریب ${formatShareLabel(totalShareWeight)}`
                  : ""}
                {splitMode === "PERCENT"
                  ? ` · ${new Intl.NumberFormat("fa-IR").format(percentAllocated)}٪`
                  : ""}
                {splitMode === "EQUAL" && !splitsOpen
                  ? " · مساوی"
                  : !splitsOpen
                    ? " · ویرایش"
                    : ""}
              </p>
            </div>
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-transform duration-200 ease-out",
                isLedgerDense ? "size-7" : "size-8",
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

                                const mode = form.getValues("splitMode");
                                const current = form.getValues("splits");
                                const nextRows = current.map((row, i) =>
                                  i === index
                                    ? { ...row, selected: nextSelected }
                                    : row,
                                );
                                if (mode === "EXACT") {
                                  const total = asAmount(
                                    form.getValues("totalAmount"),
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
                                  return;
                                }
                                if (mode === "PERCENT") {
                                  form.setValue(
                                    "splits",
                                    applyEqualPercentsToSelected(nextRows),
                                    { shouldValidate: true },
                                  );
                                }
                              }}
                              className="size-5 rounded-md data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                            />
                          </FormControl>
                          <UserAvatar
                            phone={member.phone}
                            name={member.name}
                            size={28}
                            className={cn(
                              "size-7 bg-secondary",
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

                    {(splitMode === "EQUAL" || splitMode === "PERCENT") &&
                    selected ? (
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

                  {splitMode === "PERCENT" && selected ? (
                    <FormField
                      control={form.control}
                      name={`splits.${index}.percent`}
                      render={({ field }) => (
                        <FormItem className="mt-2 ps-8">
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="numeric"
                                autoComplete="off"
                                min={0}
                                max={100}
                                step={1}
                                className="h-10 w-24 rounded-xl border-border/70 bg-sheet-muted text-sm font-semibold"
                                placeholder="٪…"
                                aria-label={`درصد سهم ${personLabel(member, currentUserId)}`}
                                name={field.name}
                                ref={field.ref}
                                onBlur={field.onBlur}
                                value={field.value || ""}
                                onChange={(e) => {
                                  const n = parseAmountInput(e.target.value);
                                  field.onChange(Math.min(100, Math.max(0, n)));
                                }}
                              />
                            </FormControl>
                            <span className="shrink-0 text-caption text-muted-foreground">
                              ٪
                            </span>
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
                                  autoComplete="off"
                                  min={0}
                                  step={1}
                                  className="h-10 rounded-xl border-border/70 bg-sheet-muted text-sm font-semibold"
                                  placeholder="سهم…"
                                  aria-label={`مبلغ سهم ${personLabel(member, currentUserId)}`}
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

              {splitMode === "PERCENT" ? (
                <div
                  className={cn(
                    "mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-body-sm",
                    percentRemaining === 0
                      ? "bg-success-soft text-success"
                      : percentRemaining > 0
                        ? "bg-muted text-muted-foreground"
                        : "bg-destructive-soft text-destructive",
                  )}
                >
                  <span>باقی‌مانده درصد</span>
                  <span className="font-bold tabular-nums">
                    {new Intl.NumberFormat("fa-IR").format(percentRemaining)}٪
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        ) : null}

        {form.formState.errors.root?.message ? (
          <p
            className="text-sm text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {form.formState.errors.root.message}
          </p>
        ) : null}
        {form.formState.errors.splits?.message ? (
          <p
            className="text-sm text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {form.formState.errors.splits.message}
          </p>
        ) : null}
        {typeof form.formState.errors.splits?.root?.message === "string" ? (
          <p
            className="text-sm text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {form.formState.errors.splits.root.message}
          </p>
        ) : null}
        </div>

        <div
          className={cn(
            useDenseChrome
              ? "shrink-0 space-y-1.5 border-t border-border/45 bg-card px-0 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2.5"
              : "pt-1",
          )}
        >
          {isBuilding ? (
            <p className="text-center text-micro text-muted-foreground">
              کسر از صندوق ساختمان
            </p>
          ) : null}
          <Button
            type="submit"
            className={cn(
              "w-full rounded-xl font-semibold text-primary-foreground",
              isLedgerDense ? "h-11 text-caption" : "h-11 text-body-sm",
            )}
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
