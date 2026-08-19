"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  addSavingsTransaction,
  createSavingsPot,
  updateSavingsPotStatus,
  type SavingsPotDTO,
} from "@/app/actions/savingsPot";
import { Button } from "@/components/ui/button";
import { FamilyFirstRun } from "@/components/spaces/family-first-run";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
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
      <div className="h-11 animate-pulse rounded-xl bg-muted/40" />
    ),
  },
);

export type FundMemberOption = {
  memberId: string;
  userId: string;
  label: string;
};

type SavingsPotPanelProps = {
  spaceId: string;
  pots: SavingsPotDTO[];
  members: FundMemberOption[];
  currentMemberId: string | null;
  currency: SpaceCurrency;
  canMutate: boolean;
};

export function SavingsPotPanel({
  spaceId,
  pots,
  members,
  currentMemberId,
  currency,
  canMutate,
}: SavingsPotPanelProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [txPot, setTxPot] = useState<SavingsPotDTO | null>(null);

  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(0);
  const [deadline, setDeadline] = useState("");
  const [hasDeadline, setHasDeadline] = useState(false);

  const [txType, setTxType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [txAmount, setTxAmount] = useState(0);
  const [txMemberId, setTxMemberId] = useState(currentMemberId ?? "");
  const [txDate, setTxDate] = useState(todayIsoDateTehran());
  const [txNote, setTxNote] = useState("");

  const active = useMemo(
    () => pots.filter((p) => p.status !== "ARCHIVED"),
    [pots],
  );
  const archived = useMemo(
    () => pots.filter((p) => p.status === "ARCHIVED"),
    [pots],
  );

  const createDirty =
    createOpen &&
    (title.trim().length > 0 || target > 0 || hasDeadline);
  const txDirty =
    Boolean(txPot) &&
    (txAmount > 0 ||
      txNote.trim().length > 0 ||
      txType !== "DEPOSIT" ||
      txDate !== todayIsoDateTehran());
  const formBlocked = createDirty || txDirty || pending;
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
    setTitle("");
    setTarget(0);
    setDeadline("");
    setHasDeadline(false);
    setError(null);
  }

  function resetTx() {
    setTxPot(null);
    setTxAmount(0);
    setTxNote("");
    setTxType("DEPOSIT");
    setTxDate(todayIsoDateTehran());
    setError(null);
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSavingsPot({
        spaceId,
        title,
        targetAmount: target,
        deadline: hasDeadline && deadline ? deadline : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreateOpen(false);
      resetCreate();
    });
  }

  function onTx(e: React.FormEvent) {
    e.preventDefault();
    if (!txPot) return;
    setError(null);
    startTransition(async () => {
      const result = await addSavingsTransaction({
        spaceId,
        potId: txPot.id,
        memberId: txMemberId,
        amount: txAmount,
        type: txType,
        date: txDate || todayIsoDateTehran(),
        note: txNote || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      resetTx();
    });
  }

  function archivePot(potId: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateSavingsPotStatus({
        spaceId,
        potId,
        status: "ARCHIVED",
      });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      {active.length === 0 ? (
        <FamilyFirstRun
          icon={<PotMark />}
          title="صندوق پس‌انداز"
          description="پول را برای یک هدف جمع کنید؛ جدا از بودجهٔ ماه. مثلاً سفر نوروز یا پیش‌پرداخت ماشین."
        >
          {canMutate ? (
            <Button
              type="button"
              className="h-11 w-full rounded-xl text-body-sm font-semibold"
              onClick={() => {
                setError(null);
                setCreateOpen(true);
              }}
            >
              صندوق جدید
            </Button>
          ) : null}
        </FamilyFirstRun>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-pretty text-body-sm font-semibold text-foreground">
                صندوق پس‌انداز
              </h3>
              <p className="text-caption text-muted-foreground">
                هدف مشترک — جدا از بودجه ماهانه
              </p>
            </div>
            {canMutate ? (
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-xl"
                onClick={() => {
                  setError(null);
                  setCreateOpen(true);
                }}
              >
                صندوق جدید
              </Button>
            ) : null}
          </div>

          <ul className="space-y-2.5">
            {active.map((pot) => (
            <li
              key={pot.id}
              className="rounded-2xl border border-border/55 bg-card px-3.5 py-3 [content-visibility:auto] [contain-intrinsic-size:auto_6.5rem]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-semibold text-foreground">
                    {pot.title}
                    {pot.status === "COMPLETED" ? (
                      <span className="ms-1.5 text-caption font-medium text-success">
                        تکمیل
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    {formatCurrency(pot.balance, currency)} از{" "}
                    {formatCurrency(pot.targetAmount, currency)}
                    {pot.remainingToTarget > 0
                      ? ` · ${formatCurrency(pot.remainingToTarget, currency)} مانده`
                      : ""}
                  </p>
                </div>
                {canMutate ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0 rounded-lg text-caption"
                    onClick={() => {
                      setError(null);
                      setTxMemberId(currentMemberId ?? members[0]?.memberId ?? "");
                      setTxPot(pot);
                    }}
                  >
                    واریز / برداشت
                  </Button>
                ) : null}
              </div>
              <div
                className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={pot.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`پیشرفت ${pot.title}`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300 ease-out",
                    pot.progressPercent >= 100 ? "bg-success" : "bg-primary",
                  )}
                  style={{ width: `${pot.progressPercent}%` }}
                />
              </div>
              {canMutate && pot.status !== "ARCHIVED" ? (
                <button
                  type="button"
                  className="mt-2 text-caption text-muted-foreground underline-offset-2 hover:underline"
                  disabled={pending}
                  onClick={() => archivePot(pot.id)}
                >
                  آرشیو
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        </>
      )}

      {error && !createOpen && !txPot ? (
        <p
          className="text-caption text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}

      {archived.length > 0 ? (
        <p className="text-caption text-muted-foreground">
          {archived.length} صندوق آرشیو شده
        </p>
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
              <DrawerTitle className="text-pretty text-body font-bold text-on-hero">
                صندوق جدید
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-[11px] text-on-hero/70">
                هدف جدا از بودجه ماه
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <form
            onSubmit={onCreate}
            className="surface-sheet-canvas min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <div className="grid grid-cols-[1.35fr_1fr] gap-2">
              <div className="min-w-0 space-y-1">
                <label
                  htmlFor="savings-pot-title"
                  className="text-[11px] text-muted-foreground"
                >
                  عنوان
                </label>
                <Input
                  id="savings-pot-title"
                  name="title"
                  autoComplete="off"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلاً سفر نوروز…"
                  className="h-11 rounded-xl border-border/60 bg-card placeholder:font-normal placeholder:text-muted-foreground"
                  required
                  minLength={2}
                />
              </div>
              <div className="min-w-0 space-y-1">
                <label
                  htmlFor="savings-pot-target"
                  className="text-[11px] text-muted-foreground"
                >
                  مبلغ هدف
                </label>
                <MoneyInput
                  id="savings-pot-target"
                  name="targetAmount"
                  value={target}
                  onValueChange={setTarget}
                  placeholder="۰"
                  className="h-11 rounded-xl border-border/60 bg-card text-base font-semibold placeholder:font-normal placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">مهلت</p>
                {hasDeadline ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHasDeadline(false);
                      setDeadline("");
                    }}
                    className="text-caption font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    حذف
                  </button>
                ) : null}
              </div>
              {hasDeadline ? (
                <JalaliDatePicker
                  id="savings-pot-deadline"
                  value={deadline}
                  onChange={setDeadline}
                  variant="compact"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setHasDeadline(true);
                    setDeadline(todayIsoDateTehran());
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
                className="text-caption text-destructive"
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
              {pending ? "در حال ایجاد…" : "ایجاد صندوق"}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={Boolean(txPot)}
        onOpenChange={(open) => {
          requestOpenChange(open, (next) => {
            if (!next) resetTx();
          });
        }}
        repositionInputs={false}
      >
        <DrawerContent className="mt-0! max-h-[92dvh] gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero relative shrink-0 overflow-hidden px-4 pb-2.5 pt-1">
            <DrawerHeader className="relative space-y-0 p-0 text-start">
              <DrawerTitle className="text-pretty text-body font-bold text-on-hero">
                {txPot?.title}
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-[11px] text-on-hero/70">
                موجودی{" "}
                {txPot ? formatCurrency(txPot.balance, currency) : "—"}
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <form
            onSubmit={onTx}
            className="surface-sheet-canvas min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <div
              role="radiogroup"
              aria-label="نوع تراکنش"
              className="grid grid-cols-2 gap-0.5 rounded-xl bg-muted/80 p-0.5"
            >
              {(
                [
                  { value: "DEPOSIT" as const, label: "واریز" },
                  { value: "WITHDRAWAL" as const, label: "برداشت" },
                ] as const
              ).map((opt) => {
                const active = txType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTxType(opt.value)}
                    className={cn(
                      "h-10 rounded-lg text-body-sm font-bold transition-[color,background-color,transform] duration-150",
                      "active:scale-[0.98]",
                      active && opt.value === "DEPOSIT"
                        ? "bg-success text-success-foreground shadow-sm"
                        : active && opt.value === "WITHDRAWAL"
                          ? "bg-destructive text-destructive-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-[1.15fr_1fr] gap-2">
              <div className="min-w-0 space-y-1">
                <label
                  htmlFor="savings-tx-amount"
                  className="text-[11px] text-muted-foreground"
                >
                  مبلغ
                </label>
                <MoneyInput
                  id="savings-tx-amount"
                  name="amount"
                  value={txAmount}
                  onValueChange={setTxAmount}
                  placeholder="۰"
                  className="h-11 rounded-xl border-border/60 bg-card text-base font-semibold placeholder:font-normal placeholder:text-muted-foreground"
                />
              </div>
              <div className="min-w-0 space-y-1">
                <label
                  htmlFor="savings-tx-date"
                  className="text-[11px] text-muted-foreground"
                >
                  تاریخ
                </label>
                <JalaliDatePicker
                  id="savings-tx-date"
                  value={txDate}
                  onChange={setTxDate}
                  variant="compact"
                />
              </div>
            </div>

            {members.length > 1 ? (
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">از حساب کی</p>
                <Select value={txMemberId} onValueChange={setTxMemberId}>
                  <SelectTrigger
                    className="h-11 rounded-xl border-border/60 bg-card"
                    aria-label="عضو"
                  >
                    <SelectValue placeholder="عضو…" />
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
            ) : null}

            <div className="space-y-1">
              <label
                htmlFor="savings-tx-note"
                className="text-[11px] text-muted-foreground"
              >
                یادداشت
              </label>
              <Input
                id="savings-tx-note"
                name="note"
                autoComplete="off"
                value={txNote}
                onChange={(e) => setTxNote(e.target.value)}
                placeholder="اختیاری…"
                className="h-11 rounded-xl border-border/60 bg-card placeholder:font-normal placeholder:text-muted-foreground"
              />
            </div>
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
              className="h-11 w-full rounded-xl text-body-sm font-semibold"
              disabled={pending || !txMemberId}
            >
              {pending
                ? "در حال ثبت…"
                : txType === "DEPOSIT"
                  ? "ثبت واریز"
                  : "ثبت برداشت"}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>

      {discardConfirm}
    </div>
  );
}

function PotMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-7" fill="none" aria-hidden="true">
      <path
        d="M14 20h20l-1.5 16.5A3 3 0 0 1 29.5 39h-11a3 3 0 0 1-3-2.5L14 20Z"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinejoin="round"
      />
      <path
        d="M18 20c0-4 2.5-8 6-8s6 4 6 8"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
