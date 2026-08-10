"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createSpaceAndRedirect } from "@/app/actions/space";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpaceTypeIcon } from "@/components/spaces/space-type-icon";
import { CURRENCY_LABELS, type SpaceCurrency } from "@/lib/format";
import { useAppSettingsStore } from "@/lib/stores/settings-store";
import { cn } from "@/lib/utils";
import type { SpaceType } from "@/types";

type TemplateOption = {
  value: SpaceType;
  label: string;
  hint: string;
  recommended?: boolean;
};

/** Flat order — Trip first (recommended), then the rest. Fits a 2-col grid. */
const TEMPLATES: TemplateOption[] = [
  {
    value: "TRIP",
    label: "سفر",
    hint: "خرج گروهی",
    recommended: true,
  },
  {
    value: "PARTNER",
    label: "مشترک",
    hint: "دونفره",
  },
  {
    value: "FAMILY",
    label: "خانه",
    hint: "خانواده",
  },
  {
    value: "FUND",
    label: "صندوق",
    hint: "نوبتی",
  },
  {
    value: "BUILDING",
    label: "ساختمان",
    hint: "شارژ",
  },
];

function placeholderFor(type: SpaceType): string {
  switch (type) {
    case "PERSONAL":
    case "FAMILY":
      return "مثلاً خانه ما…";
    case "FUND":
      return "مثلاً صندوق فامیل…";
    case "BUILDING":
      return "مثلاً برج آسمان…";
    case "PARTNER":
      return "مثلاً حساب من و …";
    default:
      return "مثلاً سفر شمال…";
  }
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function TemplateTile({
  option,
  selected,
  onSelect,
  wide = false,
}: {
  option: TemplateOption;
  selected: boolean;
  onSelect: () => void;
  /** Full-width row for the odd last item in a 2-col grid. */
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative rounded-2xl border text-start",
        "transition-[border-color,background-color,transform] duration-150 ease-out",
        "active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary/50 bg-primary/8"
          : "border-border/45 bg-card hover:border-primary/30",
        wide
          ? "col-span-2 flex min-h-0 flex-row items-center gap-2.5 px-3 py-2.5"
          : "flex min-h-17 flex-col items-start gap-1.5 px-2.5 py-2",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl transition-colors",
          wide ? "size-9" : "size-8",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-primary",
        )}
        aria-hidden
      >
        <SpaceTypeIcon type={option.value} className="size-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className="truncate text-body-sm font-semibold leading-tight text-foreground">
            {option.label}
          </span>
          {option.recommended ? (
            <span className="shrink-0 text-[9px] font-bold text-primary">
              پیشنهادی
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-micro leading-none text-muted-foreground">
          {option.hint}
        </span>
      </span>

      {/* Quieter unselected: no empty radio circle — check only when selected. */}
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full transition-opacity duration-150",
          !wide && "absolute inset-e-2.5 top-2.5",
          selected
            ? "bg-primary text-primary-foreground opacity-100"
            : "opacity-0",
        )}
        aria-hidden
      >
        <CheckIcon className="size-2.5" />
      </span>
    </button>
  );
}

function CreateSpaceSubmit({
  label,
  currencyLabel,
}: {
  label: string;
  currencyLabel: string;
}) {
  const { pending } = useFormStatus();
  const actionLabel = `ساخت «${label}»`;
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-label={pending ? "در حال ساخت…" : actionLabel}
      className="h-12 w-full flex-col gap-0.5 rounded-2xl py-1.5 text-sm font-semibold shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.7)] transition-transform active:scale-[0.985]"
    >
      {pending ? (
        "در حال ساخت…"
      ) : (
        <>
          <span className="leading-none">{actionLabel}</span>
          <span
            className="text-[10px] font-medium leading-none text-primary-foreground/70"
            aria-hidden
          >
            {currencyLabel}
          </span>
        </>
      )}
    </Button>
  );
}

export function CreateSpaceForm({
  error,
  compact = false,
  initialType = "TRIP",
  disabledTypes = [],
  onDirtyChange,
}: {
  error?: string;
  compact?: boolean;
  initialType?: SpaceType;
  /** Platform flags — e.g. BUILDING / FUND kill-switches. */
  disabledTypes?: SpaceType[];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const preferredCurrency = useAppSettingsStore((s) => s.preferredCurrency);
  const disabled = new Set(disabledTypes);
  const available = TEMPLATES.filter((t) => !disabled.has(t.value));
  const safeInitial =
    available.find((t) => t.value === initialType)?.value ??
    available.find((t) => t.recommended)?.value ??
    available[0]?.value ??
    "TRIP";
  const [type, setType] = useState<SpaceType>(safeInitial);
  const [name, setName] = useState("");
  const selected =
    available.find((t) => t.value === type) ?? available[0] ?? TEMPLATES[0];
  const nameRef = useRef<HTMLInputElement>(null);
  const trimmedName = name.trim();
  const submitLabel = trimmedName.length >= 2 ? trimmedName : selected.label;
  const draftDirty = trimmedName.length > 0 || type !== safeInitial;
  const currencyLabel =
    CURRENCY_LABELS[preferredCurrency as SpaceCurrency] ?? preferredCurrency;
  const oddLast = available.length % 2 === 1;

  useEffect(() => {
    onDirtyChange?.(draftDirty);
    return () => onDirtyChange?.(false);
  }, [draftDirty, onDirtyChange]);

  useEffect(() => {
    if (compact) return;
    if (typeof window === "undefined") return;
    // Desktop-only autofocus — avoid keyboard jump on mobile.
    if (!window.matchMedia("(pointer: fine)").matches) return;
    nameRef.current?.focus();
  }, [compact]);

  useEffect(() => {
    if (!error) return;
    queueMicrotask(() => nameRef.current?.focus());
  }, [error]);

  return (
    <form action={createSpaceAndRedirect} className="flex flex-col gap-2.5">
      <div className="space-y-1">
        <label
          htmlFor="name"
          className="text-caption font-medium text-muted-foreground"
        >
          نام دفتر
        </label>
        <Input
          ref={nameRef}
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="organization"
          required
          minLength={2}
          placeholder={placeholderFor(type)}
          className="h-11 rounded-xl border-border/60 bg-card text-base shadow-none focus-visible:border-primary/40"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <p
            id="space-template-label"
            className="text-caption font-medium text-muted-foreground"
          >
            نوع دفتر
          </p>
          <p className="text-micro text-muted-foreground/85">
            بعداً عوض نمی‌شود
          </p>
        </div>

        <input type="hidden" name="type" value={type} />

        <div
          role="radiogroup"
          aria-labelledby="space-template-label"
          className="grid grid-cols-2 gap-1.5"
        >
          {available.map((option, index) => (
            <TemplateTile
              key={option.value}
              option={option}
              selected={type === option.value}
              onSelect={() => setType(option.value)}
              wide={oddLast && index === available.length - 1}
            />
          ))}
        </div>
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

      <div className="shrink-0 pt-0.5">
        <input type="hidden" name="currency" value={preferredCurrency} />
        <CreateSpaceSubmit
          label={submitLabel}
          currencyLabel={currencyLabel}
        />
      </div>
    </form>
  );
}
