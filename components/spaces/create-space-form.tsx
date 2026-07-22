"use client";

import { useState } from "react";
import { createSpaceAndRedirect } from "@/app/actions/space";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCY_LABELS, type SpaceCurrency } from "@/lib/format";
import { useAppSettingsStore } from "@/lib/stores/settings-store";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  {
    value: "TRIP",
    label: "سفر و دورهمی",
    hint: "خرج گروهی، چک‌لیست، تسویه",
    mark: "سفر",
  },
  {
    value: "PARTNER",
    label: "حساب مشترک",
    hint: "شریک زندگی یا هم‌خانه",
    mark: "۲نفر",
  },
] as const;

export function CreateSpaceForm({
  error,
  compact = false,
}: {
  error?: string;
  compact?: boolean;
}) {
  const preferredCurrency = useAppSettingsStore((s) => s.preferredCurrency);
  const [type, setType] = useState<"TRIP" | "PARTNER">("TRIP");

  return (
    <form action={createSpaceAndRedirect} className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">نام فضا</p>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          placeholder="مثلاً سفر شمال"
          className="h-12 rounded-xl border-border/70 bg-white text-base"
          autoFocus={!compact}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">قالب</p>
        <input type="hidden" name="type" value={type} />
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => {
            const selected = type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-start transition-[border-color,background-color,transform] duration-150 ease-out active:scale-[0.98]",
                  selected
                    ? "border-primary bg-primary text-primary-foreground shadow-none"
                    : "border-border/70 bg-white text-foreground hover:border-primary/30",
                )}
              >
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                    selected ? "bg-white/15" : "bg-primary/10 text-primary",
                  )}
                >
                  {t.mark}
                </span>
                <span className="text-sm font-semibold leading-tight">
                  {t.label}
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-snug",
                    selected ? "text-white/70" : "text-muted-foreground",
                  )}
                >
                  {t.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <input type="hidden" name="currency" value={preferredCurrency} />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        واحد پول:{" "}
        <span className="font-medium text-foreground">
          {CURRENCY_LABELS[preferredCurrency as SpaceCurrency]}
        </span>
        {" · "}
        از تنظیمات قابل تغییر است
      </p>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="h-12 w-full rounded-xl text-base font-semibold"
      >
        ساخت فضا
      </Button>
    </form>
  );
}
