"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { createSpaceAndRedirect } from "@/app/actions/space";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCY_LABELS, type SpaceCurrency } from "@/lib/format";
import { useAppSettingsStore } from "@/lib/stores/settings-store";
import { cn } from "@/lib/utils";
import type { SpaceType } from "@/types";

function IconTrip({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 8V5.5A1.5 1.5 0 0 1 11.5 4h1A1.5 1.5 0 0 1 14 5.5V8" />
      <rect x="6" y="8" width="12" height="12" rx="2" />
      <path d="M6 13h12" />
    </svg>
  );
}

function IconPartner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9" cy="8" r="3.25" />
      <circle cx="16.5" cy="9.5" r="2.5" />
      <path d="M3.5 19.5c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M14 14.2c1.7-.3 3.5.4 4.5 2.8" />
    </svg>
  );
}

function IconFamily({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6.5 9.5V20h11V9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 20h16" />
      <path d="M6 20V6.5A1.5 1.5 0 0 1 7.5 5h5A1.5 1.5 0 0 1 14 6.5V20" />
      <path d="M14 10h3.5A1.5 1.5 0 0 1 19 11.5V20" />
      <path d="M8.5 9h2M8.5 12.5h2M8.5 16h2" />
    </svg>
  );
}

function IconFund({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10.5c.5-1 1.5-1.5 2.5-1.5s2 .6 2 1.75-1 1.5-2.5 1.75-2.5.75-2.5 1.75 1 1.75 2.5 1.75 2-.5 2.5-1.5" />
    </svg>
  );
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

type TemplateOption = {
  value: SpaceType;
  label: string;
  hint: string;
  icon: (props: { className?: string }) => ReactNode;
};

const EVERYDAY: TemplateOption[] = [
  {
    value: "FAMILY",
    label: "خانه",
    hint: "شخصی یا خانواده",
    icon: IconFamily,
  },
  {
    value: "PARTNER",
    label: "مشترک",
    hint: "دونفره · تسویه",
    icon: IconPartner,
  },
];

const GROUP: TemplateOption[] = [
  {
    value: "TRIP",
    label: "سفر",
    hint: "خرج گروهی",
    icon: IconTrip,
  },
  {
    value: "FUND",
    label: "صندوق",
    hint: "نوبتی",
    icon: IconFund,
  },
  {
    value: "BUILDING",
    label: "ساختمان",
    hint: "واحد و شارژ",
    icon: IconBuilding,
  },
];

const ALL_TEMPLATES = [...EVERYDAY, ...GROUP];

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

function TemplateCard({
  option,
  selected,
  onSelect,
}: {
  option: TemplateOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative flex w-full flex-col items-start gap-2.5 rounded-2xl border px-3 py-3 text-start",
        "transition-[transform,background-color,border-color,box-shadow,color] duration-150 ease-out",
        "active:scale-[0.98]",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.65)]"
          : "border-border/55 bg-card text-foreground hover:border-primary/35 hover:bg-card",
      )}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-xl transition-colors",
          selected
            ? "bg-on-hero/15 text-on-hero"
            : "bg-muted/80 text-primary",
        )}
      >
        <Icon className="size-[1.125rem]" />
      </span>
      <span className="min-w-0 w-full pe-5">
        <span className="block text-body-sm font-semibold leading-tight tracking-tight">
          {option.label}
        </span>
        <span
          className={cn(
            "mt-1 block text-micro leading-snug",
            selected ? "text-on-hero/70" : "text-muted-foreground",
          )}
        >
          {option.hint}
        </span>
      </span>
      <span
        className={cn(
          "absolute end-2.5 top-2.5 flex size-5 items-center justify-center rounded-full transition-[transform,opacity,background-color,color] duration-150",
          selected
            ? "scale-100 bg-on-hero/20 text-on-hero opacity-100"
            : "scale-90 opacity-0",
        )}
        aria-hidden
      >
        <CheckIcon className="size-3" />
      </span>
    </button>
  );
}

function CreateSpaceSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-2xl text-base font-semibold shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.7)] transition-transform active:scale-[0.985]"
    >
      {pending ? "در حال ساخت…" : `ساخت «${label}»`}
    </Button>
  );
}

export function CreateSpaceForm({
  error,
  compact = false,
  initialType = "TRIP",
  disabledTypes = [],
}: {
  error?: string;
  compact?: boolean;
  initialType?: SpaceType;
  /** Platform flags — e.g. BUILDING / FUND kill-switches. */
  disabledTypes?: SpaceType[];
}) {
  const preferredCurrency = useAppSettingsStore((s) => s.preferredCurrency);
  const disabled = new Set(disabledTypes);
  const everyday = EVERYDAY.filter((t) => !disabled.has(t.value));
  const group = GROUP.filter((t) => !disabled.has(t.value));
  const available = [...everyday, ...group];
  const safeInitial =
    available.find((t) => t.value === initialType)?.value ??
    available[0]?.value ??
    "TRIP";
  const [type, setType] = useState<SpaceType>(safeInitial);
  const selected =
    available.find((t) => t.value === type) ?? available[0] ?? ALL_TEMPLATES[0];
  const nameRef = useRef<HTMLInputElement>(null);

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
    <form
      action={createSpaceAndRedirect}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pb-2">
        <div className="space-y-1.5">
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
            autoComplete="organization"
            required
            minLength={2}
            placeholder={placeholderFor(type)}
            className="h-12 rounded-2xl border-border/60 bg-card text-base shadow-none focus-visible:border-primary/40"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <p
              id="space-template-label"
              className="text-caption font-medium text-muted-foreground"
            >
              قالب
            </p>
            <p className="text-micro text-muted-foreground/80">
              بعداً عوض نمی‌شود
            </p>
          </div>

          <input type="hidden" name="type" value={type} />

          <div
            role="radiogroup"
            aria-labelledby="space-template-label"
            className="space-y-2"
          >
            <div className="space-y-2">
              <p className="text-micro font-semibold tracking-wide text-muted-foreground/70">
                روزمره
              </p>
              <div className="grid grid-cols-2 gap-2">
                {everyday.map((t) => (
                  <TemplateCard
                    key={t.value}
                    option={t}
                    selected={type === t.value}
                    onSelect={() => setType(t.value)}
                  />
                ))}
              </div>
            </div>

            {group.length > 0 ? (
              <div className="space-y-2">
                <p className="text-micro font-semibold tracking-wide text-muted-foreground/70">
                  گروهی
                </p>
                <div
                  className={cn(
                    "grid gap-2",
                    group.length >= 3 ? "grid-cols-3" : "grid-cols-2",
                  )}
                >
                  {group.map((t) => (
                    <TemplateCard
                      key={t.value}
                      option={t}
                      selected={type === t.value}
                      onSelect={() => setType(t.value)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {error ? (
          <p
            className="text-sm text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border/40 bg-background/95 pt-3 backdrop-blur-sm">
        <input type="hidden" name="currency" value={preferredCurrency} />
        <p className="mb-2 text-center text-micro text-muted-foreground">
          واحد پول:{" "}
          <span className="font-medium text-foreground">
            {CURRENCY_LABELS[preferredCurrency as SpaceCurrency]}
          </span>
        </p>
        <CreateSpaceSubmit label={selected.label} />
      </div>
    </form>
  );
}
