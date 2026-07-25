"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
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
      setTitle("");
      setTarget("");
      setDeadline("");
      setHasDeadline(false);
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
      setTxPot(null);
      setTxAmount("");
      setTxNote("");
      setTxType("DEPOSIT");
      setTxDate(todayIsoDateTehran());
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
          <h3 className="text-body-sm font-semibold text-foreground">
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
        <p className="text-caption text-destructive" role="alert">
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
              className="rounded-2xl border border-border/55 bg-card px-3.5 py-3"
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
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
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

      <Drawer open={createOpen} onOpenChange={setCreateOpen}>
        <DrawerContent className="border-border/60 bg-[#eef5f4]">
          <DrawerHeader className="text-start">
            <DrawerTitle>صندوق پس‌انداز جدید</DrawerTitle>
            <DrawerDescription>
              مبلغ هدف را مشخص کنید؛ واریزها بودجه ماه را جابه‌جا نمی‌کنند.
            </DrawerDescription>
          </DrawerHeader>
          <form onSubmit={onCreate} className="space-y-3 px-4 pb-8">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان (مثلاً سفر)"
              className="h-11 rounded-xl"
              required
              minLength={2}
            />
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              inputMode="numeric"
              placeholder="مبلغ هدف"
              className="h-11 rounded-xl"
              required
            />
            <label className="flex items-center gap-2 text-body-sm">
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
              <p className="text-caption text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-11 w-full rounded-xl"
              disabled={pending}
            >
              {pending ? "…" : "ایجاد صندوق"}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={Boolean(txPot)}
        onOpenChange={(open) => {
          if (!open) setTxPot(null);
        }}
      >
        <DrawerContent className="border-border/60 bg-[#eef5f4]">
          <DrawerHeader className="text-start">
            <DrawerTitle>{txPot?.title}</DrawerTitle>
            <DrawerDescription>
              موجودی:{" "}
              {txPot
                ? formatCurrency(txPot.balance, currency)
                : "—"}
            </DrawerDescription>
          </DrawerHeader>
          <form onSubmit={onTx} className="space-y-3 px-4 pb-8">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={txType === "DEPOSIT" ? "default" : "outline"}
                className="h-10 rounded-xl"
                onClick={() => setTxType("DEPOSIT")}
              >
                واریز
              </Button>
              <Button
                type="button"
                variant={txType === "WITHDRAWAL" ? "default" : "outline"}
                className="h-10 rounded-xl"
                onClick={() => setTxType("WITHDRAWAL")}
              >
                برداشت
              </Button>
            </div>
            <Select value={txMemberId} onValueChange={setTxMemberId}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="عضو" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.memberId} value={m.memberId}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              inputMode="numeric"
              placeholder="مبلغ"
              className="h-11 rounded-xl"
              required
            />
            <Input
              value={txNote}
              onChange={(e) => setTxNote(e.target.value)}
              placeholder="یادداشت (اختیاری)"
              className="h-11 rounded-xl"
            />
            <JalaliDatePicker value={txDate} onChange={setTxDate} />
            {error ? (
              <p className="text-caption text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-11 w-full rounded-xl"
              disabled={pending || !txMemberId}
            >
              {pending ? "…" : "ثبت"}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
