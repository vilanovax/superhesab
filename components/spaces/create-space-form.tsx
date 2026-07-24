"use client";

import { useState } from "react";
import { createSpaceAndRedirect } from "@/app/actions/space";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCY_LABELS, type SpaceCurrency } from "@/lib/format";
import { useAppSettingsStore } from "@/lib/stores/settings-store";
import { cn } from "@/lib/utils";
import type { SpaceType } from "@/types";

const TEMPLATES = [
  {
    value: "TRIP" as const,
    label: "سفر و دورهمی",
    hint: "خرج گروهی، چک‌لیست، تسویه",
    mark: "سفر",
  },
  {
    value: "PARTNER" as const,
    label: "حساب مشترک",
    hint: "دونفره با تسویه",
    mark: "۲نفر",
  },
  {
    value: "FAMILY" as const,
    label: "خانواده",
    hint: "لجر مشترک بدون بدهی",
    mark: "خانه",
  },
  {
    value: "PERSONAL" as const,
    label: "حسابداری شخصی",
    hint: "درآمد، هزینه، بودجه ماه",
    mark: "من",
  },
] as const;

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

  return (
    <form action={createSpaceAndRedirect} className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">نام فضا</p>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          placeholder={
            type === "PERSONAL"
              ? "مثلاً هزینه شخصی ۱۴۰۵"
              : type === "FAMILY"
                ? "مثلاً خانه ما"
                : type === "PARTNER"
                  ? "مثلاً حساب مشترک"
                  : "مثلاً سفر شمال"
          }
          className="h-12 rounded-xl border-border/70 bg-card text-base"
          autoFocus={!compact}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">قالب</p>
        <input type="hidden" name="type" value={type} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                    : "border-border/70 bg-card text-foreground hover:border-primary/30",
                )}
              >
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-micro font-bold",
                    selected ? "bg-on-hero/15" : "bg-primary/10 text-primary",
                  )}
                >
                  {t.mark}
                </span>
                <span className="text-sm font-semibold leading-tight">
                  {t.label}
                </span>
                <span
                  className={cn(
                    "text-caption leading-snug",
                    selected ? "text-on-hero/70" : "text-muted-foreground",
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
      <p className="text-caption leading-relaxed text-muted-foreground">
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
