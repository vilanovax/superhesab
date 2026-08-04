"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  addInternalLoanPayment,
  createInternalLoan,
  type InternalLoanDTO,
} from "@/app/actions/internalLoan";
import type { FundMemberOption } from "@/components/spaces/savings-pot-panel";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUnsavedCloseGuard } from "@/components/ui/unsaved-close-guard";
import { daysUntilDue, isDueSoon } from "@/lib/family-loans";
import type { SpaceCurrency } from "@/lib/format";
import { todayIsoDateTehran } from "@/lib/format";
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

type InternalLoanPanelProps = {
  spaceId: string;
  loans: InternalLoanDTO[];
  members: FundMemberOption[];
  currentMemberId: string | null;
  currency: SpaceCurrency;
  canMutate: boolean;
};

function parseAmount(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export function InternalLoanPanel({
  spaceId,
  loans,
  members,
  currentMemberId,
  currency,
  canMutate,
}: InternalLoanPanelProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [payLoan, setPayLoan] = useState<InternalLoanDTO | null>(null);
  const [showSettled, setShowSettled] = useState(false);

  const [fromId, setFromId] = useState(currentMemberId ?? "");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [hasDue, setHasDue] = useState(false);
  const [note, setNote] = useState("");

  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayIsoDateTehran());
  const [payNote, setPayNote] = useState("");

  const active = useMemo(
    () => loans.filter((l) => l.status === "ACTIVE"),
    [loans],
  );
  const settled = useMemo(
    () => loans.filter((l) => l.status === "SETTLED"),
    [loans],
  );
  const dueSoon = useMemo(
    () =>
      active.filter((l) =>
        l.dueDate ? isDueSoon(new Date(`${l.dueDate}T12:00:00Z`)) : false,
      ),
    [active],
  );

  const createDirty =
    createOpen &&
    (amount.trim().length > 0 || note.trim().length > 0 || hasDue);
  const payDirty =
    Boolean(payLoan) &&
    (payAmount.trim().length > 0 || payNote.trim().length > 0);
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
    setAmount("");
    setNote("");
    setDueDate("");
    setHasDue(false);
    setError(null);
  }

  function resetPay() {
    setPayLoan(null);
    setPayAmount("");
    setPayNote("");
    setPayDate(todayIsoDateTehran());
    setError(null);
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createInternalLoan({
        spaceId,
        fromMemberId: fromId,
        toMemberId: toId,
        initialAmount: parseAmount(amount),
        dueDate: hasDue && dueDate ? dueDate : null,
        note: note || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreateOpen(false);
      resetCreate();
    });
  }

  function onPay(e: React.FormEvent) {
    e.preventDefault();
    if (!payLoan) return;
    setError(null);
    startTransition(async () => {
      const result = await addInternalLoanPayment({
        spaceId,
        loanId: payLoan.id,
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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-pretty text-body-sm font-semibold text-foreground">
            وام خانوادگی
          </h3>
          <p className="text-caption text-muted-foreground">
            قرض بین اعضا — جدا از بدهی بیرونی و تسویه
          </p>
        </div>
        {canMutate ? (
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-xl"
            onClick={() => {
              setError(null);
              setFromId(currentMemberId ?? members[0]?.memberId ?? "");
              setToId(
                members.find((m) => m.memberId !== currentMemberId)
                  ?.memberId ?? "",
              );
              setCreateOpen(true);
            }}
          >
            وام جدید
          </Button>
        ) : null}
      </div>

      {dueSoon.length > 0 ? (
        <div className="rounded-2xl border border-destructive/25 bg-destructive-soft px-3.5 py-2.5">
          <p className="text-caption font-semibold text-destructive">
            سررسید نزدیک
          </p>
          <ul className="mt-1 space-y-0.5">
            {dueSoon.map((l) => {
              const days = daysUntilDue(
                l.dueDate ? new Date(`${l.dueDate}T12:00:00Z`) : null,
              );
              return (
                <li key={l.id} className="text-caption text-destructive/90">
                  {l.fromName} → {l.toName} ·{" "}
                  {formatCurrency(l.remaining, currency)}
                  {days != null
                    ? days < 0
                      ? ` · ${Math.abs(days)} روز گذشته`
                      : days === 0
                        ? " · امروز"
                        : ` · ${days} روز`
                    : ""}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {error && !createOpen && !payLoan ? (
        <p
          className="text-caption text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}

      {active.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-body-sm text-muted-foreground">
          وام داخلی ثبت نشده. برای قرض بین اعضای خانواده اینجا ثبت کنید.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {active.map((loan) => (
            <li
              key={loan.id}
              className="rounded-2xl border border-border/55 bg-card px-3.5 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-foreground">
                    {loan.fromName}
                    <span className="mx-1 text-muted-foreground">→</span>
                    {loan.toName}
                  </p>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    مانده {formatCurrency(loan.remaining, currency)} از{" "}
                    {formatCurrency(loan.initialAmount, currency)}
                  </p>
                </div>
                {canMutate ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 shrink-0 rounded-lg text-caption"
                    onClick={() => {
                      setError(null);
                      setPayLoan(loan);
                    }}
                  >
                    بازپرداخت
                  </Button>
                ) : null}
              </div>
              <div
                className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={loan.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`پیشرفت بازپرداخت ${loan.fromName} به ${loan.toName}`}
              >
                <div
                  className={cn(
                    "h-full rounded-full bg-primary transition-[width] duration-300 ease-out",
                    loan.progressPercent >= 100 && "bg-success",
                  )}
                  style={{ width: `${loan.progressPercent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {settled.length > 0 ? (
        <button
          type="button"
          aria-expanded={showSettled}
          className="text-caption text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => setShowSettled((v) => !v)}
        >
          {showSettled ? "پنهان کردن" : "نمایش"} تسویه‌شده‌ها ({settled.length})
        </button>
      ) : null}

      {showSettled
        ? settled.map((loan) => (
            <div
              key={loan.id}
              className="rounded-xl border border-border/40 bg-muted/30 px-3 py-2 text-caption text-muted-foreground"
            >
              {loan.fromName} → {loan.toName} ·{" "}
              {formatCurrency(loan.initialAmount, currency)} · تسویه
            </div>
          ))
        : null}

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
          <div className="surface-hero shrink-0 px-4 pb-2.5 pt-1">
            <DrawerHeader className="space-y-0 p-0 text-start">
              <DrawerTitle className="text-pretty text-body font-bold text-on-hero">
                وام خانوادگی جدید
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-caption text-on-hero/70">
                وام‌دهنده و وام‌گیرنده را از اعضای همین فضا انتخاب کنید.
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <form
            onSubmit={onCreate}
            className="space-y-3 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <div className="space-y-1.5">
              <p className="text-caption font-medium text-muted-foreground">
                وام‌دهنده
              </p>
              <Select value={fromId} onValueChange={setFromId}>
                <SelectTrigger
                  className="h-11 rounded-xl"
                  aria-label="وام‌دهنده"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.memberId} value={m.memberId}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-caption font-medium text-muted-foreground">
                وام‌گیرنده
              </p>
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger
                  className="h-11 rounded-xl"
                  aria-label="وام‌گیرنده"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.memberId} value={m.memberId}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="loan-amount"
                className="text-label text-muted-foreground"
              >
                مبلغ
              </label>
              <Input
                id="loan-amount"
                name="amount"
                autoComplete="off"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
                placeholder="مثلاً ۲۰۰۰۰۰۰…"
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="loan-note"
                className="text-label text-muted-foreground"
              >
                یادداشت
              </label>
              <Input
                id="loan-note"
                name="note"
                autoComplete="off"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="اختیاری…"
                className="h-11 rounded-xl"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-body-sm">
              <Checkbox
                checked={hasDue}
                onCheckedChange={(v) => setHasDue(v === true)}
              />
              سررسید دارد
            </label>
            {hasDue ? (
              <JalaliDatePicker value={dueDate} onChange={setDueDate} />
            ) : null}
            {error ? (
              <p
                className="text-caption text-destructive"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-11 w-full rounded-xl"
              disabled={pending || !fromId || !toId}
            >
              {pending ? "در حال ثبت…" : "ثبت وام"}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={Boolean(payLoan)}
        onOpenChange={(open) => {
          requestOpenChange(open, (next) => {
            if (!next) resetPay();
          });
        }}
        repositionInputs={false}
      >
        <DrawerContent className="mt-0! max-h-[92dvh] gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero shrink-0 px-4 pb-2.5 pt-1">
            <DrawerHeader className="space-y-0 p-0 text-start">
              <DrawerTitle className="text-pretty text-body font-bold text-on-hero">
                بازپرداخت
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-caption text-on-hero/70">
                {payLoan
                  ? `${payLoan.fromName} → ${payLoan.toName} · مانده ${formatCurrency(payLoan.remaining, currency)}`
                  : ""}
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <form
            onSubmit={onPay}
            className="space-y-3 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <div className="space-y-1">
              <label
                htmlFor="loan-pay-amount"
                className="text-label text-muted-foreground"
              >
                مبلغ پرداخت
              </label>
              <Input
                id="loan-pay-amount"
                name="payAmount"
                autoComplete="off"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                inputMode="numeric"
                placeholder="مثلاً ۵۰۰۰۰۰…"
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="loan-pay-note"
                className="text-label text-muted-foreground"
              >
                یادداشت
              </label>
              <Input
                id="loan-pay-note"
                name="payNote"
                autoComplete="off"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="اختیاری…"
                className="h-11 rounded-xl"
              />
            </div>
            <JalaliDatePicker value={payDate} onChange={setPayDate} />
            {error ? (
              <p
                className="text-caption text-destructive"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-11 w-full rounded-xl"
              disabled={pending}
            >
              {pending ? "در حال ثبت…" : "ثبت پرداخت"}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>

      {discardConfirm}
    </div>
  );
}
