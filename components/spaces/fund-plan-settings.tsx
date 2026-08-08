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
import { cn } from "@/lib/utils";

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
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-caption font-bold text-foreground">پلن صندوق</h2>
        {hasPlan ? (
          <p className="text-[11px] tabular-nums text-muted-foreground">
            فعلی: {formatCurrency(initialShareAmount!, currency)} ·{" "}
            {initialPeriodCount!.toLocaleString("fa-IR")} دوره
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">هنوز تعریف نشده</p>
        )}
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">
        {hasPlan
          ? "کاهش دوره‌ها، نوبت‌های بعدی را حذف می‌کند."
          : "مبلغ یک سهم کامل (۱×) و تعداد دوره‌ها را مشخص کنید."}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0 space-y-1">
          <Label
            htmlFor="fundShareAmount"
            className="text-[11px] text-muted-foreground"
          >
            مبلغ سهم (۱×)
          </Label>
          <MoneyInput
            id="fundShareAmount"
            name="shareAmount"
            value={shareAmount}
            onValueChange={setShareAmount}
            disabled={disabled || pending}
            placeholder={`مثلاً ۱٬۰۰۰٬۰۰۰ ${unit}`}
            className="h-11 rounded-xl"
            required
          />
        </div>

        <div className="min-w-0 space-y-1">
          <Label
            htmlFor="fundPeriodCount"
            className="text-[11px] text-muted-foreground"
          >
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
            placeholder="۱۲"
            className="h-11 rounded-xl tabular-nums"
            required
          />
          <p className="text-[10px] text-muted-foreground">۲ تا ۶۰</p>
        </div>
      </div>

      {error ? (
        <p
          className="rounded-xl bg-destructive-soft px-3 py-2 text-caption text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}

      {disabled ? (
        <p className="text-caption text-muted-foreground">
          فقط مالک می‌تواند پلن را تغییر دهد.
        </p>
      ) : (
        <Button
          type="submit"
          className={cn(
            "h-11 w-full rounded-xl text-caption font-bold",
            "shadow-sm transition-[transform,opacity] active:scale-[0.98]",
          )}
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
  );
}
