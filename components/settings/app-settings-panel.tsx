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
  DEFAULT_ACCENT,
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

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "look", label: "ظاهر" },
  { id: "account", label: "حساب" },
  { id: "data", label: "داده" },
];

const THEME_OPTIONS: {
  value: AppTheme;
  label: string;
  swatch: string;
}[] = [
  {
    value: "light",
    label: "روشن",
    swatch: "linear-gradient(145deg,#e8eef1,#ffffff)",
  },
  {
    value: "dark",
    label: "تیره",
    swatch: "linear-gradient(145deg,#0f1719,#1a2a36)",
  },
  {
    value: "system",
    label: "سیستم",
    swatch:
      "linear-gradient(90deg,#e8eef1 0%,#e8eef1 48%,#0f1719 52%,#0f1719 100%)",
  },
];

export function AppSettingsPanel({
  initialName,
  phone,
}: AppSettingsPanelProps) {
  const router = useRouter();
  const theme = useAppSettingsStore((s) => s.theme);
  const accent = useAppSettingsStore((s) => s.accent) ?? DEFAULT_ACCENT;
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
    ACCENT_OPTIONS.find((o) => o.value === accent) ?? ACCENT_OPTIONS[0]!;

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
    <div className="flex min-h-0 flex-1 flex-col gap-3.5">
      <nav
        className="grid grid-cols-3 gap-1 rounded-2xl bg-muted/70 p-1"
        aria-label="بخش‌های تنظیمات"
        role="tablist"
      >
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
                "h-10 rounded-xl text-body-sm font-semibold transition-colors",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div
        key={tab}
        className="animate-fade-up min-h-0 flex-1 space-y-3 pb-2"
        role="tabpanel"
      >
        {tab === "look" ? (
          <section className="space-y-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-primary px-3.5 py-3 text-primary-foreground">
              <div className="min-w-0">
                <p className="text-micro text-primary-foreground/70">
                  پیش‌نمایش
                </p>
                <p className="truncate text-body-sm font-semibold">
                  {activeAccent.label} ·{" "}
                  {THEME_OPTIONS.find((t) => t.value === theme)?.label}
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-on-hero/15 px-2.5 py-1 text-caption font-semibold">
                نمونه
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-caption font-semibold text-foreground">
                حالت نمایش
              </p>
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
                        "overflow-hidden rounded-2xl border text-start transition-all",
                        selected
                          ? "border-primary ring-2 ring-primary/25"
                          : "border-border/55 hover:border-border",
                      )}
                    >
                      <span
                        className="block h-9 w-full"
                        style={{ background: opt.swatch }}
                        aria-hidden
                      />
                      <span className="block px-2 py-1.5 text-center text-caption font-semibold text-foreground">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-caption font-semibold text-foreground">
                رنگ برند
              </p>
              <div className="grid grid-cols-4 gap-2">
                {ACCENT_OPTIONS.map((opt) => {
                  const selected = accent === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      title={`${opt.label} — ${opt.hint}`}
                      aria-pressed={selected}
                      onClick={() => {
                        setAccent(opt.value);
                        applyDocumentAccent(opt.value);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-2xl border px-1.5 py-2.5 transition-all",
                        selected
                          ? "border-primary bg-primary/8 ring-2 ring-primary/30"
                          : "border-border/50 hover:bg-muted/40",
                      )}
                    >
                      <span
                        className={cn(
                          "size-8 rounded-full border border-black/10 shadow-sm",
                          selected && "ring-2 ring-offset-2 ring-offset-card ring-primary/40",
                        )}
                        style={{ backgroundColor: opt.swatch }}
                        aria-hidden
                      />
                      <span className="text-center text-micro font-semibold leading-tight text-foreground">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {tab === "account" ? (
          <section className="space-y-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
            <div className="space-y-2">
              <div>
                <h2 className="text-body-sm font-semibold text-foreground">
                  واحد پول پیش‌فرض
                </h2>
                <p className="mt-0.5 text-caption text-muted-foreground">
                  برای فضاهای جدید
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CURRENCY_LABELS) as SpaceCurrency[]).map(
                  (code) => {
                    const selected = preferredCurrency === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setPreferredCurrency(code)}
                        className={cn(
                          "rounded-xl px-3 py-2 text-body-sm font-semibold transition-all",
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/70 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {CURRENCY_LABELS[code]}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="h-px bg-border/45" />

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
          </section>
        ) : null}

        {tab === "data" ? (
          <div className="space-y-3">
            <section className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
              <h2 className="text-body-sm font-semibold text-foreground">
                بک‌آپ
              </h2>
              <p className="mt-0.5 text-caption text-muted-foreground">
                خروجی JSON از فضاها و هزینه‌ها
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
            </section>

            <section className="rounded-2xl border border-destructive/20 bg-card p-4 shadow-sm">
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
            </section>
          </div>
        ) : null}

        {message || error ? (
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
        ) : null}
      </div>
    </div>
  );
}
