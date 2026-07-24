"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addDebtPayment,
  createDebt,
  type DebtDTO,
} from "@/app/actions/debt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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

type DebtPanelProps = {
  spaceId: string;
  debts: DebtDTO[];
  currency: SpaceCurrency;
  canMutate: boolean;
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

  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayIsoDateTehran());
  const [payNote, setPayNote] = useState("");

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

  function resetCreate() {
    setType("LENT");
    setCounterparty("");
    setAmount("");
    setDueDate("");
    setError(null);
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDebt({
        spaceId,
        type,
        counterparty,
        initialAmount: parseAmount(amount),
        dueDate: dueDate || null,
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
    if (!payDebt) return;
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
      setPayDebt(null);
      setPayAmount("");
      setPayNote("");
      setPayDate(todayIsoDateTehran());
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

      <DebtSection
        title="من طلبکارم"
        tone="lent"
        empty="طلب فعالی ندارید"
        items={lent}
        currency={currency}
        canMutate={canMutate}
        onPay={(d) => {
          setError(null);
          setPayDebt(d);
          setPayAmount("");
          setPayDate(todayIsoDateTehran());
          setPayNote("");
        }}
      />

      <DebtSection
        title="من بدهکارم"
        tone="borrowed"
        empty="بدهی فعالی ندارید"
        items={borrowed}
        currency={currency}
        canMutate={canMutate}
        onPay={(d) => {
          setError(null);
          setPayDebt(d);
          setPayAmount("");
          setPayDate(todayIsoDateTehran());
          setPayNote("");
        }}
      />

      {settled.length > 0 ? (
        <div className="space-y-2">
          <button
            type="button"
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
              onPay={() => {}}
            />
          ) : null}
        </div>
      ) : null}

      <Drawer open={createOpen} onOpenChange={setCreateOpen}>
        <DrawerContent className="border-border/60 bg-sheet">
          <DrawerHeader className="text-start">
            <DrawerTitle>ثبت بدهی / طلب</DrawerTitle>
          </DrawerHeader>
          <form
            onSubmit={onCreate}
            className="space-y-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/80 p-1">
              {(
                [
                  { value: "LENT" as const, label: "طلب (قرض دادم)" },
                  { value: "BORROWED" as const, label: "بدهی (قرض گرفتم)" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={cn(
                    "h-10 rounded-lg text-caption font-semibold transition-colors",
                    type === opt.value
                      ? opt.value === "LENT"
                        ? "bg-success text-success-foreground"
                        : "bg-destructive text-destructive-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="text-label text-muted-foreground">طرف حساب</label>
              <Input
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder="مثلاً علی"
                className="h-11 rounded-xl"
                required
                minLength={2}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-label text-muted-foreground">مبلغ اولیه</label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 rounded-xl tabular-nums"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-label text-muted-foreground">
                سررسید (اختیاری)
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
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
              {pending ? "…" : "ثبت"}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={Boolean(payDebt)}
        onOpenChange={(open) => {
          if (!open) setPayDebt(null);
        }}
      >
        <DrawerContent className="border-border/60 bg-sheet">
          <DrawerHeader className="text-start">
            <DrawerTitle>
              {payDebt?.type === "LENT" ? "ثبت دریافت" : "ثبت پرداخت"}
              {payDebt ? ` — ${payDebt.counterparty}` : ""}
            </DrawerTitle>
            {payDebt ? (
              <p className="text-body-sm text-muted-foreground">
                مانده: {formatCurrency(payDebt.remaining, currency)}
              </p>
            ) : null}
          </DrawerHeader>
          <form
            onSubmit={onPay}
            className="space-y-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <div className="space-y-1.5">
              <label className="text-label text-muted-foreground">مبلغ</label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={payDebt?.remaining}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="h-11 rounded-xl tabular-nums"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-label text-muted-foreground">تاریخ</label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-label text-muted-foreground">یادداشت</label>
              <Input
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="اختیاری"
                className="h-11 rounded-xl"
                maxLength={200}
              />
            </div>
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
              {pending ? "…" : "ثبت"}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>
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
  onPay,
}: {
  title: string;
  tone: "lent" | "borrowed" | "settled";
  empty: string;
  items: DebtDTO[];
  currency: SpaceCurrency;
  canMutate: boolean;
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
      <h3 className="px-0.5 text-caption font-semibold text-muted-foreground">
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
  onPay,
}: {
  debt: DebtDTO;
  tone: "lent" | "borrowed" | "settled";
  currency: SpaceCurrency;
  canMutate: boolean;
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
          className={cn("h-full rounded-full transition-all", barColor)}
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
