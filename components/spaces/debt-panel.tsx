"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  addGroupedDebtPayment,
  createDebt,
  deleteDebt,
  deleteDebtPayment,
  updateDebt,
  updateDebtPayment,
  type DebtDTO,
} from "@/app/actions/debt";
import { Button } from "@/components/ui/button";
import {
  FamilyFirstRun,
  FamilyFirstRunTile,
} from "@/components/spaces/family-first-run";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useUnsavedCloseGuard } from "@/components/ui/unsaved-close-guard";
import {
  counterpartyKey,
  daysUntilDue,
  debtTypeLabel,
  groupDebtAccounts,
  isDueSoon,
  summarizeDebtsForMonth,
  type DebtAccount,
  type DebtMonthSummary,
  type DebtTypeValue,
} from "@/lib/debts";
import type { SpaceCurrency } from "@/lib/format";
import { formatDateFa, todayIsoDateTehran } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { tehranMonthKey } from "@/lib/personal";
import { cn } from "@/lib/utils";

const JalaliDatePicker = dynamic(
  () =>
    import("@/components/ui/jalali-date-picker").then(
      (m) => m.JalaliDatePicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-11 animate-pulse rounded-xl bg-muted/40" />
    ),
  },
);

function panelTypeLabel(
  type: DebtTypeValue,
  buildingContext: boolean,
): string {
  if (type === "LENT") return "طلب";
  return buildingContext ? "بدهی" : debtTypeLabel(type);
}

type LedgerEdit =
  | { kind: "open"; debtId: string }
  | { kind: "pay"; debtId: string; paymentId: string };

type DebtPanelProps = {
  spaceId: string;
  debts: DebtDTO[];
  currency: SpaceCurrency;
  canMutate: boolean;
  /** FAMILY: shared household wording + show who registered each debt. */
  sharedHousehold?: boolean;
  /** BUILDING: unit IOUs — copy separate from monthly charges. */
  buildingContext?: boolean;
  /** BUILDING: pick unit when creating; optional free-text still works. */
  units?: { id: string; name: string; isActive?: boolean }[];
  /** Refetch deferred tab payload after create / edit / delete. */
  onMutated?: () => void | Promise<void>;
};

