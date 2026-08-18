"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteExpense,
  getExpenseForEdit,
  loadMoreSpaceExpenses,
  type ExpenseForEdit,
} from "@/app/actions/expense";
import type {
  ExpenseInitialValues,
  ExpenseMember,
} from "@/components/ExpenseForm";
import { CategoryIcon } from "@/components/expenses/category-icon";
import { ReportExportButtons } from "@/components/spaces/report-export-buttons";

const ExpenseForm = dynamic(
  () =>
    import("@/components/ExpenseForm").then((m) => m.ExpenseForm),
  {
    loading: () => (
      <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
    ),
  },
);

const ExpenseEditDesktop = dynamic(
  () =>
    import("@/components/expenses/expense-edit-desktop").then(
      (m) => m.ExpenseEditDesktop,
    ),
  { ssr: false },
);

const ExpenseEditMobile = dynamic(
  () =>
    import("@/components/expenses/expense-edit-mobile").then(
      (m) => m.ExpenseEditMobile,
    ),
  { ssr: false },
);
import {
  InviteMembersButton,
  type InviteMemberRow,
} from "@/components/spaces/invite-members-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExpenseCategory } from "@/lib/categorizer";
import { formatCategoryWithTag } from "@/lib/building-bill-tags";
import { CATEGORY_LABELS } from "@/lib/categorizer";
import { useIsDesktop } from "@/components/hooks/use-is-desktop";
import { EmptyState } from "@/components/ui/empty-state";
import { useUnsavedCloseGuard } from "@/components/ui/unsaved-close-guard";
import { PersonalEmptyState } from "@/components/spaces/personal-empty-state";
import {
  formatJalaliYear,
  monthLabelFa,
  tehranCivilMonth,
  tehranCivilYear,
} from "@/lib/building";
import {
  expenseDayKey,
  formatDateFa,
  formatDateFaShort,
  payerName,
  type SpaceCurrency,
} from "@/lib/format";
import { formatFaDigits } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { useUiStore } from "@/lib/stores/ui-store";
import { getTemplate } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";
import type { SpaceRole, SpaceType } from "@/types";

function formatCountFa(n: number): string {
  return formatFaDigits(n);
}

export type ExpenseListItem = {
  id: string;
  title: string;
  totalAmount: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  paidById: string;
  category: ExpenseCategory;
  categoryLabel?: string | null;
  transactionType?: "EXPENSE" | "INCOME";
  paidBy: { name: string | null; phone: string; isVirtual?: boolean };
  createdBy: {
    id: string;
    name: string | null;
    phone: string;
    isVirtual?: boolean;
  } | null;
  updatedBy: {
    id: string;
    name: string | null;
    phone: string;
    isVirtual?: boolean;
  } | null;
  splitMode?: "EQUAL" | "EXACT" | "PERCENT";
  /** Viewer's owed share (list paint when viewerUserId was requested). */
  myOwedAmount?: number;
  /** Present only after edit fetch; list paint omits full splits. */
  splits?: {
    userId: string;
    owedAmount: number;
    share: number;
    percent?: number | null;
  }[];
};

type ExpenseListProps = {
  spaceId: string;
  spaceName?: string;
  currentUserId: string;
  currentUserRole?: SpaceRole;
  members: ExpenseMember[];
  inviteMembers?: InviteMemberRow[];
  expenses: ExpenseListItem[];
  expensesHasMore?: boolean;
  currency?: SpaceCurrency;
  spaceType?: SpaceType;
  canMutate?: boolean;
  /** Jalali year filter (BUILDING) — kept for load-more pagination. */
  expenseYear?: number;
  /** Trip/partner: Excel·PDF in the list header (not beside tabs). */
  showExport?: boolean;
};

