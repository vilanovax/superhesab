"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { upsertFundPlan } from "@/app/actions/fund";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { currencyLabel, type SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { useUiStore } from "@/lib/stores/ui-store";

type FundPlanSettingsProps = {
  spaceId: string;
  currency: SpaceCurrency;
  initialShareAmount: number | null;
  initialPeriodCount: number | null;
  disabled?: boolean;
};

export function FundPlanSettings({
  spaceId,
  currency,
  initialShareAmount,
  initialPeriodCount,
  disabled = false,
}: FundPlanSettingsProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [shareAmount, setShareAmount] = useState(initialShareAmount ?? 0);
  const [periodCount, setPeriodCount] = useState(
    initialPeriodCount != null ? String(initialPeriodCount) : "12",
  );
  const [error, setError] = useState<string | null>(null);

  const hasPlan = initialShareAmount != null && initialPeriodCount != null;
  const unit = currencyLabel(currency);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled || pending) return;
    setError(null);

    const periods = Math.trunc(Number(periodCount.replace(/\D/g, ""))) || 0;
    if (periods < 2 || periods > 60) {
      setError("تعداد دوره باید بین ۲ تا ۶۰ باشد.");
      return;
    }
    if (Math.trunc(shareAmount) <= 0) {
      setError("مبلغ سهم را وارد کنید.");
      return;
    }

    startTransition(async () => {
      const result = await upsertFundPlan({
        spaceId,
        shareAmount: Math.trunc(shareAmount) || 0,
        periodCount: periods,
      });
      if (!result.ok) {
        setError(result.error);
        showToast(result.error, "error");
        return;
      }
      showToast(hasPlan ? "پلن صندوق به‌روز شد" : "پلن صندوق ایجاد شد");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-pretty text-body-sm font-semibold text-foreground">
            پلن صندوق
          </h2>
          <p className="mt-0.5 text-caption leading-relaxed text-muted-foreground">
            {hasPlan
              ? "کاهش دوره‌ها، نوبت‌های بعدی را حذف می‌کند."
              : "مبلغ یک سهم کامل (۱×) و تعداد دوره‌ها."}
          </p>
        </div>
        {hasPlan ? (
          <div className="shrink-0 rounded-xl bg-muted/60 px-2.5 py-1.5 text-end">
            <p className="text-[0.65rem] font-medium text-muted-foreground">
              فعلی
            </p>
            <p className="text-caption font-semibold tabular-nums text-foreground">
              {formatCurrency(initialShareAmount!, currency)}
            </p>
            <p className="text-[0.65rem] tabular-nums text-muted-foreground">
              {initialPeriodCount} دوره
            </p>
          </div>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fundShareAmount" className="text-caption">
              مبلغ هر سهم (۱×)
            </Label>
            <MoneyInput
              id="fundShareAmount"
              name="shareAmount"
              value={shareAmount}
              onValueChange={setShareAmount}
              disabled={disabled || pending}
              placeholder={`مثلاً ۱٬۰۰۰٬۰۰۰ ${unit}…`}
              className="h-11 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fundPeriodCount" className="text-caption">
              تعداد دوره
            </Label>
            <Input
              id="fundPeriodCount"
              name="periodCount"
              autoComplete="off"
              inputMode="numeric"
              value={periodCount}
              onChange={(e) => setPeriodCount(e.target.value)}
              disabled={disabled || pending}
              placeholder="مثلاً ۱۲…"
              className="h-11 rounded-xl tabular-nums"
              required
            />
            <p className="text-[0.65rem] text-muted-foreground">۲ تا ۶۰</p>
          </div>
        </div>

        {error ? (
          <p
            className="rounded-lg bg-destructive-soft px-2.5 py-1.5 text-sm text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        ) : null}

        {disabled ? (
          <p className="text-sm text-muted-foreground">
            فقط مالک می‌تواند پلن را تغییر دهد.
          </p>
        ) : (
          <Button
            type="submit"
            className="h-11 w-full rounded-xl active:scale-[0.98]"
            disabled={pending}
          >
            {pending
              ? "در حال ذخیره…"
              : hasPlan
                ? "ذخیره پلن"
                : "ایجاد پلن و دوره‌ها"}
          </Button>
        )}
      </form>
    </div>
  );
}
