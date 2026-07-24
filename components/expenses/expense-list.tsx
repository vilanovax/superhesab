"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteExpense } from "@/app/actions/expense";
import {
  ExpenseForm,
  type ExpenseInitialValues,
  type ExpenseMember,
} from "@/components/ExpenseForm";
import { CategoryIcon } from "@/components/expenses/category-icon";
import {
  InviteMembersButton,
  type InviteMemberRow,
} from "@/components/spaces/invite-members-button";
import { Button } from "@/components/ui/button";
import type { ExpenseCategory } from "@/lib/categorizer";
import { CATEGORY_LABELS } from "@/lib/categorizer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { PersonalEmptyState } from "@/components/spaces/personal-empty-state";
import {
  expenseDayKey,
  formatDateFa,
  payerName,
  type SpaceCurrency,
} from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { useUiStore } from "@/lib/stores/ui-store";
import { getTemplate } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";
import type { SpaceRole, SpaceType } from "@/types";

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
  splits: { userId: string; owedAmount: number; share: number }[];
};

type ExpenseListProps = {
  spaceId: string;
  spaceName?: string;
  currentUserId: string;
  currentUserRole?: SpaceRole;
  members: ExpenseMember[];
  inviteMembers?: InviteMemberRow[];
  expenses: ExpenseListItem[];
  currency?: SpaceCurrency;
  spaceType?: SpaceType;
  canMutate?: boolean;
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

function toInitial(expense: ExpenseListItem): ExpenseInitialValues {
  return {
    expenseId: expense.id,
    title: expense.title,
    totalAmount: expense.totalAmount,
    paidById: expense.paidById,
    date: expenseDayKey(expense.date),
    category: expense.category,
    transactionType: expense.transactionType ?? "EXPENSE",
    splitAmounts: Object.fromEntries(
      expense.splits.map((s) => [s.userId, s.owedAmount]),
    ),
    splitShares: Object.fromEntries(
      expense.splits.map((s) => [s.userId, s.share]),
    ),
  };
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M12.5 6.5 4 15v3.5H7.5L16 10.5M12.5 6.5l2.1-2.1a1.5 1.5 0 0 1 2.1 0l1.9 1.9a1.5 1.5 0 0 1 0 2.1L16 10.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  expense: ExpenseListItem | null;
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

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      setDeleteError(null);
    }
  }, [open]);

  if (!expense) return null;

  function onDelete() {
    if (!expense) return;
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteExpense(expense.id, spaceId);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  const form = (
    <div className="space-y-4">
      <ExpenseForm
        key={expense.id}
        spaceId={spaceId}
        currentUserId={currentUserId}
        members={members}
        currency={currency}
        spaceType={spaceType}
        initialExpense={toInitial(expense)}
        onSuccess={() => {
          onOpenChange(false);
          router.refresh();
        }}
      />

      <div className="rounded-2xl border border-destructive/20 bg-destructive-soft/40 p-3">
        {!confirmDelete ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmDelete(true)}
          >
            حذف هزینه
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-destructive">
              مطمئنی؟ این هزینه و سهم‌ها برای همیشه حذف می‌شوند.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => setConfirmDelete(false)}
                disabled={pendingDelete}
              >
                انصراف
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-11 rounded-xl"
                onClick={onDelete}
                disabled={pendingDelete}
              >
                {pendingDelete ? "در حال حذف…" : "بله، حذف شود"}
              </Button>
            </div>
          </div>
        )}
        {deleteError ? (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {deleteError}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden border-border/60 bg-background p-0 sm:max-w-md">
          <div className="surface-hero px-5 pb-4 pt-5">
            <DialogHeader className="space-y-1 text-start">
              <DialogTitle className="text-xl font-bold text-on-hero">
                ویرایش هزینه
              </DialogTitle>
              <DialogDescription className="text-sm text-on-hero/75">
                مبلغ، پرداخت‌کننده یا تسهیم را عوض کن
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto surface-sheet-canvas px-4 py-4 pb-8">
            {form}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent className="mt-0! h-[92dvh] max-h-[92dvh] gap-0 overflow-hidden border-border/50 bg-background p-0">
        <div className="surface-hero shrink-0 px-5 pb-4 pt-2">
          <DrawerHeader className="space-y-1 p-0 text-start">
            <DrawerTitle className="text-xl font-bold text-on-hero">
              ویرایش هزینه
            </DrawerTitle>
            <DrawerDescription className="text-sm text-on-hero/75">
              مبلغ، پرداخت‌کننده یا تسهیم را عوض کن
            </DrawerDescription>
          </DrawerHeader>
        </div>
        <div className="h-[calc(92dvh-5.5rem)] overflow-y-auto overscroll-contain surface-sheet-canvas px-4 py-4 pb-10">
          {form}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function ExpenseList({
  spaceId,
  spaceName = "فضا",
  currentUserId,
  currentUserRole = "EDITOR",
  members,
  inviteMembers,
  expenses,
  currency = "TOMAN",
  spaceType = "TRIP",
  canMutate = true,
}: ExpenseListProps) {
  const [editing, setEditing] = useState<ExpenseListItem | null>(null);
  const setExpenseFormOpen = useUiStore((s) => s.setExpenseFormOpen);
  const isOwner = currentUserRole === "OWNER";
  const features = getTemplate(spaceType).features;

  function canEditExpense(expense: ExpenseListItem): boolean {
    if (!canMutate) return false;
    if (currentUserRole === "OWNER") return true;
    if (currentUserRole === "EDITOR") {
      return expense.createdBy?.id === currentUserId;
    }
    return false;
  }

  if (expenses.length === 0) {
    if (features.incomeExpense) {
      return <PersonalEmptyState canMutate={canMutate} />;
    }

    return (
      <EmptyState
        icon="expense"
        title="هنوز هزینه‌ای ثبت نشده"
        description={
          canMutate
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

  const dayGroups = groupExpensesByDay(expenses);
  let rowIndex = 0;

  return (
    <>
      <div className="animate-fade-up space-y-5">
        {dayGroups.map((group, groupIndex) => (
          <section key={group.key} className="space-y-2">
            <div
              className={cn(
                "flex items-center gap-2.5 px-0.5",
                groupIndex > 0 && "pt-1",
              )}
            >
              <p className="shrink-0 text-label font-semibold text-muted-foreground">
                {group.label}
              </p>
              <div
                aria-hidden
                className="h-px flex-1 bg-border/55"
              />
            </div>

            <ul className="space-y-2">
              {group.items.map((expense) => {
                const delay = Math.min(rowIndex, 8) * 40;
                rowIndex += 1;
                const rowBody = (
                  <>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <CategoryIcon category={expense.category} />
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate font-semibold text-foreground">
                          {expense.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          <span className="text-foreground/70">
                            {expense.categoryLabel?.trim() ||
                              CATEGORY_LABELS[expense.category]}
                          </span>
                          {" · "}
                          {features.incomeExpense
                            ? expense.transactionType === "INCOME"
                              ? "درآمد"
                              : "هزینه"
                            : payerName(expense.paidBy, {
                                isCurrentUser:
                                  expense.paidById === currentUserId,
                              })}
                        </p>
                        {(() => {
                          const audit = expenseAuditLine(
                            expense,
                            currentUserId,
                          );
                          return audit ? (
                            <p className="truncate text-caption text-muted-foreground/80">
                              {audit}
                            </p>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <p
                        className={cn(
                          "rounded-lg px-2 py-0.5 text-body-sm font-bold tabular-nums",
                          expense.transactionType === "INCOME"
                            ? "bg-success-soft text-success"
                            : "bg-secondary/70 text-ink",
                        )}
                      >
                        {expense.transactionType === "INCOME" ? "+" : ""}
                        {formatCurrency(expense.totalAmount, currency)}
                      </p>
                      {canEditExpense(expense) ? (
                        <span
                          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover:bg-secondary/80 group-hover:text-primary"
                          aria-hidden
                        >
                          <PencilIcon className="size-4" />
                        </span>
                      ) : null}
                    </div>
                  </>
                );
                return (
                  <li
                    key={expense.id}
                    className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/90 transition-colors hover:border-primary/25"
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 inset-s-0 w-1 bg-linear-to-b from-primary to-highlight opacity-80"
                    />
                    {canEditExpense(expense) ? (
                      <button
                        type="button"
                        onClick={() => setEditing(expense)}
                        aria-label={`ویرایش ${expense.title}`}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-3.5 py-3 ps-4 text-start",
                          "transition-transform duration-150 active:scale-[0.99]",
                        )}
                      >
                        {rowBody}
                      </button>
                    ) : (
                      <div className="flex w-full items-center justify-between gap-3 px-3.5 py-3 ps-4 text-start">
                        {rowBody}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

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