function normalizeExpenseDates(item: ExpenseListItem): ExpenseListItem {
  return {
    ...item,
    date: item.date instanceof Date ? item.date : new Date(item.date),
    createdAt:
      item.createdAt instanceof Date
        ? item.createdAt
        : new Date(item.createdAt),
    updatedAt:
      item.updatedAt instanceof Date
        ? item.updatedAt
        : new Date(item.updatedAt),
  };
}

function toInitial(expense: ExpenseForEdit): ExpenseInitialValues {
  return {
    expenseId: expense.expenseId,
    title: expense.title,
    totalAmount: expense.totalAmount,
    paidById: expense.paidById,
    date: expense.date,
    category: expense.category,
    categoryLabel: expense.categoryLabel ?? null,
    transactionType: expense.transactionType ?? "EXPENSE",
    splitMode: expense.splitMode,
    splitAmounts: expense.splitAmounts,
    splitShares: expense.splitShares,
    splitPercents: expense.splitPercents,
    includedUnitIds: expense.includedUnitIds,
  };
}

function expenseAuditLine(
  expense: ExpenseListItem,
  currentUserId: string,
): string | null {
  const createdMs = new Date(expense.createdAt).getTime();
  const updatedMs = new Date(expense.updatedAt).getTime();
  const wasEdited =
    updatedMs - createdMs > 2000 ||
    Boolean(
      expense.updatedBy &&
        expense.createdBy &&
        expense.updatedBy.id !== expense.createdBy.id,
    );

  if (wasEdited && expense.updatedBy) {
    const name = payerName(expense.updatedBy, {
      isCurrentUser: expense.updatedBy.id === currentUserId,
    });
    return `ویرایش توسط ${name} · ${formatDateFa(expense.updatedAt)}`;
  }

  if (expense.createdBy) {
    const name = payerName(expense.createdBy, {
      isCurrentUser: expense.createdBy.id === currentUserId,
    });
    return `ثبت توسط ${name}`;
  }

  return null;
}

function groupExpensesByDay(expenses: ExpenseListItem[]) {
  const groups: { key: string; label: string; items: ExpenseListItem[] }[] =
    [];
  const indexByKey = new Map<string, number>();

  for (const expense of expenses) {
    const key = expenseDayKey(expense.date);
    const existing = indexByKey.get(key);
    if (existing == null) {
      indexByKey.set(key, groups.length);
      groups.push({
        key,
        label: formatDateFa(expense.date),
        items: [expense],
      });
    } else {
      groups[existing]!.items.push(expense);
    }
  }

  return groups;
}

type MonthGroup = {
  key: string;
  year: number;
  month: number;
  label: string;
  items: ExpenseListItem[];
  expenseTotal: number;
  expenseCount: number;
};

