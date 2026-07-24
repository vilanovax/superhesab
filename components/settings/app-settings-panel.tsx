"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { exportUserBackup, updateProfile } from "@/app/actions/settings";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCY_LABELS, type SpaceCurrency } from "@/lib/format";
import {
  ACCENT_OPTIONS,
  applyDocumentAccent,
  applyDocumentTheme,
  type AppTheme,
  useAppSettingsStore,
} from "@/lib/stores/settings-store";
import { cn } from "@/lib/utils";

type AppSettingsPanelProps = {
  initialName: string;
  phone: string;
};

type SettingsTab = "look" | "account" | "data";

const TABS: {
  id: SettingsTab;
  label: string;
  hint: string;
}[] = [
  { id: "look", label: "ظاهر", hint: "تم و رنگ" },
  { id: "account", label: "حساب", hint: "پول و نام" },
  { id: "data", label: "داده", hint: "بک‌آپ" },
];

const THEME_OPTIONS: {
  value: AppTheme;
  label: string;
  hint: string;
  swatch: string;
}[] = [
  {
    value: "light",
    label: "روشن",
    hint: "مه و دفتر",
    swatch: "linear-gradient(145deg,#e8eef1 0%,#ffffff 55%,#d4e8e5 100%)",
  },
  {
    value: "dark",
    label: "تیره",
    hint: "شب سفر",
    swatch: "linear-gradient(145deg,#0f1719 0%,#162024 55%,#1a3530 100%)",
  },
  {
    value: "system",
    label: "سیستم",
    hint: "خودکار",
    swatch:
      "linear-gradient(90deg,#e8eef1 0%,#e8eef1 49%,#0f1719 51%,#0f1719 100%)",
  },
];

