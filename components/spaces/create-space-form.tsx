"use client";

import { createSpaceAndRedirect } from "@/app/actions/space";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCY_LABELS } from "@/lib/format";
import { useAppSettingsStore } from "@/lib/stores/settings-store";

export function CreateSpaceForm({ error }: { error?: string }) {
  const preferredCurrency = useAppSettingsStore((s) => s.preferredCurrency);

  return (
    <form action={createSpaceAndRedirect} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="name">نام فضا</Label>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          placeholder="سفر شمال"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">نوع</Label>
        <select
          id="type"
          name="type"
          defaultValue="TRIP"
          className="flex h-12 w-full rounded-lg border border-input bg-card px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <option value="TRIP">سفر و دورهمی</option>
          <option value="PARTNER">حساب دونفره</option>
        </select>
      </div>
      <input type="hidden" name="currency" value={preferredCurrency} />
      <p className="text-xs text-muted-foreground">
        واحد پول پیش‌فرض:{" "}
        <span className="font-medium text-foreground">
          {CURRENCY_LABELS[preferredCurrency]}
        </span>{" "}
        (از تنظیمات اپ قابل تغییر است)
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full">
        ساخت فضا
      </Button>
    </form>
  );
}
