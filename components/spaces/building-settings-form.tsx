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
 * Single form for building space: identity + fiscal year + monthly base charge.
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
    <form onSubmit={onSubmit} className="space-y-4">
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
          disabled={disabled || pending}
          className="h-11 rounded-xl"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="building-currency">واحد پول</Label>
        <select
          id="building-currency"
          name="currency"
          value={currency}
          disabled={disabled || pending}
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

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <Label htmlFor="building-year">سال مالی</Label>
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
            disabled={disabled || pending}
            className="h-11 rounded-xl tabular-nums"
            required
          />
          <p className="text-micro text-muted-foreground">
            پیش‌فرض تب شارژ ({formatJalaliYear(yearNum)})
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
            disabled={disabled || pending}
            className="h-11 rounded-xl font-semibold"
          />
          <p className="text-micro text-muted-foreground">
            × ضریب واحد · {unitLabel}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-muted/70 px-3 py-2.5 text-xs text-muted-foreground">
        قالب:{" "}
        <span className="font-medium text-foreground">{templateLabel}</span>
        {" · "}
        نقش شما:{" "}
        <span className="font-medium text-foreground">{roleLabel}</span>
      </div>

      <p className="text-caption text-muted-foreground">
        واحدها را از تب{" "}
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
          className="text-sm text-destructive"
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
          className="h-12 w-full rounded-xl"
          disabled={pending}
        >
          {pending ? "در حال ذخیره…" : "ذخیره تنظیمات"}
        </Button>
      )}
    </form>
  );
}
