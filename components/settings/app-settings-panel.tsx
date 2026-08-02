"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/settings";
import { logout } from "@/app/actions/auth";
import { AccountBackupPanel } from "@/components/settings/backup-panels";
import { PwaInstallCard } from "@/components/pwa/pwa-runtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_VERSION } from "@/lib/app-version";
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

const TABS: { id: SettingsTab; label: string; hint: string }[] = [
  { id: "look", label: "ظاهر", hint: "تم و رنگ" },
  { id: "account", label: "حساب", hint: "نام و ارز" },
  { id: "data", label: "داده", hint: "بک‌آپ و خروج" },
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
  const [currencySaved, setCurrencySaved] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const activeAccent =
    ACCENT_OPTIONS.find((o) => o.value === accent) ?? ACCENT_OPTIONS[0]!;
  const themeLabel =
    THEME_OPTIONS.find((t) => t.value === theme)?.label ?? "روشن";
  const profileDirty = name.trim() !== (initialName ?? "").trim();

  function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileDirty) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfile({ name });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("نام نمایشی ذخیره شد.");
      router.refresh();
    });
  }

  function onPickCurrency(code: SpaceCurrency) {
    setPreferredCurrency(code);
    setCurrencySaved(true);
    window.setTimeout(() => setCurrencySaved(false), 1600);
  }

  return (
    <div className="flex flex-col gap-3">
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
                "flex h-11 flex-col items-center justify-center rounded-xl px-1 transition-colors",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="text-body-sm font-semibold leading-none">
                {item.label}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[10px] leading-none",
                  active ? "text-muted-foreground" : "text-muted-foreground/70",
                )}
              >
                {item.hint}
              </span>
            </button>
          );
        })}
      </nav>

      <div key={tab} className="animate-fade-up space-y-2.5" role="tabpanel">
        {tab === "look" ? (
          <section className="space-y-3 rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5 rounded-xl bg-primary px-3 py-2.5 text-primary-foreground">
              <span
                className="size-3.5 shrink-0 rounded-full ring-2 ring-on-hero/35"
                style={{ backgroundColor: activeAccent.swatch }}
                aria-hidden
              />
              <p className="min-w-0 flex-1 truncate text-caption font-semibold">
                {activeAccent.label}
                <span className="mx-1 opacity-50">·</span>
                {themeLabel}
              </p>
              <span className="shrink-0 text-micro text-primary-foreground/70">
                زنده
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-caption font-semibold text-foreground">
                حالت نمایش
              </p>
              <div
                className="grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1"
                role="group"
                aria-label="حالت نمایش"
              >
                {THEME_OPTIONS.map((opt) => {
                  const selected = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setTheme(opt.value);
                        applyDocumentTheme(opt.value);
                      }}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-caption font-semibold transition-colors",
                        selected
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span
                        className="size-3.5 shrink-0 rounded-full border border-border/50"
                        style={{ background: opt.swatch }}
                        aria-hidden
                      />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-caption font-semibold text-foreground">
                رنگ برند
              </p>
              <div className="grid grid-cols-4 gap-1.5">
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
                        "flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-all",
                        selected
                          ? "border-primary bg-primary/8 ring-2 ring-primary/25"
                          : "border-border/45 hover:bg-muted/40",
                      )}
                    >
                      <span
                        className="size-7 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: opt.swatch }}
                        aria-hidden
                      />
                      <span className="text-center text-[10px] font-semibold leading-tight text-foreground">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-micro text-muted-foreground">
                تغییر فوری است؛ نیازی به ذخیره نیست.
              </p>
            </div>
          </section>
        ) : null}

        {tab === "account" ? (
          <div className="space-y-2.5">
            <section className="space-y-2.5 rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-body-sm font-semibold text-foreground">
                    واحد پول پیش‌فرض
                  </h2>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    فقط برای دفترهای جدیدی که می‌سازی
                  </p>
                </div>
                {currencySaved ? (
                  <span className="shrink-0 rounded-lg bg-success-soft px-2 py-1 text-micro font-semibold text-success">
                    ذخیره شد
                  </span>
                ) : (
                  <span className="shrink-0 rounded-lg bg-muted px-2 py-1 text-micro font-medium text-muted-foreground">
                    خودکار
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CURRENCY_LABELS) as SpaceCurrency[]).map(
                  (code) => {
                    const selected = preferredCurrency === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => onPickCurrency(code)}
                        className={cn(
                          "rounded-xl px-3 py-1.5 text-caption font-semibold transition-all",
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
            </section>

            <section className="rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm">
              <form onSubmit={onSaveProfile} className="space-y-2.5">
                <div>
                  <h2 className="text-body-sm font-semibold text-foreground">
                    پروفایل
                  </h2>
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2">
                    <span className="text-caption text-muted-foreground">
                      شماره موبایل
                    </span>
                    <span
                      className="text-caption font-semibold tabular-nums text-foreground"
                      dir="ltr"
                    >
                      {phone}
                    </span>
                  </div>
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
                    autoComplete="name"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl"
                  disabled={pending || !profileDirty}
                >
                  {pending
                    ? "در حال ذخیره…"
                    : profileDirty
                      ? "ذخیره نام"
                      : "تغییری نیست"}
                </Button>
              </form>
            </section>
          </div>
        ) : null}

        {tab === "data" ? (
          <div className="space-y-2.5">
            <PwaInstallCard className="p-3.5" />
            <AccountBackupPanel />
            <section className="rounded-2xl border border-destructive/20 bg-card p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-body-sm font-semibold text-destructive">
                    خروج از حساب
                  </h2>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    فقط نشست این دستگاه پاک می‌شود
                  </p>
                </div>
                <form action={logout} className="shrink-0">
                  <Button
                    type="submit"
                    variant="destructive"
                    className="h-10 rounded-xl px-4"
                  >
                    خروج
                  </Button>
                </form>
              </div>
            </section>
          </div>
        ) : null}

        {message || error ? (
          <p
            className={cn(
              "rounded-xl px-3 py-2 text-caption font-medium",
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

      <footer className="border-t border-border/40 pt-2.5 text-center">
        <p className="text-micro text-muted-foreground">
          سوپرحساب
          <span className="mx-1 text-border">·</span>
          <span dir="ltr" className="tabular-nums">
            ver {APP_VERSION}
          </span>
        </p>
      </footer>
    </div>
  );
}
