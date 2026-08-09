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

function parseAmount(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

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
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [hasDeadline, setHasDeadline] = useState(false);

  const [txType, setTxType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [txAmount, setTxAmount] = useState("");
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
    (title.trim().length > 0 ||
      target.trim().length > 0 ||
      hasDeadline);
  const txDirty =
    Boolean(txPot) &&
    (txAmount.trim().length > 0 ||
      txNote.trim().length > 0 ||
      txType !== "DEPOSIT");
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
    setTarget("");
    setDeadline("");
    setHasDeadline(false);
    setError(null);
  }

  function resetTx() {
    setTxPot(null);
    setTxAmount("");
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
        targetAmount: parseAmount(target),
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
        amount: parseAmount(txAmount),
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

      {error && !createOpen && !txPot ? (
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
          هنوز صندوقی نیست. مثلاً «سفر نوروز» یا «پیش‌پرداخت ماشین».
        </p>
      ) : (
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
      )}

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
          <div className="surface-hero shrink-0 px-4 pb-2.5 pt-1">
            <DrawerHeader className="space-y-0 p-0 text-start">
              <DrawerTitle className="text-pretty text-body font-bold text-on-hero">
                صندوق پس‌انداز جدید
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-caption text-on-hero/70">
                مبلغ هدف را مشخص کنید؛ واریزها بودجه ماه را جابه‌جا نمی‌کنند.
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <form
            onSubmit={onCreate}
            className="space-y-3 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <div className="space-y-1">
              <label
                htmlFor="savings-pot-title"
                className="text-label text-muted-foreground"
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
                className="h-11 rounded-xl"
                required
                minLength={2}
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="savings-pot-target"
                className="text-label text-muted-foreground"
              >
                مبلغ هدف
              </label>
              <Input
                id="savings-pot-target"
                name="targetAmount"
                autoComplete="off"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                inputMode="numeric"
                placeholder="مثلاً ۵۰۰۰۰۰۰…"
                className="h-11 rounded-xl"
                required
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-body-sm">
              <Checkbox
                checked={hasDeadline}
                onCheckedChange={(v) => setHasDeadline(v === true)}
              />
              مهلت دارد
            </label>
            {hasDeadline ? (
              <JalaliDatePicker value={deadline} onChange={setDeadline} />
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
          <div className="surface-hero shrink-0 px-4 pb-2.5 pt-1">
            <DrawerHeader className="space-y-0 p-0 text-start">
              <DrawerTitle className="text-pretty text-body font-bold text-on-hero">
                {txPot?.title}
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-caption text-on-hero/70">
                موجودی:{" "}
                {txPot ? formatCurrency(txPot.balance, currency) : "—"}
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <form
            onSubmit={onTx}
            className="space-y-3 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <div
              role="radiogroup"
              aria-label="نوع تراکنش"
              className="grid grid-cols-2 gap-2"
            >
              <Button
                type="button"
                role="radio"
                aria-checked={txType === "DEPOSIT"}
                variant={txType === "DEPOSIT" ? "default" : "outline"}
                className="h-10 rounded-xl"
                onClick={() => setTxType("DEPOSIT")}
              >
                واریز
              </Button>
              <Button
                type="button"
                role="radio"
                aria-checked={txType === "WITHDRAWAL"}
                variant={txType === "WITHDRAWAL" ? "default" : "outline"}
                className="h-10 rounded-xl"
                onClick={() => setTxType("WITHDRAWAL")}
              >
                برداشت
              </Button>
            </div>
            <Select value={txMemberId} onValueChange={setTxMemberId}>
              <SelectTrigger
                className="h-11 rounded-xl"
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
            <div className="space-y-1">
              <label
                htmlFor="savings-tx-amount"
                className="text-label text-muted-foreground"
              >
                مبلغ
              </label>
              <Input
                id="savings-tx-amount"
                name="amount"
                autoComplete="off"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                inputMode="numeric"
                placeholder="مثلاً ۵۰۰۰۰۰…"
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="savings-tx-note"
                className="text-label text-muted-foreground"
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
                className="h-11 rounded-xl"
              />
            </div>
            <JalaliDatePicker value={txDate} onChange={setTxDate} />
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
              disabled={pending || !txMemberId}
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
