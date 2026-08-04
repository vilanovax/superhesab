"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  addDebtPayment,
  createDebt,
  type DebtDTO,
} from "@/app/actions/debt";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useUnsavedCloseGuard } from "@/components/ui/unsaved-close-guard";
import {
  daysUntilDue,
  debtTypeLabel,
  isDueSoon,
  type DebtTypeValue,
} from "@/lib/debts";
import type { SpaceCurrency } from "@/lib/format";
import { formatDateFa, todayIsoDateTehran } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

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

type DebtPanelProps = {
  spaceId: string;
  debts: DebtDTO[];
  currency: SpaceCurrency;
  canMutate: boolean;
  /** FAMILY: shared household wording + show who registered each debt. */
  sharedHousehold?: boolean;
};

function parseAmount(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export function DebtPanel({
  spaceId,
  debts,
  currency,
  canMutate,
  sharedHousehold = false,
}: DebtPanelProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [payDebt, setPayDebt] = useState<DebtDTO | null>(null);

  const [type, setType] = useState<DebtTypeValue>("LENT");
  const [counterparty, setCounterparty] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [hasDueDate, setHasDueDate] = useState(false);

  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayIsoDateTehran());
  const [payNote, setPayNote] = useState("");
  const [changePayDate, setChangePayDate] = useState(false);

  const active = useMemo(
    () => debts.filter((d) => d.status === "ACTIVE"),
    [debts],
  );
  const settled = useMemo(
    () => debts.filter((d) => d.status === "SETTLED"),
    [debts],
  );
  const lent = active.filter((d) => d.type === "LENT");
  const borrowed = active.filter((d) => d.type === "BORROWED");

  const dueSoon = useMemo(
    () =>
      active.filter((d) =>
        d.dueDate ? isDueSoon(new Date(`${d.dueDate}T12:00:00Z`)) : false,
      ),
    [active],
  );

  const createDirty =
    createOpen &&
    (counterparty.trim().length > 0 ||
      amount.trim().length > 0 ||
      hasDueDate ||
      type !== "LENT");
  const payDirty =
    Boolean(payDebt) &&
    (payAmount.trim().length > 0 ||
      payNote.trim().length > 0 ||
      changePayDate);
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
    setAmount("");
    setDueDate("");
    setHasDueDate(false);
    setError(null);
  }

  function resetPay() {
    setPayDebt(null);
    setPayAmount("");
    setPayNote("");
    setPayDate(todayIsoDateTehran());
    setChangePayDate(false);
    setError(null);
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await createDebt({
        spaceId,
        type,
        counterparty,
        initialAmount: parseAmount(amount),
        dueDate: hasDueDate && dueDate ? dueDate : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      resetCreate();
      setCreateOpen(false);
    });
  }

  function onPay(e: React.FormEvent) {
    e.preventDefault();
    if (!payDebt || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await addDebtPayment({
        spaceId,
        debtId: payDebt.id,
        amount: parseAmount(payAmount),
        date: payDate || todayIsoDateTehran(),
        note: payNote || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      resetPay();
    });
  }

  return (
    <div className="space-y-4">
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

      {canMutate ? (
        <Button
          type="button"
          className="h-11 w-full rounded-xl font-semibold"
          onClick={() => {
            resetCreate();
            setCreateOpen(true);
          }}
        >
          ثبت بدهی / طلب جدید
        </Button>
      ) : null}

      {sharedHousehold ? (
        <p className="text-caption text-muted-foreground">
          وام و اقساط بیرون از خانواده — جدا از لجر مشترک و بدون تسویه بین اعضا.
        </p>
      ) : null}

      <DebtSection
        title={sharedHousehold ? "طلب‌های خانواده" : "من طلبکارم"}
        tone="lent"
        empty={
          sharedHousehold ? "طلب فعالی ثبت نشده" : "طلب فعالی ندارید"
        }
        items={lent}
        currency={currency}
        canMutate={canMutate}
        showCreator={sharedHousehold}
        onPay={(d) => {
          setError(null);
          setPayDebt(d);
          setPayAmount("");
          setPayDate(todayIsoDateTehran());
          setPayNote("");
          setChangePayDate(false);
        }}
      />

      <DebtSection
        title={sharedHousehold ? "بدهی‌های خانواده" : "من بدهکارم"}
        tone="borrowed"
        empty={
          sharedHousehold ? "بدهی فعالی ثبت نشده" : "بدهی فعالی ندارید"
        }
        items={borrowed}
        currency={currency}
        canMutate={canMutate}
        showCreator={sharedHousehold}
        onPay={(d) => {
          setError(null);
          setPayDebt(d);
          setPayAmount("");
          setPayDate(todayIsoDateTehran());
          setPayNote("");
          setChangePayDate(false);
        }}
      />

      {settled.length > 0 ? (
        <div className="space-y-2">
          <button
            type="button"
            aria-expanded={showArchive}
            className="text-caption font-semibold text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setShowArchive((v) => !v)}
          >
            {showArchive ? "پنهان کردن آرشیو" : `آرشیو تسویه‌شده (${settled.length})`}
          </button>
          {showArchive ? (
            <DebtSection
              title="تسویه‌شده"
              tone="settled"
              empty=""
              items={settled}
              currency={currency}
              canMutate={false}
              showCreator={sharedHousehold}
              onPay={() => {}}
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
          <div className="surface-hero shrink-0 px-5 pb-3.5 pt-2">
            <DrawerHeader className="space-y-0.5 p-0 text-start">
              <DrawerTitle className="text-lg font-bold text-on-hero">
                ثبت بدهی / طلب
              </DrawerTitle>
              <DrawerDescription className="text-body-sm text-on-hero/70">
                وام، قرض یا قسط — جدا از بودجه ماهانه
              </DrawerDescription>
            </DrawerHeader>
          </div>

          <form
            onSubmit={onCreate}
            className="surface-sheet-canvas min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
          >
            <div
              role="radiogroup"
              aria-label="نوع بدهی یا طلب"
              className="grid grid-cols-2 gap-1 rounded-2xl bg-muted/80 p-1"
            >
              {(
                [
                  { value: "LENT" as const, label: "طلب", hint: "قرض دادم" },
                  {
                    value: "BORROWED" as const,
                    label: "بدهی",
                    hint: "قرض گرفتم",
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
                      "flex h-12 flex-col items-center justify-center rounded-xl transition-colors",
                      active
                        ? opt.value === "LENT"
                          ? "bg-success text-success-foreground shadow-sm"
                          : "bg-destructive text-destructive-foreground shadow-sm"
                        : "text-muted-foreground",
                    )}
                  >
                    <span className="text-body-sm font-bold">{opt.label}</span>
                    <span
                      className={cn(
                        "text-micro",
                        active ? "opacity-85" : "opacity-70",
                      )}
                    >
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="debt-counterparty"
                className="text-label text-muted-foreground"
              >
                طرف حساب
              </label>
              <Input
                id="debt-counterparty"
                name="counterparty"
                autoComplete="off"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder="مثلاً علی…"
                className="h-12 rounded-xl border-border/70 bg-card text-base"
                required
                minLength={2}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="debt-amount"
                className="text-label text-muted-foreground"
              >
                مبلغ اولیه
              </label>
              <Input
                id="debt-amount"
                name="amount"
                autoComplete="off"
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^\d]/g, ""))
                }
                placeholder="مثلاً ۵۰۰۰۰۰…"
                className="h-12 rounded-xl border-border/70 bg-card text-lg font-bold tabular-nums"
                required
              />
            </div>

            <div className="space-y-2 rounded-2xl bg-sheet-muted px-3.5 py-3">
              <label className="flex cursor-pointer items-center gap-2.5">
                <Checkbox
                  checked={hasDueDate}
                  onCheckedChange={(v) => {
                    const on = v === true;
                    setHasDueDate(on);
                    if (!on) setDueDate("");
                    else if (!dueDate) setDueDate(todayIsoDateTehran());
                  }}
                  className="size-4.5 rounded data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <span className="text-label text-foreground">
                  سررسید دارم
                </span>
              </label>
              {hasDueDate ? (
                <JalaliDatePicker value={dueDate} onChange={setDueDate} />
              ) : null}
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
              className="h-12 w-full rounded-2xl text-base font-semibold"
              disabled={pending}
            >
              {pending ? "در حال ثبت…" : "ثبت"}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={Boolean(payDebt)}
        onOpenChange={(open) => {
          requestOpenChange(open, (next) => {
            if (!next) resetPay();
          });
        }}
        repositionInputs={false}
      >
        <DrawerContent className="mt-0! max-h-[92dvh] gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero shrink-0 px-5 pb-3.5 pt-2">
            <DrawerHeader className="space-y-0.5 p-0 text-start">
              <DrawerTitle className="text-lg font-bold text-on-hero">
                {payDebt?.type === "LENT" ? "ثبت دریافت" : "ثبت پرداخت"}
              </DrawerTitle>
              <DrawerDescription className="text-body-sm text-on-hero/70">
                {payDebt
                  ? `${payDebt.counterparty} · مانده ${formatCurrency(payDebt.remaining, currency)}`
                  : ""}
              </DrawerDescription>
            </DrawerHeader>
          </div>

          <form
            onSubmit={onPay}
            className="surface-sheet-canvas min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
          >
            <div className="space-y-2">
              <label
                htmlFor="debt-pay-amount"
                className="text-label text-muted-foreground"
              >
                مبلغ
              </label>
              <Input
                id="debt-pay-amount"
                name="payAmount"
                autoComplete="off"
                type="text"
                inputMode="numeric"
                value={payAmount}
                onChange={(e) =>
                  setPayAmount(e.target.value.replace(/[^\d]/g, ""))
                }
                placeholder="مثلاً ۱۰۰۰۰۰…"
                className="h-12 rounded-xl border-border/70 bg-card text-lg font-bold tabular-nums"
                required
              />
            </div>

            <div className="space-y-2 rounded-2xl bg-sheet-muted px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-label text-muted-foreground">تاریخ</p>
                <p className="text-body-sm font-semibold text-foreground">
                  {!changePayDate
                    ? "امروز"
                    : formatDateFa(new Date(`${payDate}T12:00:00Z`))}
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2.5">
                <Checkbox
                  checked={changePayDate}
                  onCheckedChange={(v) => {
                    const on = v === true;
                    setChangePayDate(on);
                    if (!on) setPayDate(todayIsoDateTehran());
                  }}
                  className="size-4.5 rounded data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <span className="text-label text-foreground">
                  تاریخ دیگری ثبت کنم
                </span>
              </label>
              {changePayDate ? (
                <JalaliDatePicker value={payDate} onChange={setPayDate} />
              ) : null}
            </div>

            <div className="space-y-2">
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
                className="h-12 rounded-xl border-border/70 bg-card"
                maxLength={200}
              />
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
              className="h-12 w-full rounded-2xl text-base font-semibold"
              disabled={pending}
            >
              {pending ? "در حال ثبت…" : "ثبت"}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>

      {discardConfirm}
    </div>
  );
}

function DebtSection({
  title,
  tone,
  empty,
  items,
  currency,
  canMutate,
  showCreator = false,
  onPay,
}: {
  title: string;
  tone: "lent" | "borrowed" | "settled";
  empty: string;
  items: DebtDTO[];
  currency: SpaceCurrency;
  canMutate: boolean;
  showCreator?: boolean;
  onPay: (d: DebtDTO) => void;
}) {
  if (items.length === 0 && empty) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 px-4 py-6 text-center">
        <p className="text-body-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-caption text-muted-foreground">{empty}</p>
      </div>
    );
  }
  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="px-0.5 text-pretty text-caption font-semibold text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {items.map((d) => (
          <DebtCard
            key={d.id}
            debt={d}
            tone={tone}
            currency={currency}
            canMutate={canMutate}
            showCreator={showCreator}
            onPay={() => onPay(d)}
          />
        ))}
      </ul>
    </section>
  );
}

