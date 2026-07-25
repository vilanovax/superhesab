"use client";

import { useState, type ReactNode } from "react";
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

function IconPersonal({ className }: { className?: string }) {
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
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.5c.8-3.4 3.3-5 6.5-5s5.7 1.6 6.5 5" />
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

const TEMPLATES: {
  value: SpaceType;
  label: string;
  hint: string;
  icon: (props: { className?: string }) => ReactNode;
}[] = [
  {
    value: "TRIP",
    label: "سفر",
    hint: "خرج گروهی",
    icon: IconTrip,
  },
  {
    value: "PARTNER",
    label: "مشترک",
    hint: "دونفره",
    icon: IconPartner,
  },
  {
    value: "FAMILY",
    label: "خانواده",
    hint: "لجر خانوار",
    icon: IconFamily,
  },
  {
    value: "FUND",
    label: "صندوق",
    hint: "نوبتی / قرض‌الحسنه",
    icon: IconFund,
  },
  {
    value: "BUILDING",
    label: "ساختمان",
    hint: "واحد و شارژ",
    icon: IconBuilding,
  },
  {
    value: "PERSONAL",
    label: "شخصی",
    hint: "بودجه و بدهی",
    icon: IconPersonal,
  },
];

function placeholderFor(type: SpaceType): string {
  switch (type) {
    case "PERSONAL":
      return "مثلاً هزینه شخصی ۱۴۰۵";
    case "FAMILY":
      return "مثلاً خانه ما";
    case "FUND":
      return "مثلاً صندوق فامیل";
    case "BUILDING":
      return "مثلاً برج آسمان";
    case "PARTNER":
      return "مثلاً حساب مشترک";
    default:
      return "مثلاً سفر شمال";
  }
}

export function CreateSpaceForm({
  error,
  compact = false,
  initialType = "TRIP",
}: {
  error?: string;
  compact?: boolean;
  initialType?: SpaceType;
}) {
  const preferredCurrency = useAppSettingsStore((s) => s.preferredCurrency);
  const [type, setType] = useState<SpaceType>(initialType);
  const selected = TEMPLATES.find((t) => t.value === type) ?? TEMPLATES[0];

  return (
    <form action={createSpaceAndRedirect} className="flex flex-col gap-3.5">
      <div className="space-y-1.5">
        <label
          htmlFor="name"
          className="text-caption font-medium text-muted-foreground"
        >
          نام فضا
        </label>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          placeholder={placeholderFor(type)}
          className="h-11 rounded-2xl border-border/60 bg-card text-base shadow-none"
          autoFocus={!compact}
        />
      </div>

      <div className="space-y-2">
        <p className="text-caption font-medium text-muted-foreground">قالب</p>
        <input type="hidden" name="type" value={type} />
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => {
            const on = type === t.value;
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                aria-pressed={on}
                className={cn(
                  "group flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-start transition-[transform,background-color,border-color,box-shadow,color] duration-150 ease-out active:scale-[0.97]",
                  t.value === "PERSONAL" && "col-span-2",
                  on
                    ? "border-primary bg-primary text-primary-foreground shadow-[0_8px_20px_-12px_hsl(var(--primary)/0.55)]"
                    : "border-border/50 bg-card/90 text-foreground hover:border-primary/30 hover:bg-card",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                    on
                      ? "bg-on-hero/15 text-on-hero"
                      : "bg-muted/80 text-primary group-hover:bg-primary/10",
                  )}
                >
                  <Icon className="size-[1.125rem]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-body-sm font-semibold leading-tight tracking-tight">
                    {t.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block truncate text-micro leading-none",
                      on ? "text-on-hero/65" : "text-muted-foreground",
                    )}
                  >
                    {t.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <input type="hidden" name="currency" value={preferredCurrency} />
      <p className="-mt-0.5 text-micro leading-relaxed text-muted-foreground">
        واحد پول:{" "}
        <span className="font-medium text-foreground">
          {CURRENCY_LABELS[preferredCurrency as SpaceCurrency]}
        </span>
      </p>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="h-11 w-full rounded-2xl text-base font-semibold"
      >
        ساخت «{selected.label}»
      </Button>
    </form>
  );
}