/** Group BUILDING expenses by Jalali month (newest first — list order preserved). */
function groupExpensesByMonth(expenses: ExpenseListItem[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  const indexByKey = new Map<string, number>();

  for (const expense of expenses) {
    const year = tehranCivilYear(expense.date);
    const month = tehranCivilMonth(expense.date);
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const existing = indexByKey.get(key);
    const isIncome = expense.transactionType === "INCOME";
    if (existing == null) {
      indexByKey.set(key, groups.length);
      groups.push({
        key,
        year,
        month,
        label: `${monthLabelFa(month)} ${formatJalaliYear(year)}`,
        items: [expense],
        expenseTotal: isIncome ? 0 : expense.totalAmount,
        expenseCount: isIncome ? 0 : 1,
      });
    } else {
      const g = groups[existing]!;
      g.items.push(expense);
      if (!isIncome) {
        g.expenseTotal += expense.totalAmount;
        g.expenseCount += 1;
      }
    }
  }

  return groups;
}

function categoryFilterLabel(expense: ExpenseListItem): string {
  if (
    expense.category === "OTHER" ||
    expense.category === "OTHER_INCOME"
  ) {
    return expense.categoryLabel?.trim() || CATEGORY_LABELS[expense.category];
  }
  return CATEGORY_LABELS[expense.category];
}

function EditSheet({
  open,
  onOpenChange,
  expense,
  spaceId,
  currentUserId,
  members,
  currency,
  spaceType = "TRIP",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseForEdit | null;
  spaceId: string;
  currentUserId: string;
  members: ExpenseMember[];
  currency: SpaceCurrency;
  spaceType?: SpaceType;
}) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingDelete, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [formBlocked, setFormBlocked] = useState(false);
  const { requestOpenChange, discardConfirm } =
    useUnsavedCloseGuard(formBlocked);

  const denseEdit = spaceType === "TRIP" || spaceType === "PARTNER";
  const editDescription =
    spaceType === "PARTNER"
      ? "عنوان، مبلغ یا پرداخت‌کننده"
      : denseEdit
        ? "عنوان، مبلغ، پرداخت‌کننده یا تسهیم"
        : "مبلغ، پرداخت‌کننده یا تسهیم را عوض کن";

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      setDeleteError(null);
      setFormBlocked(false);
    }
  }, [open]);

  function handleOpenChange(next: boolean) {
    requestOpenChange(next, onOpenChange);
  }

  if (!expense) return null;

  function onDelete() {
    if (!expense) return;
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteExpense(expense.expenseId, spaceId);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  const deleteBlock = (
    <div
      className={cn(
        denseEdit
          ? "pt-1"
          : "rounded-2xl border border-destructive/20 bg-destructive-soft/40 p-3",
      )}
    >
      {!confirmDelete ? (
        <Button
          type="button"
          variant={denseEdit ? "ghost" : "outline"}
          className={cn(
            denseEdit
              ? "h-9 w-full rounded-xl text-caption font-medium text-destructive hover:bg-destructive/8 hover:text-destructive"
              : "h-11 w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10",
          )}
          onClick={() => setConfirmDelete(true)}
        >
          حذف هزینه
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-center text-[11px] text-destructive">
            {spaceType === "PARTNER"
              ? "این هزینه برای همیشه حذف می‌شود."
              : "مطمئنی؟ این هزینه و سهم‌ها برای همیشه حذف می‌شوند."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl text-caption"
              onClick={() => setConfirmDelete(false)}
              disabled={pendingDelete}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10 rounded-xl text-caption"
              onClick={onDelete}
              disabled={pendingDelete}
            >
              {pendingDelete ? "در حال حذف…" : "بله، حذف شود"}
            </Button>
          </div>
        </div>
      )}
      {deleteError ? (
        <p
          className="mt-2 text-center text-[11px] text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {deleteError}
        </p>
      ) : null}
    </div>
  );

  const form = (
    <div
      className={cn(
        denseEdit
          ? "flex min-h-0 flex-1 flex-col gap-0"
          : "space-y-4",
      )}
    >
      <ExpenseForm
        key={expense.expenseId}
        spaceId={spaceId}
        currentUserId={currentUserId}
        members={members}
        currency={currency}
        spaceType={spaceType}
        initialExpense={toInitial(expense)}
        onDirtyChange={setFormBlocked}
        onSuccess={() => {
          onOpenChange(false);
        }}
      />
      {deleteBlock}
    </div>
  );

  if (isDesktop === null) {
    return null;
  }

  if (isDesktop) {
    return (
      <>
        <ExpenseEditDesktop
          open={open}
          onOpenChange={handleOpenChange}
          description={editDescription}
          denseEdit={denseEdit}
        >
          {form}
        </ExpenseEditDesktop>
        {discardConfirm}
      </>
    );
  }

  return (
    <>
      <ExpenseEditMobile
        open={open}
        onOpenChange={handleOpenChange}
        description={editDescription}
        denseEdit={denseEdit}
      >
        {form}
      </ExpenseEditMobile>
      {discardConfirm}
    </>
  );
}

export function ExpenseList({
  spaceId,
  spaceName = "فضا",
  currentUserId,
  currentUserRole = "EDITOR",
  members,
  inviteMembers,
  expenses: expensesProp,
  expensesHasMore: expensesHasMoreProp = false,
  currency = "TOMAN",
  spaceType = "TRIP",
  canMutate = true,
  expenseYear,
  showExport = false,
}: ExpenseListProps) {
  const [editing, setEditing] = useState<ExpenseForEdit | null>(null);
  const [items, setItems] = useState(() =>
    expensesProp.map(normalizeExpenseDates),
  );
  const [hasMore, setHasMore] = useState(expensesHasMoreProp);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editLoadError, setEditLoadError] = useState<string | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  /** `all` | `mine` | other member userId (partner). */
  const [payerFilter, setPayerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [catsExpanded, setCatsExpanded] = useState(false);
  const [pendingMore, startMoreTransition] = useTransition();
  const [pendingEdit, startEditTransition] = useTransition();
  const setExpenseFormOpen = useUiStore((s) => s.setExpenseFormOpen);
  const isOwner = currentUserRole === "OWNER";
  const template = getTemplate(spaceType);
  const features = template.features;
  const isBuilding = features.buildingCharges;
  /** Trip / partner shared-expense list (not building, not personal/family). */
  const isTripStyle = !isBuilding && !features.incomeExpense;
  const isPartner = spaceType === "PARTNER";
  const partnerMember = isPartner
    ? members.find((m) => m.userId !== currentUserId)
    : undefined;
  const partnerChipLabel = partnerMember
    ? payerName(partnerMember, { isCurrentUser: false })
    : null;

  useEffect(() => {
    setItems(expensesProp.map(normalizeExpenseDates));
    setHasMore(expensesHasMoreProp);
    setLoadError(null);
    setCategoryFilter("all");
    setPayerFilter("all");
    setSearchQuery("");
    setCatsExpanded(false);
  }, [expensesProp, expensesHasMoreProp, expenseYear]);

  function canEditExpense(expense: ExpenseListItem): boolean {
    if (!canMutate) return false;
    if (currentUserRole === "OWNER") return true;
    if (currentUserRole === "EDITOR") {
      return expense.createdBy?.id === currentUserId;
    }
    return false;
  }

  function onOpenEdit(expense: ExpenseListItem) {
    if (pendingEdit) return;
    setEditLoadError(null);
    setLoadingEditId(expense.id);
    startEditTransition(async () => {
      const result = await getExpenseForEdit(expense.id, spaceId);
      setLoadingEditId(null);
      if (!result.ok) {
        setEditLoadError(result.error);
        return;
      }
      setEditing(result.expense);
    });
  }

  function onLoadMore() {
    const last = items[items.length - 1];
    if (!last || pendingMore) return;
    setLoadError(null);
    startMoreTransition(async () => {
      const result = await loadMoreSpaceExpenses(
        spaceId,
        {
          date: last.date.toISOString(),
          id: last.id,
        },
        expenseYear != null ? { year: expenseYear } : undefined,
      );
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setItems((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        const next = result.expenses
          .map(normalizeExpenseDates)
          .filter((e) => !seen.has(e.id));
        return [...prev, ...next];
      });
      setHasMore(result.hasMore);
    });
  }

  if (items.length === 0) {
    if (features.incomeExpense) {
      return (
        <PersonalEmptyState
          canMutate={canMutate}
          household={features.householdLedger}
          inviteSlot={
            features.householdLedger &&
            canMutate &&
            isOwner &&
            members.length < 2 ? (
              <InviteMembersButton
                spaceId={spaceId}
                spaceName={spaceName}
                members={inviteMembers ?? []}
                currentUserRole={currentUserRole}
                inviteRolePicker
                spaceType={spaceType}
                maxMembers={template.maxMembers}
                trigger={
                  <button
                    type="button"
                    className={cn(
                      "flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-3",
                      "text-body-sm font-medium text-muted-foreground",
                      "transition-colors duration-150 hover:bg-muted/60 hover:text-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "touch-manipulation [-webkit-tap-highlight-color:transparent]",
                    )}
                  >
                    دعوت همسر یا عضو خانواده
                  </button>
                }
              />
            ) : undefined
          }
        />
      );
    }

    const buildingYearEmpty =
      features.buildingCharges && expenseYear != null;

    return (
      <EmptyState
        icon="expense"
        title={
          buildingYearEmpty
            ? "هزینه‌ای در این سال نیست"
            : "هنوز هزینه‌ای ثبت نشده"
        }
        description={
          buildingYearEmpty
            ? canMutate
              ? "سال را عوض کنید یا اولین هزینهٔ این سال را ثبت کنید."
              : "برای این سال هزینه‌ای ثبت نشده."
            : canMutate
              ? "با ثبت اولین هزینه، ترازهای سفر زنده می‌شوند."
              : "هنوز هزینه‌ای ثبت نشده. نقش ناظر فقط مشاهده است."
        }
        actionNode={
          canMutate ? (
            <Button
              type="button"
              className="h-12 w-full rounded-xl text-body-sm font-semibold"
              onClick={() => setExpenseFormOpen(true)}
            >
              ثبت اولین هزینه
            </Button>
          ) : undefined
        }
        secondaryAction={
          canMutate && isOwner && features.invites ? (
            <InviteMembersButton
              spaceId={spaceId}
              spaceName={spaceName}
              members={inviteMembers ?? []}
              currentUserRole={currentUserRole}
              variant="empty"
            />
          ) : undefined
        }
      />
    );
  }

  const filterChips = (() => {
    if (!isBuilding && !isTripStyle) {
      return [] as { id: string; label: string; count: number }[];
    }
    const counts = new Map<string, { label: string; count: number }>();
    for (const expense of items) {
      const id = expense.category;
      const label = categoryFilterLabel(expense);
      const prev = counts.get(id);
      if (prev) prev.count += 1;
      else counts.set(id, { label, count: 1 });
    }
    return [...counts.entries()]
      .map(([id, v]) => ({ id, label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count);
  })();

  const searchNorm = searchQuery.trim().toLowerCase();
  const visibleItems = items.filter((e) => {
    if (isTripStyle && payerFilter === "mine" && e.paidById !== currentUserId) {
      return false;
    }
    if (
      isTripStyle &&
      payerFilter !== "all" &&
      payerFilter !== "mine" &&
      e.paidById !== payerFilter
    ) {
      return false;
    }
    if (categoryFilter !== "all" && e.category !== categoryFilter) {
      return false;
    }
    if (searchNorm) {
      const hay = `${e.title} ${e.categoryLabel ?? ""}`.toLowerCase();
      if (!hay.includes(searchNorm)) return false;
    }
    return true;
  });

  const listExpenseCount = visibleItems.reduce(
    (n, e) => (e.transactionType === "INCOME" ? n : n + 1),
    0,
  );
  const primaryCats = filterChips.slice(0, 3);
  const extraCats = filterChips.slice(3);
  const showSearch = isTripStyle && items.length >= 10;

  const dayGroups = groupExpensesByDay(visibleItems);
  const monthGroups = isBuilding
    ? groupExpensesByMonth(visibleItems)
    : null;
  let rowIndex = 0;

  function renderExpenseRow(expense: ExpenseListItem) {
    const delay = Math.min(rowIndex, 8) * 40;
    rowIndex += 1;
    const isIncome = expense.transactionType === "INCOME";
    const categoryText =
      expense.category === "OTHER" || expense.category === "OTHER_INCOME"
        ? expense.categoryLabel?.trim() || CATEGORY_LABELS[expense.category]
        : formatCategoryWithTag(
            CATEGORY_LABELS[expense.category],
            expense.categoryLabel,
          );
    const audit = expenseAuditLine(expense, currentUserId);
    /** Trip list stays dense — audit only in edit sheet / building edit rows. */
    const showAudit =
      Boolean(audit) &&
      isBuilding &&
      (audit?.startsWith("ویرایش") ?? false);
    const payer = payerName(expense.paidBy, {
      isCurrentUser: expense.paidById === currentUserId,
    });
    const myShare =
      isTripStyle &&
      !isIncome &&
      expense.myOwedAmount != null &&
      expense.myOwedAmount > 0
        ? formatCurrency(expense.myOwedAmount, currency)
        : null;
    const metaLine = isBuilding
      ? isIncome
        ? `${categoryText} · درآمد`
        : categoryText
      : features.incomeExpense
        ? `${categoryText} · ${isIncome ? "درآمد" : "هزینه"}`
        : myShare
          ? `${categoryText} · ${payer} · سهم شما ${myShare}`
          : `${categoryText} · ${payer}`;

    const rowBody = (
      <>
        <div className="flex min-w-0 items-center gap-2.5">
          <CategoryIcon
            category={expense.category}
            className={isBuilding || isTripStyle ? "size-9" : undefined}
          />
          <div className="min-w-0 space-y-0.5">
            <p
              className={cn(
                "truncate text-foreground",
                isBuilding || isTripStyle
                  ? "text-caption font-semibold"
                  : "font-semibold",
              )}
            >
              {expense.title}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {metaLine}
            </p>
            {showAudit ? (
              <p className="truncate text-caption text-muted-foreground/80">
                {audit}
              </p>
            ) : null}
          </div>
        </div>
        <p
          className={cn(
            "shrink-0 text-caption font-bold tabular-nums",
            isIncome
              ? "text-success"
              : isTripStyle
                ? "text-foreground"
                : isBuilding
                  ? "rounded-lg bg-primary/10 px-2 py-0.5 text-body-sm text-primary"
                  : "rounded-lg bg-secondary/70 px-2 py-0.5 text-body-sm text-ink",
          )}
        >
          {isIncome ? "+" : ""}
          {formatCurrency(expense.totalAmount, currency)}
        </p>
      </>
    );
    const rowLoading = loadingEditId === expense.id;
    return (
      <li
        key={expense.id}
        className={cn(
          "group relative overflow-hidden transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_3.25rem]",
          isTripStyle
            ? "bg-card"
            : "rounded-2xl border bg-card hover:border-primary/25",
          !isTripStyle &&
            (isBuilding ? "border-border/50" : "border-border/70 bg-card/90"),
        )}
        style={{ animationDelay: `${delay}ms` }}
      >
        {!isTripStyle ? (
          <span
            aria-hidden
            className={cn(
              "absolute inset-y-0 inset-s-0 w-1 opacity-80",
              isIncome
                ? "bg-success"
                : "bg-linear-to-b from-primary to-highlight",
            )}
          />
        ) : null}
        {canEditExpense(expense) ? (
          <button
            type="button"
            onClick={() => onOpenEdit(expense)}
            disabled={pendingEdit}
            aria-busy={rowLoading || undefined}
            aria-label={
              rowLoading
                ? `در حال بارگذاری ${expense.title}`
                : `ویرایش ${expense.title}`
            }
            className={cn(
              "flex w-full items-center justify-between gap-3 text-start",
              isTripStyle ? "px-3 py-2.5" : "px-3.5 py-2.5",
              !isTripStyle && "ps-4",
              "transition-transform duration-150 active:scale-[0.99]",
              rowLoading && "opacity-70",
            )}
          >
            {rowBody}
          </button>
        ) : (
          <div
            className={cn(
              "flex w-full items-center justify-between gap-3 text-start",
              isTripStyle ? "px-3 py-2.5" : "px-3.5 py-2.5",
              !isTripStyle && "ps-4",
            )}
          >
            {rowBody}
          </div>
        )}
      </li>
    );
  }

  return (
    <>
      {isTripStyle ? (
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className="min-w-0 text-caption text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">
                {formatCountFa(listExpenseCount)}
              </span>
              {" هزینه"}
              {searchNorm || payerFilter !== "all" || categoryFilter !== "all"
                ? " (فیلتر)"
                : null}
            </p>
            {showExport ? (
              <ReportExportButtons spaceId={spaceId} variant="menu" />
            ) : null}
          </div>
          {showSearch ? (
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در عنوان…"
              className="h-9 rounded-xl border-border/50 bg-card text-caption"
              autoComplete="off"
              spellCheck={false}
            />
          ) : null}
          <div
            role="toolbar"
            aria-label="فیلتر هزینه"
            className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none"
          >
            <button
              type="button"
              onClick={() => {
                setPayerFilter("all");
                setCategoryFilter("all");
              }}
              className={cn(
                "h-8 shrink-0 rounded-full px-2.5 text-[11px] font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                payerFilter === "all" && categoryFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border/50 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              همه
              <span className="ms-1 tabular-nums opacity-80">
                {formatCountFa(items.length)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPayerFilter((p) => (p === "mine" ? "all" : "mine"));
                setCategoryFilter("all");
              }}
              className={cn(
                "h-8 shrink-0 rounded-full px-2.5 text-[11px] font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                payerFilter === "mine"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border/50 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {isPartner ? "من پرداخت کردم" : "من پرداختم"}
            </button>
            {isPartner && partnerMember && partnerChipLabel ? (
              <button
                type="button"
                onClick={() => {
                  setPayerFilter((p) =>
                    p === partnerMember.userId ? "all" : partnerMember.userId,
                  );
                  setCategoryFilter("all");
                }}
                className={cn(
                  "h-8 shrink-0 rounded-full px-2.5 text-[11px] font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  payerFilter === partnerMember.userId
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border/50 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                {partnerChipLabel}
              </button>
            ) : null}
            {(catsExpanded ? filterChips : primaryCats).map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  setPayerFilter("all");
                  setCategoryFilter((prev) =>
                    prev === chip.id ? "all" : chip.id,
                  );
                }}
                className={cn(
                  "h-8 shrink-0 rounded-full px-2.5 text-[11px] font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  categoryFilter === chip.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border/50 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                {chip.label}
                <span className="ms-1 tabular-nums opacity-80">
                  {formatCountFa(chip.count)}
                </span>
              </button>
            ))}
            {extraCats.length > 0 ? (
              <button
                type="button"
                onClick={() => setCatsExpanded((v) => !v)}
                className="h-8 shrink-0 rounded-full border border-border/50 bg-card px-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {catsExpanded
                  ? "کمتر"
                  : `+${formatCountFa(extraCats.length)} بیشتر`}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isBuilding && filterChips.length > 1 ? (
        <div
          role="toolbar"
          aria-label="فیلتر دسته هزینه"
          className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none"
        >
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "h-9 shrink-0 rounded-full px-3 text-caption font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              categoryFilter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border/50 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            همه
            <span className="ms-1 tabular-nums opacity-80">
              {formatCountFa(items.length)}
            </span>
          </button>
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() =>
                setCategoryFilter((prev) =>
                  prev === chip.id ? "all" : chip.id,
                )
              }
              className={cn(
                "h-9 shrink-0 rounded-full px-3 text-caption font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                categoryFilter === chip.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border/50 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {chip.label}
              <span className="ms-1 tabular-nums opacity-80">
                {formatCountFa(chip.count)}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {(isBuilding || isTripStyle) && visibleItems.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/55 px-4 py-8 text-center text-body-sm text-muted-foreground">
          با این فیلتر هزینه‌ای نیست. فیلتر را عوض کنید.
        </p>
      ) : null}

      <div
        className={cn(
          "animate-fade-up",
          isTripStyle ? "space-y-0" : "space-y-5",
          canMutate && (isTripStyle ? "pb-28" : "pb-24"),
        )}
      >
        {monthGroups
          ? monthGroups.map((month) => {
              const days = groupExpensesByDay(month.items);
              return (
                <section
                  key={month.key}
                  className="space-y-2.5"
                  aria-labelledby={`expense-month-${month.key}`}
                >
                  <div
                    className="sticky top-0 z-10 -mx-1 flex items-center justify-between gap-2 rounded-2xl border border-border/45 bg-background/95 px-3 py-2.5 shadow-sm backdrop-blur-sm supports-backdrop-filter:bg-background/85"
                  >
                    <div className="min-w-0">
                      <h2
                        id={`expense-month-${month.key}`}
                        className="truncate text-body-sm font-bold text-foreground"
                      >
                        {month.label}
                      </h2>
                      <p className="mt-0.5 text-micro text-muted-foreground">
                        {formatCountFa(month.expenseCount)} هزینه
                      </p>
                    </div>
                    <p className="shrink-0 text-body-sm font-bold tabular-nums text-primary">
                      {formatCurrency(month.expenseTotal, currency)}
                    </p>
                  </div>

                  {days.map((group) => (
                    <div key={group.key} className="space-y-1.5">
                      <div className="flex items-center gap-2 px-1">
                        <span className="rounded-md bg-muted/80 px-2 py-0.5 text-micro font-semibold text-muted-foreground">
                          {group.label}
                        </span>
                        <div
                          aria-hidden
                          className="h-px flex-1 bg-border/40"
                        />
                      </div>
                      <ul className="space-y-1.5">
                        {group.items.map((expense) =>
                          renderExpenseRow(expense),
                        )}
                      </ul>
                    </div>
                  ))}
                </section>
              );
            })
          : isTripStyle ? (
              <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
                {dayGroups.map((group, groupIndex) => (
                  <section
                    key={group.key}
                    aria-labelledby={`expense-day-${group.key}`}
                  >
                    <h2
                      id={`expense-day-${group.key}`}
                      className={cn(
                        "scroll-mt-20 bg-muted/35 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground",
                        groupIndex > 0 && "border-t border-border/40",
                      )}
                    >
                      {formatDateFaShort(group.items[0]!.date)}
                    </h2>
                    <ul className="divide-y divide-border/35">
                      {group.items.map((expense) =>
                        renderExpenseRow(expense),
                      )}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              dayGroups.map((group, groupIndex) => (
                <section
                  key={group.key}
                  className="space-y-2"
                  aria-labelledby={`expense-day-${group.key}`}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2.5 px-0.5",
                      groupIndex > 0 && "pt-1",
                    )}
                  >
                    <h2
                      id={`expense-day-${group.key}`}
                      className="shrink-0 scroll-mt-20 text-label font-semibold text-muted-foreground"
                    >
                      {group.label}
                    </h2>
                    <div
                      aria-hidden
                      className="h-px flex-1 bg-border/55"
                    />
                  </div>
                  <ul className="space-y-2">
                    {group.items.map((expense) => renderExpenseRow(expense))}
                  </ul>
                </section>
              ))
            )}
      </div>

      {editLoadError ? (
        <p
          className="mt-3 text-center text-caption text-destructive"
          role="alert"
          aria-live="polite"
        >
          {editLoadError}
        </p>
      ) : null}

      {hasMore ? (
        <div className="mt-4 space-y-2 pb-2">
          {loadError ? (
            <p
              className="text-center text-caption text-destructive"
              role="alert"
              aria-live="polite"
            >
              {loadError}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl text-body-sm font-semibold"
            disabled={pendingMore}
            onClick={onLoadMore}
          >
            {pendingMore ? "در حال بارگذاری…" : "موارد قدیمی‌تر"}
          </Button>
        </div>
      ) : null}

      {canMutate ? (
        <EditSheet
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          expense={editing}
          spaceId={spaceId}
          currentUserId={currentUserId}
          members={members}
          currency={currency}
          spaceType={spaceType}
        />
      ) : null}
    </>
  );
}
