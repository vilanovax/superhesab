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

type TripSettingsFormProps = {
  spaceId: string;
  initialName: string;
  currency: SpaceCurrency;
  roundUpToThousand: boolean;
  templateLabel: string;
  roleLabel: string;
  /** TRIP vs PARTNER copy tweaks. */
  spaceKind?: "trip" | "partner";
  disabled?: boolean;
  error?: string;
};

function focusEl(el: HTMLElement | null) {
  queueMicrotask(() => el?.focus());
}

/**
 * Trip / partner space settings — identity, currency, settlement rounding.
 */
export function TripSettingsForm({
  spaceId,
  initialName,
  currency: initialCurrency,
  roundUpToThousand: initialRoundUp,
  templateLabel,
  roleLabel,
  spaceKind = "trip",
  disabled = false,
  error: initialError,
}: TripSettingsFormProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [currency, setCurrency] = useState(initialCurrency);
  const [roundUp, setRoundUp] = useState(initialRoundUp);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const nameRef = useRef<HTMLInputElement>(null);

  const nameLabel = spaceKind === "partner" ? "نام حساب" : "نام سفر";

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
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-micro font-semibold text-primary">
          {templateLabel}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-micro font-semibold text-foreground/70">
          {roleLabel}
        </span>
      </div>

      <div className="space-y-3" aria-disabled={disabled || pending}>
        <div className="space-y-1.5">
          <Label htmlFor="trip-settings-name" className="text-caption">
            {nameLabel}
          </Label>
          <Input
            ref={nameRef}
            id="trip-settings-name"
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
          <Label htmlFor="trip-settings-currency" className="text-caption">
            واحد پول
          </Label>
          <select
            id="trip-settings-currency"
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as SpaceCurrency)}
            disabled={disabled || pending}
            className="flex h-11 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60"
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
          "flex cursor-pointer items-start gap-3 rounded-xl border border-border/45 bg-muted/20 px-3 py-2.5",
          (disabled || pending) && "cursor-not-allowed opacity-60",
        )}
      >
        <input
          type="checkbox"
          checked={roundUp}
          onChange={(e) => setRoundUp(e.target.checked)}
          disabled={disabled || pending}
          className="mt-0.5 size-5 shrink-0 rounded-md border border-input accent-primary"
        />
        <span className="min-w-0 space-y-0.5">
          <span className="block text-caption font-semibold text-foreground">
            رند کردن به هزار
          </span>
          <span className="block text-[11px] leading-relaxed text-muted-foreground">
            در تراز و پیشنهاد تسویه به نزدیک‌ترین هزار رند می‌شود.
          </span>
        </span>
      </label>

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
          {pending ? "در حال ذخیره…" : "ذخیره"}
        </Button>
      )}
    </form>
  );
}
