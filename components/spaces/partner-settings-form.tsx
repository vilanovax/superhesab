"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { updateSpaceSettings } from "@/app/actions/space";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CURRENCY_LABELS,
  type SpaceCurrency,
} from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

type PartnerSettingsFormProps = {
  spaceId: string;
  initialName: string;
  currency: SpaceCurrency;
  roundUpToThousand: boolean;
  roleLabel: string;
  disabled?: boolean;
  error?: string;
};

function focusEl(el: HTMLElement | null) {
  queueMicrotask(() => el?.focus());
}

/**
 * Partner (حساب مشترک) settings — denser than trip; no chip clutter.
 */
export function PartnerSettingsForm({
  spaceId,
  initialName,
  currency: initialCurrency,
  roundUpToThousand: initialRoundUp,
  roleLabel,
  disabled = false,
  error: initialError,
}: PartnerSettingsFormProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [currency, setCurrency] = useState(initialCurrency);
  const [roundUp, setRoundUp] = useState(initialRoundUp);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const nameRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setError(null);

    if (name.trim().length < 2) {
      setError("نام حداقل ۲ کاراکتر باشد.");
      focusEl(nameRef.current);
      return;
    }

    startTransition(async () => {
      const result = await updateSpaceSettings({
        spaceId,
        name: name.trim(),
        currency,
        roundUpToThousand: roundUp,
      });
      if (!result.ok) {
        setError(result.error);
        showToast(result.error, "error");
        focusEl(nameRef.current);
        return;
      }
      showToast("تنظیمات ذخیره شد");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-caption font-bold text-foreground">عمومی</h2>
        <p className="text-[11px] text-muted-foreground">نقش شما: {roleLabel}</p>
      </div>

      <div className="space-y-2.5" aria-disabled={disabled || pending}>
        <div className="space-y-1">
          <Label htmlFor="partner-settings-name" className="text-[11px] text-muted-foreground">
            نام حساب
          </Label>
          <Input
            ref={nameRef}
            id="partner-settings-name"
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

        <div className="space-y-1">
          <Label
            htmlFor="partner-settings-currency"
            className="text-[11px] text-muted-foreground"
          >
            واحد پول
          </Label>
          <select
            id="partner-settings-currency"
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as SpaceCurrency)}
            disabled={disabled || pending}
            className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60"
          >
            {(Object.keys(CURRENCY_LABELS) as SpaceCurrency[]).map((code) => (
              <option key={code} value={code}>
                {CURRENCY_LABELS[code]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label
        className={cn(
          "flex cursor-pointer items-center gap-2.5 rounded-xl bg-muted/35 px-3 py-2.5",
          (disabled || pending) && "cursor-not-allowed opacity-60",
        )}
      >
        <input
          type="checkbox"
          checked={roundUp}
          onChange={(e) => setRoundUp(e.target.checked)}
          disabled={disabled || pending}
          className="size-4.5 shrink-0 rounded border border-input accent-primary"
        />
        <span className="min-w-0">
          <span className="block text-caption font-semibold text-foreground">
            رند به هزار در تراز
          </span>
          <span className="block text-[11px] leading-snug text-muted-foreground">
            پیشنهاد تسویه به نزدیک‌ترین هزار
          </span>
        </span>
      </label>

      {error ? (
        <p
          className="rounded-xl bg-destructive/10 px-3 py-2 text-caption text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}

      {disabled ? (
        <p className="text-caption text-muted-foreground">
          فقط مالک می‌تواند تنظیمات را ذخیره کند.
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
          {pending ? "در حال ذخیره…" : "ذخیره تغییرات"}
        </Button>
      )}
    </form>
  );
}