function DebtCard({
  debt,
  tone,
  currency,
  canMutate,
  showCreator = false,
  onPay,
}: {
  debt: DebtDTO;
  tone: "lent" | "borrowed" | "settled";
  currency: SpaceCurrency;
  canMutate: boolean;
  showCreator?: boolean;
  onPay: () => void;
}) {
  const days = daysUntilDue(
    debt.dueDate ? new Date(`${debt.dueDate}T12:00:00Z`) : null,
  );
  const barColor =
    tone === "lent"
      ? "bg-success"
      : tone === "borrowed"
        ? "bg-destructive"
        : "bg-muted-foreground";

  return (
    <li
      className={cn(
        "rounded-2xl border bg-card p-3.5 shadow-sm",
        tone === "lent" && "border-success/25",
        tone === "borrowed" && "border-destructive/25",
        tone === "settled" && "border-border/50 opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-foreground">
            {debt.counterparty}
          </p>
          <p className="mt-0.5 text-caption text-muted-foreground">
            {debtTypeLabel(debt.type)} · کل{" "}
            {formatCurrency(debt.initialAmount, currency)}
            {debt.dueDate
              ? ` · سررسید ${formatDateFa(new Date(`${debt.dueDate}T12:00:00Z`))}`
              : ""}
            {days != null && debt.status === "ACTIVE"
              ? days < 0
                ? ` · ${Math.abs(days)} روز گذشته`
                : days === 0
                  ? " · امروز"
                  : ` · ${days} روز مانده`
              : ""}
          </p>
          {showCreator ? (
            <p className="mt-0.5 text-micro text-muted-foreground">
              ثبت توسط {debt.createdByName}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-end">
          <p
            className={cn(
              "text-body-sm font-bold tabular-nums",
              tone === "lent" && "text-success",
              tone === "borrowed" && "text-destructive",
            )}
          >
            {formatCurrency(debt.remaining, currency)}
          </p>
          <p className="text-micro text-muted-foreground">مانده</p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-out",
            barColor,
          )}
          style={{ width: `${debt.progressPercent}%` }}
        />
      </div>
      <p className="mt-1 text-micro text-muted-foreground">
        پرداخت‌شده {formatCurrency(debt.paidTotal, currency)} (
        {debt.progressPercent}٪)
      </p>

      {canMutate && debt.status === "ACTIVE" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 h-9 w-full rounded-xl"
          onClick={onPay}
        >
          {debt.type === "LENT" ? "ثبت دریافت جزئی" : "ثبت پرداخت جزئی"}
        </Button>
      ) : null}

      {debt.payments.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-border/45 pt-2">
          {debt.payments.slice(0, 3).map((p) => (
            <li
              key={p.id}
              className="flex justify-between gap-2 text-caption text-muted-foreground"
            >
              <span>
                {formatDateFa(new Date(`${p.date}T12:00:00Z`))}
                {p.note ? ` · ${p.note}` : ""}
              </span>
              <span className="tabular-nums font-medium text-foreground">
                {formatCurrency(p.amount, currency)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
