"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { exportUserBackup, updateProfile } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCY_LABELS, type SpaceCurrency } from "@/lib/format";
import {
  applyDocumentTheme,
  type AppTheme,
  useAppSettingsStore,
} from "@/lib/stores/settings-store";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";

type AppSettingsPanelProps = {
  initialName: string;
  phone: string;
};

const THEME_OPTIONS: { value: AppTheme; label: string; hint: string }[] = [
  { value: "light", label: "روشن", hint: "مه و دفتر" },
  { value: "dark", label: "تیره", hint: "شب سفر" },
  { value: "system", label: "سیستم", hint: "خودکار" },
];

export function AppSettingsPanel({
  initialName,
  phone,
}: AppSettingsPanelProps) {
  const router = useRouter();
  const theme = useAppSettingsStore((s) => s.theme);
  const preferredCurrency = useAppSettingsStore((s) => s.preferredCurrency);
  const setTheme = useAppSettingsStore((s) => s.setTheme);
  const setPreferredCurrency = useAppSettingsStore(
    (s) => s.setPreferredCurrency,
  );

  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfile({ name });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("پروفایل ذخیره شد.");
      router.refresh();
    });
  }

  function onBackup() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const data = await exportUserBackup();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const stamp = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `superhesab-backup-${stamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage("فایل بک‌آپ دانلود شد.");
      } catch {
        setError("خروجی بک‌آپ ناموفق بود.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur-sm">
        <div>
          <h2 className="text-sm font-semibold text-foreground">ظاهر</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            تم سراسری اپلیکیشن
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setTheme(opt.value);
                applyDocumentTheme(opt.value);
              }}
              className={cn(
                "flex h-16 flex-col items-center justify-center rounded-xl border text-sm transition-all",
                theme === opt.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background/60 text-muted-foreground hover:bg-muted",
              )}
            >
              <span className="font-semibold">{opt.label}</span>
              <span
                className={cn(
                  "text-[11px]",
                  theme === opt.value ? "text-white/75" : "text-muted-foreground",
                )}
              >
                {opt.hint}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur-sm">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            واحد پول پیش‌فرض
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            برای فضاهای جدیدی که می‌سازید
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(CURRENCY_LABELS) as SpaceCurrency[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setPreferredCurrency(code)}
              className={cn(
                "h-12 rounded-xl border text-sm font-medium transition-all",
                preferredCurrency === code
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background/60 hover:bg-muted",
              )}
            >
              {CURRENCY_LABELS[code]}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur-sm">
        <div>
          <h2 className="text-sm font-semibold text-foreground">پروفایل</h2>
          <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">
            {phone}
          </p>
        </div>
        <form onSubmit={onSaveProfile} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="displayName">نام نمایشی</Label>
            <Input
              id="displayName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً علی"
              className="rounded-xl"
            />
          </div>
          <Button type="submit" className="h-12 w-full rounded-xl" disabled={pending}>
            {pending ? "در حال ذخیره…" : "ذخیره پروفایل"}
          </Button>
        </form>
      </section>

      <section className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur-sm">
        <div>
          <h2 className="text-sm font-semibold text-foreground">بک‌آپ</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            خروجی JSON از فضاها، هزینه‌ها، تسویه‌ها و چک‌لیست
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-xl"
          disabled={pending}
          onClick={onBackup}
        >
          دانلود بک‌آپ
        </Button>
      </section>

      {(message || error) && (
        <p
          className={cn(
            "text-sm",
            error ? "text-destructive" : "text-success",
          )}
          role="status"
        >
          {error ?? message}
        </p>
      )}

      <form action={logout}>
        <Button
          type="submit"
          variant="destructive"
          className="h-12 w-full rounded-xl"
        >
          خروج از حساب
        </Button>
      </form>
    </div>
  );
}
