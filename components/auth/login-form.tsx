"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginWithPassword, requestOtp, verifyOtp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Step = "phone" | "otp";
type AuthMode = "otp" | "password";

function safeCallbackUrl(raw: string | undefined | null): string {
  if (!raw) return "/app";
  // Only allow relative in-app paths (block open redirects)
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/app";
  return raw;
}

export function LoginForm({
  callbackUrl,
}: {
  callbackUrl?: string | null;
}) {
  const router = useRouter();
  const redirectTo = safeCallbackUrl(callbackUrl);
  const [step, setStep] = useState<Step>("phone");
  const [mode, setMode] = useState<AuthMode>("otp");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestOtp(phone);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep("otp");
    });
  }

  function onLoginPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginWithPassword(phone, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    });
  }

  function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await verifyOtp(phone, otp);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    });
  }

  const subtitle =
    step === "otp"
      ? `کد ارسال‌شده به ${phone} را وارد کنید.`
      : mode === "password"
        ? "شماره و رمز عبوری که در تنظیمات گذاشته‌اید."
        : "شماره موبایل خود را وارد کنید.";

  return (
    <div className="animate-fade-up w-full max-w-sm space-y-8 overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-6 shadow-lg backdrop-blur-md">
      <div className="surface-hero -mx-6 -mt-6 mb-2 px-6 py-5">
        <p className="text-xs font-semibold tracking-[0.18em] text-on-hero/70">
          SUPERHESAB
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-on-hero">
          ورود با موبایل
        </h1>
        <p className="mt-1.5 text-sm text-on-hero/75">{subtitle}</p>
      </div>

      {step === "phone" ? (
        <div className="space-y-4">
          <div
            className="grid grid-cols-2 gap-1 rounded-xl bg-muted/70 p-1"
            role="tablist"
            aria-label="روش ورود"
          >
            {(
              [
                { id: "otp" as const, label: "کد تأیید" },
                { id: "password" as const, label: "رمز عبور" },
              ] as const
            ).map((item) => {
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={pending}
                  onClick={() => {
                    setMode(item.id);
                    setError(null);
                    setPassword("");
                  }}
                  className={cn(
                    "h-10 rounded-lg text-sm font-semibold transition-colors",
                    active
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {mode === "otp" ? (
            <form onSubmit={onRequestOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">موبایل</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "در حال ارسال…" : "دریافت کد"}
              </Button>
            </form>
          ) : (
            <form onSubmit={onLoginPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone-password">موبایل</Label>
                <Input
                  id="phone-password"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">رمز عبور</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  dir="ltr"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                className="w-full"
                disabled={pending || password.length < 8}
              >
                {pending ? "در حال ورود…" : "ورود با رمز"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                هنوز رمز نگذاشته‌اید؟ از تب «کد تأیید» وارد شوید و در تنظیمات
                رمز بگذارید.
              </p>
            </form>
          )}
        </div>
      ) : (
        <form onSubmit={onVerifyOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">کد تأیید</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              placeholder="123456"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="text-center text-lg tracking-[0.35em] placeholder:tracking-normal"
              required
            />
            <p className="text-xs text-muted-foreground">
              Use <span className="font-mono text-foreground">123456</span> for
              testing
            </p>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={pending || otp.length < 6}
          >
            {pending ? "در حال ورود…" : "تأیید و ورود"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={pending}
            onClick={() => {
              setStep("phone");
              setOtp("");
              setError(null);
            }}
          >
            تغییر شماره
          </Button>
        </form>
      )}
    </div>
  );
}