export function AppSettingsPanel({
  initialName,
  phone,
}: AppSettingsPanelProps) {
  const router = useRouter();
  const theme = useAppSettingsStore((s) => s.theme);
  const accent = useAppSettingsStore((s) => s.accent) ?? "teal";
  const preferredCurrency = useAppSettingsStore((s) => s.preferredCurrency);
  const setTheme = useAppSettingsStore((s) => s.setTheme);
  const setAccent = useAppSettingsStore((s) => s.setAccent);
  const setPreferredCurrency = useAppSettingsStore(
    (s) => s.setPreferredCurrency,
  );

  const [tab, setTab] = useState<SettingsTab>("look");
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeAccent =
    ACCENT_OPTIONS.find((o) => o.value === accent) ?? ACCENT_OPTIONS[0];

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
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <nav
        className="sticky top-0 z-20 rounded-2xl border border-border/55 bg-card/90 p-1 shadow-md backdrop-blur-xl"
        aria-label="بخش‌های تنظیمات"
      >
        <div className="grid grid-cols-3 gap-1" role="tablist">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(item.id);
                  setMessage(null);
                  setError(null);
                }}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-xl px-1 py-2 transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <span className="text-body-sm font-semibold leading-none">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "mt-1 text-micro leading-none",
                    active ? "text-primary-foreground/75" : "opacity-70",
                  )}
                >
                  {item.hint}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div
        key={tab}
        className="animate-fade-up min-h-0 flex-1 space-y-3 pb-2"
        role="tabpanel"
      >
        {tab === "look" ? (
          <section className="overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm">
            <div className="relative overflow-hidden border-b border-border/45 px-4 py-3.5">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-90"
                style={{
                  background: `linear-gradient(120deg, ${activeAccent.swatch} 0%, color-mix(in srgb, ${activeAccent.swatch} 55%, white) 100%)`,
                }}
              />
              <div className="relative flex items-center justify-between gap-3 text-on-hero">
                <div className="min-w-0">
                  <p className="text-caption text-on-hero/70">پیش‌نمایش زنده</p>
                  <p className="mt-0.5 text-body-sm font-semibold">
                    {activeAccent.label} ·{" "}
                    {THEME_OPTIONS.find((t) => t.value === theme)?.label}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-on-hero/15 px-3 py-1.5 text-caption font-semibold backdrop-blur-sm">
                  دکمه نمونه
                </span>
              </div>
            </div>

            <div className="space-y-5 px-4 py-4">
              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-caption font-semibold text-foreground">
                    حالت نمایش
                  </p>
                  <p className="text-micro text-muted-foreground">سراسری</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_OPTIONS.map((opt) => {
                    const selected = theme === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setTheme(opt.value);
                          applyDocumentTheme(opt.value);
                        }}
                        className={cn(
                          "group flex flex-col overflow-hidden rounded-2xl border text-start transition-all",
                          selected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/25"
                            : "border-border/60 bg-background/60 hover:border-border hover:bg-muted/40",
                        )}
                      >
                        <span
                          className="h-10 w-full border-b border-border/30"
                          style={{ background: opt.swatch }}
                          aria-hidden
                        />
                        <span className="px-2.5 py-2">
                          <span className="block text-body-sm font-semibold text-foreground">
                            {opt.label}
                          </span>
                          <span className="mt-0.5 block text-micro text-muted-foreground">
                            {opt.hint}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-caption font-semibold text-foreground">
                    رنگ برند
                  </p>
                  <p className="text-micro text-muted-foreground">
                    دکمه‌ها و هدر
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ACCENT_OPTIONS.map((opt) => {
                    const selected = accent === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setAccent(opt.value);
                          applyDocumentAccent(opt.value);
                        }}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-start transition-all",
                          selected
                            ? "border-primary bg-primary/8 ring-2 ring-primary/30"
                            : "border-border/60 bg-background/50 hover:bg-muted/50",
                        )}
                      >
                        <span
                          className="size-9 shrink-0 rounded-full border border-black/10 shadow-sm"
                          style={{ backgroundColor: opt.swatch }}
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-body-sm font-semibold text-foreground">
                            {opt.label}
                          </span>
                          <span className="block text-micro text-muted-foreground">
                            {opt.hint}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {tab === "account" ? (
          <section className="overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm">
            <div className="space-y-5 px-4 py-4">
              <div className="space-y-2.5">
                <div>
                  <h2 className="text-body-sm font-semibold text-foreground">
                    واحد پول پیش‌فرض
                  </h2>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    فقط برای فضاهای جدیدی که می‌سازید
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {(Object.keys(CURRENCY_LABELS) as SpaceCurrency[]).map(
                    (code) => {
                      const selected = preferredCurrency === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setPreferredCurrency(code)}
                          className={cn(
                            "rounded-xl px-2 py-2.5 text-body-sm font-semibold transition-all",
                            selected
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted/65 text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {CURRENCY_LABELS[code]}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="h-px bg-border/50" />

              <form onSubmit={onSaveProfile} className="space-y-3">
                <div>
                  <h2 className="text-body-sm font-semibold text-foreground">
                    پروفایل
                  </h2>
                  <p
                    className="mt-0.5 text-caption tabular-nums text-muted-foreground"
                    dir="ltr"
                  >
                    {phone}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-caption">
                    نام نمایشی
                  </Label>
                  <Input
                    id="displayName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثلاً علی"
                    className="h-11 rounded-xl"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl"
                  disabled={pending}
                >
                  {pending ? "در حال ذخیره…" : "ذخیره پروفایل"}
                </Button>
              </form>
            </div>
          </section>
        ) : null}

        {tab === "data" ? (
          <div className="space-y-3">
            <section className="overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm">
              <div className="px-4 py-4">
                <h2 className="text-body-sm font-semibold text-foreground">
                  بک‌آپ
                </h2>
                <p className="mt-0.5 text-caption text-muted-foreground">
                  خروجی JSON از فضاها، هزینه‌ها، تسویه‌ها و چک‌لیست
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-11 w-full rounded-xl"
                  disabled={pending}
                  onClick={onBackup}
                >
                  دانلود بک‌آپ
                </Button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-destructive/20 bg-card shadow-sm">
              <div className="px-4 py-4">
                <h2 className="text-body-sm font-semibold text-destructive">
                  خروج از حساب
                </h2>
                <p className="mt-0.5 text-caption text-muted-foreground">
                  نشست این دستگاه پاک می‌شود
                </p>
                <form action={logout} className="mt-3">
                  <Button
                    type="submit"
                    variant="destructive"
                    className="h-11 w-full rounded-xl"
                  >
                    خروج
                  </Button>
                </form>
              </div>
            </section>
          </div>
        ) : null}

        {(message || error) && (
          <p
            className={cn(
              "rounded-xl px-3 py-2.5 text-body-sm",
              error
                ? "bg-destructive-soft text-destructive"
                : "bg-success-soft text-success",
            )}
            role="status"
          >
            {error ?? message}
          </p>
        )}
      </div>
    </div>
  );
}
