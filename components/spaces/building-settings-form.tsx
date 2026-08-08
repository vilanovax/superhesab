"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { updateSpaceSettings } from "@/app/actions/space";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { formatJalaliYear } from "@/lib/building";
import {
  CURRENCY_LABELS,
  currencyLabel,
  type SpaceCurrency,
} from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

type BuildingSettingsFormProps = {
  spaceId: string;
  initialName: string;
  currency: SpaceCurrency;
  planYear: number;
  baseCharge: number;
  templateLabel: string;
  roleLabel: string;
  disabled?: boolean;
  error?: string;
};

function focusEl(el: HTMLElement | null) {
  queueMicrotask(() => el?.focus());
}

/**
 * Building space settings: identity + fiscal year + monthly base charge.
 */
export function BuildingSettingsForm({
  spaceId,
  initialName,
  currency: initialCurrency,
  planYear,
  baseCharge: initialBase,
  templateLabel,
  roleLabel,
  disabled = false,
  error: initialError,
}: BuildingSettingsFormProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [currency, setCurrency] = useState(initialCurrency);
  const [year, setYear] = useState(String(planYear));
  const [baseCharge, setBaseCharge] = useState(initialBase);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const nameRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const baseRef = useRef<HTMLInputElement>(null);

  const unitLabel = currencyLabel(currency);
  const yearNum = Math.trunc(Number(year.replace(/\D/g, ""))) || planYear;

  function bumpYear(delta: number) {
    if (disabled || pending) return;
    setYear(String(Math.max(1300, Math.min(1600, yearNum + delta))));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setError(null);

    if (name.trim().length < 2) {
      setError("نام ساختمان حداقل ۲ کاراکتر باشد.");
      focusEl(nameRef.current);
      return;
    }
    if (!year.replace(/\D/g, "")) {
      setError("سال مالی را وارد کنید.");
      focusEl(yearRef.current);
      return;
    }

    startTransition(async () => {
      const result = await updateSpaceSettings({
        spaceId,
        name: name.trim(),
        currency,
        roundUpToThousand: false,
        defaultPlanYear: yearNum,
        baseCharge: Math.trunc(baseCharge) || 0,
      });
      if (!result.ok) {
        setError(result.error);
        showToast(result.error, "error");
        focusEl(nameRef.current);
        return;
      }
      showToast("تنظیمات ذخیره شد");
      router.push(`/spaces/${spaceId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-micro font-semibold text-primary">
          {templateLabel}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-micro font-semibold text-foreground/70">
          نقش: {roleLabel}
        </span>
      </div>

      <fieldset className="space-y-3" disabled={disabled || pending}>
        <legend className="mb-0.5 text-caption font-bold text-foreground">
          مشخصات
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="building-name">نام ساختمان</Label>
          <Input
            ref={nameRef}
            id="building-name"
            name="name"
            autoComplete="organization"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="building-currency">واحد پول</Label>
          <select
            id="building-currency"
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as SpaceCurrency)}
            className="flex h-11 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60"
          >
            {(Object.keys(CURRENCY_LABELS) as SpaceCurrency[]).map((code) => (
              <option key={code} value={code}>
                {CURRENCY_LABELS[code]}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset
        className="space-y-3 rounded-2xl border border-border/50 bg-muted/25 p-3.5"
        disabled={disabled || pending}
      >
        <legend className="px-1 text-caption font-bold text-foreground">
          پلن شارژ
        </legend>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          سال پیش‌فرض تب شارژ و مبلغ پایه هر واحد (× ضریب).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="building-year">سال مالی</Label>
            <div className="flex items-center gap-1 rounded-xl border border-input bg-card p-0.5">
              <button
                type="button"
                onClick={() => bumpYear(-1)}
                aria-label="سال قبل"
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-body font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                ‹
              </button>
              <Input
                ref={yearRef}
                id="building-year"
                name="planYear"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, ""))}
                className="h-10 border-0 bg-transparent text-center tabular-nums shadow-none focus-visible:ring-0"
                required
              />
              <button
                type="button"
                onClick={() => bumpYear(1)}
                aria-label="سال بعد"
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-body font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                ›
              </button>
            </div>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {formatJalaliYear(yearNum)}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="building-base">پایه ماهانه</Label>
            <MoneyInput
              ref={baseRef}
              id="building-base"
              name="baseCharge"
              value={baseCharge}
              onValueChange={setBaseCharge}
              className="h-11 rounded-xl font-semibold"
            />
            <p className="text-[11px] text-muted-foreground">
              به ازای ضریب ۱ · {unitLabel}
            </p>
          </div>
        </div>
      </fieldset>

      <p className="rounded-xl border border-dashed border-border/60 bg-card/60 px-3 py-2.5 text-caption leading-relaxed text-muted-foreground">
        واحدها و لینک دعوت ساکنین را از تب{" "}
        <Link
          href={`/spaces/${spaceId}?tab=units`}
          className="font-semibold text-primary underline-offset-2 hover:underline"
        >
          واحدها
        </Link>{" "}
        مدیریت کنید.
      </p>

      {error ? (
        <p
          className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}

      {disabled ? (
        <p className="text-sm text-muted-foreground">
          فقط مالک فضا می‌تواند تنظیمات را ذخیره کند.
        </p>
      ) : (
        <Button
          type="submit"
          className={cn(
            "h-12 w-full rounded-xl text-body-sm font-bold",
            "shadow-sm transition-[transform,opacity] active:scale-[0.98]",
          )}
          disabled={pending}
        >
          {pending ? "در حال ذخیره…" : "ذخیره تنظیمات"}
        </Button>
      )}
    </form>
  );
}