export function DebtPanel({
  spaceId,
  debts,
  currency,
  canMutate,
  sharedHousehold = false,
  buildingContext = false,
  units = [],
  onMutated,
}: DebtPanelProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [accountKey, setAccountKey] = useState<string | null>(null);
  const [accountMode, setAccountMode] = useState<"increase" | "pay">(
    "increase",
  );
  const [editing, setEditing] = useState<LedgerEdit | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [type, setType] = useState<DebtTypeValue>("LENT");
  const [counterparty, setCounterparty] = useState("");
  const [unitId, setUnitId] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [hasDueDate, setHasDueDate] = useState(false);

  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(todayIsoDateTehran());
  const [payNote, setPayNote] = useState("");
  const accountFormRef = useRef<HTMLFormElement>(null);

  const active = useMemo(
    () => debts.filter((d) => d.status === "ACTIVE"),
    [debts],
  );
  const settled = useMemo(
    () => debts.filter((d) => d.status === "SETTLED"),
    [debts],
  );
  const accounts = useMemo(() => groupDebtAccounts(debts), [debts]);
  const lentAccounts = useMemo(
    () => accounts.filter((a) => a.type === "LENT" && a.remaining > 0),
    [accounts],
  );
  const borrowedAccounts = useMemo(
    () => accounts.filter((a) => a.type === "BORROWED" && a.remaining > 0),
    [accounts],
  );
  const settledAccounts = useMemo(
    () => accounts.filter((a) => a.remaining <= 0),
    [accounts],
  );
  const selectedAccount = useMemo(() => {
    if (!accountKey) return null;
    return accounts.find((a) => a.key === accountKey) ?? null;
  }, [accountKey, accounts]);
  const editingSnapshot = useMemo(() => {
    if (!editing || !selectedAccount) return null;
    if (editing.kind === "open") {
      const debt = selectedAccount.debts.find((d) => d.id === editing.debtId);
      if (!debt) return null;
      return {
        kind: "open" as const,
        amount: debt.initialAmount,
        date: debt.createdAt.slice(0, 10),
        dueDate: debt.dueDate,
        note: debt.note,
        paymentCount: debt.payments.length,
      };
    }
    const debt = selectedAccount.debts.find((d) => d.id === editing.debtId);
    const payment = debt?.payments.find((p) => p.id === editing.paymentId);
    if (!debt || !payment) return null;
    return {
      kind: "pay" as const,
      amount: payment.amount,
      date: payment.date,
      dueDate: null as string | null,
      note: payment.note,
      paymentCount: 0,
    };
  }, [editing, selectedAccount]);
  const knownNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const d of debts) {
      const key = counterpartyKey(d.counterparty);
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(d.counterparty);
    }
    return names;
  }, [debts]);
  const matchingCreate = useMemo(() => {
    const key = counterpartyKey(counterparty);
    if (key.length < 2) return null;
    const pool = type === "LENT" ? lentAccounts : borrowedAccounts;
    return pool.find((a) => counterpartyKey(a.counterparty) === key) ?? null;
  }, [borrowedAccounts, counterparty, lentAccounts, type]);

  const monthSummary = useMemo(
    () => summarizeDebtsForMonth(debts, tehranMonthKey()),
    [debts],
  );
  const showMonthSummary =
    monthSummary.lentRemaining > 0 ||
    monthSummary.lentOpened > 0 ||
    monthSummary.lentReturned > 0 ||
    monthSummary.borrowedRemaining > 0 ||
    monthSummary.borrowedOpened > 0 ||
    monthSummary.borrowedPaid > 0;

  const dueSoon = useMemo(
    () =>
      active.filter((d) =>
        d.dueDate ? isDueSoon(new Date(`${d.dueDate}T12:00:00Z`)) : false,
      ),
    [active],
  );

  const activeUnits = useMemo(
    () => units.filter((u) => u.isActive !== false),
    [units],
  );

  const createDirty =
    createOpen &&
    (counterparty.trim().length > 0 ||
      Boolean(unitId) ||
      amount > 0 ||
      note.trim().length > 0 ||
      hasDueDate ||
      type !== "LENT");
  const editDirty =
    Boolean(editingSnapshot) &&
    (payAmount !== (editingSnapshot?.amount ?? 0) ||
      payDate !== (editingSnapshot?.date ?? "") ||
      payNote.trim() !== (editingSnapshot?.note ?? "").trim() ||
      (editingSnapshot?.kind === "open" &&
        (hasDueDate !== Boolean(editingSnapshot.dueDate) ||
          (hasDueDate && dueDate !== (editingSnapshot.dueDate ?? "")))));
  const payDirty = editing
    ? editDirty
    : Boolean(selectedAccount) &&
      (payAmount > 0 ||
        payNote.trim().length > 0 ||
        payDate !== todayIsoDateTehran() ||
        hasDueDate);
  const formBlocked = createDirty || payDirty || pending;
  const { requestOpenChange, discardConfirm } =
    useUnsavedCloseGuard(formBlocked);

  useEffect(() => {
    if (!formBlocked) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [formBlocked]);

  function resetCreate() {
    setType("LENT");
    setCounterparty("");
    setUnitId(null);
    setAmount(0);
    setNote("");
    setDueDate("");
    setHasDueDate(false);
    setError(null);
  }

  function selectUnit(id: string | null) {
    setUnitId(id);
    if (!id) return;
    const unit = activeUnits.find((u) => u.id === id);
    if (unit && !counterparty.trim()) {
      setCounterparty(unit.name);
    }
  }

  function resetPay() {
    setAccountKey(null);
    setPayAmount(0);
    setPayNote("");
    setPayDate(todayIsoDateTehran());
    setHasDueDate(false);
    setDueDate("");
    setAccountMode("increase");
    setEditing(null);
    setConfirmDelete(false);
    setError(null);
  }

  function clearAccountForm() {
    setPayAmount(0);
    setPayNote("");
    setPayDate(todayIsoDateTehran());
    setHasDueDate(false);
    setDueDate("");
    setAccountMode("increase");
    setEditing(null);
    setConfirmDelete(false);
    setError(null);
  }

  function openAccount(
    account: DebtAccount<DebtDTO>,
    mode: "increase" | "pay" = "increase",
  ) {
    setError(null);
    setAccountKey(account.key);
    setAccountMode(account.remaining > 0 ? mode : "increase");
    setPayAmount(0);
    setPayNote("");
    setPayDate(todayIsoDateTehran());
    setHasDueDate(false);
    setDueDate("");
    setEditing(null);
    setConfirmDelete(false);
  }

  function startLedgerEdit(next: LedgerEdit) {
    if (!selectedAccount) return;
    if (next.kind === "open") {
      const debt = selectedAccount.debts.find((d) => d.id === next.debtId);
      if (!debt) return;
      setEditing(next);
      setConfirmDelete(false);
      setError(null);
      setPayAmount(debt.initialAmount);
      setPayDate(debt.createdAt.slice(0, 10));
      setPayNote(debt.note ?? "");
      setHasDueDate(Boolean(debt.dueDate));
      setDueDate(debt.dueDate ?? "");
      accountFormRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const debt = selectedAccount.debts.find((d) => d.id === next.debtId);
    const payment = debt?.payments.find((p) => p.id === next.paymentId);
    if (!payment) return;
    setEditing(next);
    setConfirmDelete(false);
    setError(null);
    setPayAmount(payment.amount);
    setPayDate(payment.date);
    setPayNote(payment.note ?? "");
    setHasDueDate(false);
    setDueDate("");
    accountFormRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (!accountKey || pending) return;
    if (!selectedAccount) {
      resetPay();
    }
  }, [accountKey, pending, selectedAccount]);

  useEffect(() => {
    if (!editing || pending) return;
    if (!editingSnapshot) {
      clearAccountForm();
    }
  }, [editing, editingSnapshot, pending]);

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await createDebt({
        spaceId,
        type,
        counterparty,
        unitId,
        initialAmount: amount,
        note: note.trim() || null,
        dueDate: hasDueDate && dueDate ? dueDate : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await onMutated?.();
      resetCreate();
      setCreateOpen(false);
    });
  }

  function onPay(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount || pending) return;
    setError(null);
    startTransition(async () => {
      if (editing?.kind === "open") {
        const result = await updateDebt({
          spaceId,
          debtId: editing.debtId,
          initialAmount: payAmount,
          note: payNote.trim() || null,
          dueDate: hasDueDate && dueDate ? dueDate : null,
          occurredOn: payDate || undefined,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        await onMutated?.();
        clearAccountForm();
        return;
      }
      if (editing?.kind === "pay") {
        const result = await updateDebtPayment({
          spaceId,
          paymentId: editing.paymentId,
          amount: payAmount,
          date: payDate || todayIsoDateTehran(),
          note: payNote || null,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        await onMutated?.();
        clearAccountForm();
        return;
      }
      if (accountMode === "increase") {
        const linkedUnitId =
          selectedAccount.debts.find((d) => d.unitId)?.unitId ?? null;
        const result = await createDebt({
          spaceId,
          type: selectedAccount.type,
          counterparty: selectedAccount.counterparty,
          unitId: linkedUnitId,
          initialAmount: payAmount,
          note: payNote.trim() || null,
          dueDate: hasDueDate && dueDate ? dueDate : null,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        await onMutated?.();
        setPayAmount(0);
        setPayNote("");
        setHasDueDate(false);
        setDueDate("");
        return;
      }
      const result = await addGroupedDebtPayment({
        spaceId,
        type: selectedAccount.type,
        counterparty: selectedAccount.counterparty,
        amount: payAmount,
        date: payDate || todayIsoDateTehran(),
        note: payNote || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await onMutated?.();
      setPayAmount(0);
      setPayNote("");
      setPayDate(todayIsoDateTehran());
    });
  }

  function onDeleteLedgerItem() {
    if (!editing || pending) return;
    setError(null);
    startTransition(async () => {
      const result =
        editing.kind === "open"
          ? await deleteDebt({ spaceId, debtId: editing.debtId })
          : await deleteDebtPayment({
              spaceId,
              paymentId: editing.paymentId,
            });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await onMutated?.();
      clearAccountForm();
    });
  }

  return (
    <div className="space-y-4 pb-[calc(5.5rem+max(env(safe-area-inset-bottom,0px),var(--vv-bottom,0px)))]">
      {dueSoon.length > 0 ? (
        <div className="animate-fade-up rounded-2xl border border-destructive/25 bg-destructive-soft px-4 py-3">
          <p className="text-body-sm font-semibold text-destructive">
            سررسید نزدیک
          </p>
          <ul className="mt-1.5 space-y-1">
            {dueSoon.map((d) => {
              const days = daysUntilDue(
                d.dueDate ? new Date(`${d.dueDate}T12:00:00Z`) : null,
              );
              return (
                <li
                  key={d.id}
                  className="text-caption text-destructive/90"
                >
                  {debtTypeLabel(d.type)} «{d.counterparty}» —{" "}
                  {days == null
                    ? ""
                    : days < 0
                      ? `${Math.abs(days)} روز گذشته`
                      : days === 0
                        ? "امروز"
                        : `${days} روز مانده`}
                  {" · "}
                  {formatCurrency(d.remaining, currency)}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {showMonthSummary ? (
        <DebtMonthOverview
          summary={monthSummary}
          currency={currency}
          sharedHousehold={sharedHousehold}
          buildingContext={buildingContext}
        />
      ) : null}

      {active.length === 0 && settled.length === 0 ? (
        <FamilyFirstRun
          icon={<DebtMark />}
          title={
            buildingContext
              ? "طلب و بدهی واحدها"
              : "وام و قسط بیرون از خانه"
          }
          description={
            buildingContext
              ? "پیش‌پرداخت، هزینه خاص یا قرض بین ساختمان و واحد — جدا از شارژ ماهانه و هزینه مشاع."
              : "بانک، دوست یا فروشگاه — جدا از خرج ماهانه و بدون تسویه بین اعضا."
          }
        >
          {canMutate ? (
            <div className="grid grid-cols-2 gap-2">
              <FamilyFirstRunTile
                tone="success"
                label="طلب"
                hint={
                  buildingContext
                    ? "واحدی به ساختمان طلبکار است"
                    : "کسی به خانه بدهکار است"
                }
                onClick={() => {
                  resetCreate();
                  setType("LENT");
                  setCreateOpen(true);
                }}
              />
              <FamilyFirstRunTile
                tone="danger"
                label={buildingContext ? "بدهی" : "یادم‌باشه"}
                hint={
                  buildingContext
                    ? "واحدی به ساختمان بدهکار است"
                    : "یادداشت مبلغی که باید بپردازید"
                }
                onClick={() => {
                  resetCreate();
                  setType("BORROWED");
                  setCreateOpen(true);
                }}
              />
            </div>
          ) : null}
        </FamilyFirstRun>
      ) : (
        <>
          {canMutate ? (
            <Button
              type="button"
              className="h-11 w-full rounded-xl font-semibold"
              onClick={() => {
                resetCreate();
                setCreateOpen(true);
              }}
            >
              طلب / بدهی
            </Button>
          ) : null}

          {buildingContext && !showMonthSummary ? (
            <p className="text-caption text-muted-foreground">
              جدا از شارژ ماهانه و هزینه مشاع — فقط حساب‌وکتاب موردی با واحدها.
            </p>
          ) : sharedHousehold && !showMonthSummary ? (
            <p className="text-caption text-muted-foreground">
              وام و اقساط بیرون از خانواده — جدا از لجر مشترک و بدون تسویه بین
              اعضا.
            </p>
          ) : null}

          <DebtAccountList
            title={
              buildingContext
                ? "طلب از واحدها"
                : sharedHousehold
                  ? "طلب‌های خانواده"
                  : "من طلبکارم"
            }
            tone="lent"
            accounts={lentAccounts}
            currency={currency}
            typeLabel={(t) => panelTypeLabel(t, buildingContext)}
            onOpen={(account) => openAccount(account)}
          />

          <DebtAccountList
            title={
              buildingContext
                ? "بدهی واحدها"
                : sharedHousehold
                  ? "یادم‌باشه‌های خانواده"
                  : "یادم‌باشه"
            }
            tone="borrowed"
            accounts={borrowedAccounts}
            currency={currency}
            typeLabel={(t) => panelTypeLabel(t, buildingContext)}
            onOpen={(account) => openAccount(account)}
          />
        </>
      )}

      {settled.length > 0 ? (
        <div className="space-y-2">
          <button
            type="button"
            aria-expanded={showArchive}
            className="text-caption font-semibold text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setShowArchive((v) => !v)}
          >
            {showArchive ? "پنهان کردن آرشیو" : `آرشیو تسویه‌شده (${settledAccounts.length})`}
          </button>
          {showArchive ? (
            <DebtAccountList
              title="تسویه‌شده"
              tone="settled"
              accounts={settledAccounts}
              currency={currency}
              typeLabel={(t) => panelTypeLabel(t, buildingContext)}
              onOpen={(account) => openAccount(account)}
            />
          ) : null}
        </div>
      ) : null}

      <Drawer
        open={createOpen}
        onOpenChange={(open) => {
          requestOpenChange(open, (next) => {
            setCreateOpen(next);
            if (!next) resetCreate();
          });
        }}
        repositionInputs={false}
      >
        <DrawerContent className="mt-0! max-h-[92dvh] gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero relative shrink-0 overflow-hidden px-4 pb-2.5 pt-1">
            <DrawerHeader className="relative space-y-0 p-0 text-start">
              <DrawerTitle className="text-body font-bold text-on-hero">
                {type === "LENT"
                  ? "ثبت طلب"
                  : buildingContext
                    ? "ثبت بدهی"
                    : "ثبت یادم‌باشه"}
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-[11px] text-on-hero/70">
                {buildingContext
                  ? "جدا از شارژ ماهانه و هزینه مشاع"
                  : sharedHousehold
                    ? "جدا از خرج ماه — بدون تسویه بین اعضا"
                    : "وام یا قسط — جدا از بودجه ماه"}
              </DrawerDescription>
            </DrawerHeader>
          </div>

          <form
            onSubmit={onCreate}
            className="surface-sheet-canvas min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <div
              role="radiogroup"
              aria-label={
                buildingContext ? "نوع طلب یا بدهی" : "نوع طلب یا یادم‌باشه"
              }
              className="grid grid-cols-2 gap-0.5 rounded-xl bg-muted/80 p-0.5"
            >
              {(
                [
                  { value: "LENT" as const, label: "طلب" },
                  {
                    value: "BORROWED" as const,
                    label: buildingContext ? "بدهی" : "یادم‌باشه",
                  },
                ] as const
              ).map((opt) => {
                const active = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setType(opt.value)}
                    className={cn(
                      "h-10 rounded-lg text-body-sm font-semibold transition-[color,background-color,transform] duration-150",
                      "active:scale-[0.98]",
                      active && opt.value === "LENT"
                        ? "bg-success-soft text-success"
                        : active && opt.value === "BORROWED"
                          ? "bg-destructive-soft text-destructive"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {buildingContext && activeUnits.length > 0 ? (
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">واحد (اختیاری)</p>
                <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => selectUnit(null)}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center rounded-full px-2.5 text-caption font-semibold transition-colors",
                      unitId == null
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    آزاد
                  </button>
                  {activeUnits.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => selectUnit(u.id)}
                      className={cn(
                        "inline-flex h-8 shrink-0 items-center rounded-full px-2.5 text-caption font-semibold transition-colors",
                        unitId === u.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-[1.35fr_1fr] gap-2">
              <div className="min-w-0 space-y-1">
                <label
                  htmlFor="debt-counterparty"
                  className="text-[11px] text-muted-foreground"
                >
                  طرف حساب
                </label>
                <Input
                  id="debt-counterparty"
                  name="counterparty"
                  autoComplete="off"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  placeholder={
                    buildingContext ? "مثلاً واحد ۶…" : "مثلاً علی…"
                  }
                  className="h-11 rounded-xl border-border/60 bg-card placeholder:font-normal placeholder:text-muted-foreground"
                  required={!unitId}
                  minLength={unitId ? undefined : 2}
                />
              </div>
              <div className="min-w-0 space-y-1">
                <label
                  htmlFor="debt-amount"
                  className="text-[11px] text-muted-foreground"
                >
                  مبلغ
                </label>
                <MoneyInput
                  id="debt-amount"
                  name="amount"
                  value={amount}
                  onValueChange={setAmount}
                  placeholder="۰"
                  className="h-11 rounded-xl border-border/60 bg-card text-base font-semibold placeholder:font-normal placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {knownNames.length > 0 ? (
              <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 scrollbar-none">
                {knownNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setCounterparty(name)}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center rounded-full px-2.5 text-caption font-semibold transition-colors",
                      counterpartyKey(counterparty) === counterpartyKey(name)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : null}

            {matchingCreate ? (
              <p className="text-caption text-muted-foreground">
                به {panelTypeLabel(type, buildingContext)} «
                {matchingCreate.counterparty}» اضافه می‌شود — ردیف جدا ساخته
                نمی‌شود.
              </p>
            ) : null}

            <div className="space-y-1">
              <label
                htmlFor="debt-note"
                className="text-[11px] text-muted-foreground"
              >
                توضیح
              </label>
              <Input
                id="debt-note"
                name="note"
                autoComplete="off"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثلاً خرج ماشین مرداد…"
                maxLength={200}
                className="h-11 rounded-xl border-border/60 bg-card placeholder:font-normal placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">سررسید</p>
                {hasDueDate ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHasDueDate(false);
                      setDueDate("");
                    }}
                    className="text-caption font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    حذف
                  </button>
                ) : null}
              </div>
              {hasDueDate ? (
                <JalaliDatePicker
                  id="debt-due"
                  value={dueDate}
                  onChange={setDueDate}
                  variant="compact"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setHasDueDate(true);
                    setDueDate(todayIsoDateTehran());
                  }}
                  className={cn(
                    "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border/60 bg-card px-3 text-start",
                    "text-body-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
                    "active:scale-[0.99]",
                  )}
                >
                  <span>اختیاری</span>
                  <span aria-hidden>▾</span>
                </button>
              )}
            </div>

            {error ? (
              <p
                className="text-sm text-destructive"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="h-11 w-full rounded-xl text-body-sm font-semibold"
              disabled={pending}
            >
              {pending
                ? "در حال ثبت…"
                : matchingCreate
                  ? `افزودن به ${panelTypeLabel(type, buildingContext)} ${matchingCreate.counterparty}`
                  : type === "LENT"
                    ? "ثبت طلب"
                    : buildingContext
                      ? "ثبت بدهی"
                      : "ثبت یادم‌باشه"}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={Boolean(selectedAccount)}
        onOpenChange={(open) => {
          requestOpenChange(open, (next) => {
            if (!next) resetPay();
          });
        }}
        repositionInputs={false}
      >
        <DrawerContent className="mt-0! max-h-[92dvh] gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero relative shrink-0 overflow-hidden px-4 pb-2.5 pt-1">
            <DrawerHeader className="relative space-y-0 p-0 text-start">
              <DrawerTitle className="text-body font-bold text-on-hero">
                {selectedAccount?.counterparty}
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-caption text-on-hero/75">
                {selectedAccount
                  ? `مانده ${formatCurrency(selectedAccount.remaining, currency)} · ${panelTypeLabel(selectedAccount.type, buildingContext)}`
                  : ""}
              </DrawerDescription>
            </DrawerHeader>
          </div>

          <form
            ref={accountFormRef}
            onSubmit={onPay}
            className="surface-sheet-canvas min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            {canMutate ? (
              <>
                {editing ? (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-body-sm font-semibold text-foreground">
                      {editing.kind === "open"
                        ? "ویرایش افزایش"
                        : selectedAccount?.type === "LENT"
                          ? "ویرایش دریافت"
                          : "ویرایش پرداخت"}
                    </p>
                    <button
                      type="button"
                      onClick={() => clearAccountForm()}
                      className="text-caption font-medium text-muted-foreground hover:text-foreground"
                    >
                      انصراف
                    </button>
                  </div>
                ) : (
                  <div
                    role="radiogroup"
                    aria-label="افزایش یا تسویه"
                    className="grid grid-cols-2 gap-0.5 rounded-xl bg-muted/80 p-0.5"
                  >
                    {(
                      [
                        { value: "increase" as const, label: "افزایش" },
                        {
                          value: "pay" as const,
                          label:
                            selectedAccount?.type === "LENT"
                              ? "دریافت"
                              : "پرداخت",
                        },
                      ] as const
                    ).map((opt) => {
                      const active = accountMode === opt.value;
                      const payDisabled =
                        opt.value === "pay" &&
                        (selectedAccount?.remaining ?? 0) <= 0;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={payDisabled}
                          onClick={() => {
                            if (payDisabled) return;
                            setAccountMode(opt.value);
                            setError(null);
                          }}
                          className={cn(
                            "h-10 rounded-lg text-body-sm font-semibold transition-[color,background-color,transform] duration-150 active:scale-[0.98] disabled:opacity-40",
                            active && opt.value === "increase"
                              ? "bg-primary text-primary-foreground"
                              : active && opt.value === "pay"
                                ? selectedAccount?.type === "LENT"
                                  ? "bg-success-soft text-success"
                                  : "bg-destructive-soft text-destructive"
                                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="debt-pay-amount"
                    className="text-label text-muted-foreground"
                  >
                    مبلغ
                  </label>
                  <MoneyInput
                    key={
                      editing
                        ? `${editing.kind}-${editing.kind === "open" ? editing.debtId : editing.paymentId}`
                        : "new"
                    }
                    id="debt-pay-amount"
                    name="payAmount"
                    value={payAmount}
                    onValueChange={setPayAmount}
                    className="h-14 rounded-xl border-border/60 bg-card text-2xl font-semibold tracking-tight"
                  />
                </div>

                {editing?.kind === "open" ||
                (!editing && accountMode === "increase") ? (
                  <>
                    {editing?.kind === "open" ? (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="debt-pay-date"
                          className="text-label text-muted-foreground"
                        >
                          تاریخ
                        </label>
                        <JalaliDatePicker
                          id="debt-pay-date"
                          value={payDate}
                          onChange={setPayDate}
                          variant="compact"
                        />
                      </div>
                    ) : null}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="debt-open-note"
                        className="text-label text-muted-foreground"
                      >
                        توضیح
                      </label>
                      <Input
                        id="debt-open-note"
                        name="openNote"
                        autoComplete="off"
                        value={payNote}
                        onChange={(e) => setPayNote(e.target.value)}
                        placeholder="مثلاً خرج ماشین مرداد…"
                        className="h-12 rounded-xl border-border/60 bg-card"
                        maxLength={200}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-label text-muted-foreground">
                          سررسید
                        </p>
                        {hasDueDate ? (
                          <button
                            type="button"
                            onClick={() => {
                              setHasDueDate(false);
                              setDueDate("");
                            }}
                            className="text-caption font-medium text-muted-foreground hover:text-foreground"
                          >
                            حذف
                          </button>
                        ) : null}
                      </div>
                      {hasDueDate ? (
                        <JalaliDatePicker
                          id="debt-account-due"
                          value={dueDate}
                          onChange={setDueDate}
                          variant="compact"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setHasDueDate(true);
                            setDueDate(todayIsoDateTehran());
                          }}
                          className="flex h-12 w-full items-center justify-between rounded-xl border border-border/60 bg-card px-3 text-start text-body-sm text-muted-foreground"
                        >
                          <span>اختیاری</span>
                          <span aria-hidden>▾</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="debt-pay-date"
                        className="text-label text-muted-foreground"
                      >
                        تاریخ
                      </label>
                      <JalaliDatePicker
                        id="debt-pay-date"
                        value={payDate}
                        onChange={setPayDate}
                        variant="compact"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="debt-pay-note"
                        className="text-label text-muted-foreground"
                      >
                        یادداشت
                      </label>
                      <Input
                        id="debt-pay-note"
                        name="payNote"
                        autoComplete="off"
                        value={payNote}
                        onChange={(e) => setPayNote(e.target.value)}
                        placeholder="اختیاری…"
                        className="h-12 rounded-xl border-border/60 bg-card"
                        maxLength={200}
                      />
                    </div>
                  </>
                )}

                {error ? (
                  <p
                    className="text-sm text-destructive"
                    role="alert"
                    aria-live="assertive"
                  >
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl text-body-sm font-semibold"
                  disabled={pending}
                >
                  {pending
                    ? editing
                      ? "در حال ذخیره…"
                      : "در حال ثبت…"
                    : editing
                      ? "ذخیره تغییرات"
                      : accountMode === "increase"
                        ? "ثبت افزایش"
                        : selectedAccount?.type === "LENT"
                          ? "ثبت دریافت"
                          : "ثبت پرداخت"}
                </Button>

                {editing ? (
                  confirmDelete ? (
                    <div className="space-y-2 rounded-xl border border-destructive/20 bg-destructive-soft/40 px-3 py-2.5">
                      <p className="text-center text-[11px] text-destructive">
                        {editing.kind === "open" &&
                        (editingSnapshot?.paymentCount ?? 0) > 0
                          ? "این افزایش و دریافت‌هایش برای همیشه حذف می‌شود."
                          : "مطمئنی؟ این مورد از گردش حذف می‌شود."}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl"
                          disabled={pending}
                          onClick={() => setConfirmDelete(false)}
                        >
                          انصراف
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          className="h-10 rounded-xl"
                          disabled={pending}
                          onClick={onDeleteLedgerItem}
                        >
                          {pending ? "در حال حذف…" : "حذف شود"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-10 w-full rounded-xl text-caption font-medium text-destructive hover:bg-destructive/8 hover:text-destructive"
                      disabled={pending}
                      onClick={() => setConfirmDelete(true)}
                    >
                      حذف این مورد
                    </Button>
                  )
                ) : null}
              </>
            ) : null}

            {selectedAccount ? (
              <AccountLedger
                account={selectedAccount}
                currency={currency}
                sharedHousehold={sharedHousehold || buildingContext}
                canMutate={canMutate}
                editing={editing}
                onEdit={startLedgerEdit}
              />
            ) : null}
          </form>
        </DrawerContent>
      </Drawer>

      {discardConfirm}
    </div>
  );
}

function SummaryRow({
  label,
  amount,
  currency,
}: {
  label: string;
  amount: number;
  currency: SpaceCurrency;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="text-body-sm font-semibold tabular-nums text-foreground">
        {formatCurrency(amount, currency)}
      </dd>
    </div>
  );
}

function DebtMonthOverview({
  summary,
  currency,
  sharedHousehold,
  buildingContext = false,
}: {
  summary: DebtMonthSummary;
  currency: SpaceCurrency;
  sharedHousehold: boolean;
  buildingContext?: boolean;
}) {
  const showLent =
    summary.lentRemaining > 0 ||
    summary.lentOpened > 0 ||
    summary.lentReturned > 0;
  const showBorrowed =
    summary.borrowedRemaining > 0 ||
    summary.borrowedOpened > 0 ||
    summary.borrowedPaid > 0;

  return (
    <section className="animate-fade-up rounded-2xl border border-border/55 bg-card px-4 py-3.5 shadow-sm">
      <p className="text-pretty text-caption font-semibold text-muted-foreground">
        {buildingContext
          ? "خلاصه طلب و بدهی واحدها — داخل شارژ و مشاع نیست"
          : sharedHousehold
            ? "خلاصه طلب و یادم‌باشه — داخل خرج ماه نیست"
            : "خلاصه طلب و یادم‌باشه — داخل بودجه ماه نیست"}
      </p>
      <div
        className={cn(
          "mt-3",
          showLent && showBorrowed ? "space-y-4" : "space-y-3",
        )}
      >
        {showLent ? (
          <div className="space-y-1.5">
            <p className="text-body-sm font-semibold text-success">طلب</p>
            <dl className="space-y-1.5">
              <SummaryRow
                label="مانده"
                amount={summary.lentRemaining}
                currency={currency}
              />
              <SummaryRow
                label="این ماه داده‌شده"
                amount={summary.lentOpened}
                currency={currency}
              />
              <SummaryRow
                label="این ماه برگشته"
                amount={summary.lentReturned}
                currency={currency}
              />
            </dl>
          </div>
        ) : null}
        {showBorrowed ? (
          <div className="space-y-1.5">
            <p className="text-body-sm font-semibold text-destructive">
              {buildingContext ? "بدهی" : "یادم‌باشه"}
            </p>
            <dl className="space-y-1.5">
              <SummaryRow
                label="مانده"
                amount={summary.borrowedRemaining}
                currency={currency}
              />
              <SummaryRow
                label="این ماه گرفته‌شده"
                amount={summary.borrowedOpened}
                currency={currency}
              />
              <SummaryRow
                label="این ماه پرداخت‌شده"
                amount={summary.borrowedPaid}
                currency={currency}
              />
            </dl>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DebtAccountList({
  title,
  tone,
  accounts,
  currency,
  typeLabel = debtTypeLabel,
  onOpen,
}: {
  title: string;
  tone: "lent" | "borrowed" | "settled";
  accounts: DebtAccount<DebtDTO>[];
  currency: SpaceCurrency;
  typeLabel?: (type: DebtTypeValue) => string;
  onOpen: (account: DebtAccount<DebtDTO>) => void;
}) {
  if (accounts.length === 0) return null;

  return (
    <section className="space-y-1.5">
      <h3 className="px-0.5 text-pretty text-caption font-semibold text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {accounts.map((account) => (
          <li key={account.key}>
            <button
              type="button"
              onClick={() => onOpen(account)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-2xl border bg-card px-3.5 py-2.5 text-start shadow-sm",
                "transition-colors hover:bg-muted/40 active:scale-[0.99]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tone === "lent" && "border-success/25",
                tone === "borrowed" && "border-destructive/25",
                tone === "settled" && "border-border/50",
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-body-sm font-semibold text-foreground">
                  {account.counterparty}
                </p>
                <p className="mt-0.5 text-caption text-muted-foreground">
                  {typeLabel(account.type)}
                  {(() => {
                    const unitName = account.debts.find((d) => d.unitName)
                      ?.unitName;
                    return unitName ? ` · واحد ${unitName}` : "";
                  })()}
                  {account.itemCount > 1
                    ? ` · ${account.itemCount.toLocaleString("fa-IR")} فقره`
                    : ""}
                  {account.nearestDueDate
                    ? ` · سررسید ${formatDateFa(new Date(`${account.nearestDueDate}T12:00:00Z`))}`
                    : ""}
                </p>
              </div>
              <div className="shrink-0 text-end">
                <p
                  className={cn(
                    "text-body-sm font-bold tabular-nums",
                    tone === "lent" && "text-success",
                    tone === "borrowed" && "text-destructive",
                    tone === "settled" && "text-muted-foreground",
                  )}
                >
                  {formatCurrency(account.remaining, currency)}
                </p>
                <p className="text-micro text-muted-foreground">مانده</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AccountLedger({
  account,
  currency,
  sharedHousehold,
  canMutate,
  editing,
  onEdit,
}: {
  account: DebtAccount<DebtDTO>;
  currency: SpaceCurrency;
  sharedHousehold: boolean;
  canMutate: boolean;
  editing: LedgerEdit | null;
  onEdit: (next: LedgerEdit) => void;
}) {
  const movements = [...account.debts]
    .flatMap((debt) => {
      const opened = [
        {
          id: `open-${debt.id}`,
          debtId: debt.id,
          paymentId: null as string | null,
          date: debt.createdAt.slice(0, 10),
          amount: debt.initialAmount,
          kind: "open" as const,
          note: [
            debt.note,
            sharedHousehold ? `ثبت توسط ${debt.createdByName}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
        },
      ];
      const pays = debt.payments.map((p) => ({
        id: p.id,
        debtId: debt.id,
        paymentId: p.id,
        date: p.date,
        amount: p.amount,
        kind: "pay" as const,
        note: p.note,
      }));
      return [...opened, ...pays];
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  if (movements.length === 0) return null;

  return (
    <div className="border-t border-border/45 pt-2.5">
      <p className="text-caption font-semibold text-muted-foreground">گردش</p>
      {canMutate ? (
        <p className="mt-0.5 text-micro text-muted-foreground">
          برای ویرایش یا حذف، روی مورد بزن
        </p>
      ) : null}
      <ul className="mt-1.5 divide-y divide-border/40">
        {movements.map((row) => {
          const selected =
            editing?.kind === "open"
              ? row.kind === "open" && editing.debtId === row.debtId
              : editing?.kind === "pay"
                ? row.kind === "pay" && editing.paymentId === row.paymentId
                : false;
          const body = (
            <>
              <div className="min-w-0">
                <p className="text-caption text-foreground">
                  {formatDateFa(new Date(`${row.date}T12:00:00Z`))}
                  {" · "}
                  {row.kind === "open"
                    ? account.type === "LENT"
                      ? "قرض داده‌شده"
                      : "قرض گرفته‌شده"
                    : account.type === "LENT"
                      ? "دریافت"
                      : "پرداخت"}
                </p>
                {row.note ? (
                  <p className="truncate text-micro text-muted-foreground">
                    {row.note}
                  </p>
                ) : null}
              </div>
              <p
                className={cn(
                  "shrink-0 text-caption font-semibold tabular-nums",
                  row.kind === "open"
                    ? account.type === "LENT"
                      ? "text-success"
                      : "text-destructive"
                    : "text-foreground",
                )}
              >
                {row.kind === "open" ? "+" : "−"}
                {formatCurrency(row.amount, currency)}
              </p>
            </>
          );

          return (
            <li key={row.id}>
              {canMutate ? (
                <button
                  type="button"
                  onClick={() =>
                    onEdit(
                      row.kind === "open"
                        ? { kind: "open", debtId: row.debtId }
                        : {
                            kind: "pay",
                            debtId: row.debtId,
                            paymentId: row.paymentId!,
                          },
                    )
                  }
                  className={cn(
                    "flex w-full items-baseline justify-between gap-3 py-1.5 text-start",
                    "rounded-lg px-1 -mx-1 transition-colors",
                    "hover:bg-muted/50 active:bg-muted/70",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected && "bg-primary/8",
                  )}
                >
                  {body}
                </button>
              ) : (
                <div className="flex items-baseline justify-between gap-3 py-1.5">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DebtMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-7" fill="none" aria-hidden="true">
      <rect
        x="10"
        y="12"
        width="28"
        height="24"
        rx="5"
        stroke="currentColor"
        strokeWidth="2.25"
      />
      <path
        d="M16 20h16M16 26h10M16 32h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
