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
    if (disabled) return;
    setError(null);

    const periods = Math.trunc(Number(periodCount.replace(/\D/g, ""))) || 0;

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
    <div className="space-y-4">
      <div>
        <h2 className="text-body-sm font-semibold text-foreground">
          پلن صندوق
        </h2>
        <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
          مبلغ یک سهم کامل (۱×) و تعداد دوره‌های نوبت. کاهش دوره‌ها، نوبت‌ها و
          پرداخت‌های بعد از آن را حذف می‌کند.
        </p>
      </div>

      {hasPlan ? (
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/55 px-3.5 py-3">
          <div>
            <p className="text-caption text-muted-foreground">سهم پایه فعلی</p>
            <p className="mt-0.5 text-body-sm font-semibold tabular-nums text-foreground">
              {formatCurrency(initialShareAmount!, currency)}
            </p>
          </div>
          <div>
            <p className="text-caption text-muted-foreground">تعداد دوره</p>
            <p className="mt-0.5 text-body-sm font-semibold tabular-nums text-foreground">
              {initialPeriodCount}
            </p>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-3.5">
        <div className="space-y-2">
          <Label htmlFor="fundShareAmount">مبلغ هر سهم (۱×)</Label>
          <MoneyInput
            id="fundShareAmount"
            value={shareAmount}
            onValueChange={setShareAmount}
            disabled={disabled || pending}
            placeholder={`مثلاً ۱٬۰۰۰٬۰۰۰ ${unit}`}
            className="h-12 rounded-xl"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fundPeriodCount">تعداد دوره</Label>
          <Input
            id="fundPeriodCount"
            value={periodCount}
            onChange={(e) => setPeriodCount(e.target.value)}
            inputMode="numeric"
            disabled={disabled || pending}
            placeholder="مثلاً ۱۲"
            className="h-12 rounded-xl tabular-nums"
            required
          />
          <p className="text-xs text-muted-foreground">حداقل ۲، حداکثر ۶۰ دوره.</p>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {disabled ? (
          <p className="text-sm text-muted-foreground">
            فقط مالک می‌تواند پلن صندوق را تغییر دهد.
          </p>
        ) : (
          <Button
            type="submit"
            className="h-12 w-full rounded-xl active:scale-[0.98]"
            disabled={pending}
          >
            {pending ? "…" : hasPlan ? "ذخیره پلن" : "ایجاد پلن و دوره‌ها"}
          </Button>
        )}
      </form>
    </div>
  );
}
