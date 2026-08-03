"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginWithPassword, requestOtp, verifyOtp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_MIN_LEN } from "@/lib/password-policy";
import { cn } from "@/lib/utils";

type Step = "phone" | "otp";
type AuthMode = "otp" | "password";

function safeCallbackUrl(raw: string | undefined | null): string {
  if (!raw) return "/app";
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
        ? "شماره و رمزی که در تنظیمات گذاشته‌اید."
        : "با موبایل وارد دفترهای خود شوید.";

  return (
    <div className="animate-fade-up overflow-hidden rounded-[1.35rem] border border-border/60 bg-card/90 shadow-lg backdrop-blur-md transition-transform duration-300 motion-safe:hover:-translate-y-0.5">
      <div className="surface-hero relative overflow-hidden px-5 py-5 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-10 -top-12 size-28 rounded-full bg-on-hero/15 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -start-8 size-24 rounded-full bg-on-hero/10 blur-2xl"
        />
        <p className="relative text-[11px] font-semibold tracking-[0.2em] text-on-hero/70">
          ورود
        </p>
        <h2 className="relative mt-1.5 text-xl font-bold tracking-tight text-on-hero sm:text-2xl">
          خوش آمدید
        </h2>
        <p className="relative mt-1.5 text-sm text-on-hero/75">{subtitle}</p>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {step === "phone" ? (
          <>
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
                      "h-10 rounded-lg text-sm font-semibold transition-all",
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
                    className="h-12 rounded-xl text-base"
                    required
                  />
                </div>
                {error ? (
                  <p
                    className="rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl text-base font-semibold"
                  disabled={pending}
                >
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
                    className="h-12 rounded-xl text-base"
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
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl text-base"
                    required
                    minLength={PASSWORD_MIN_LEN}
                  />
                </div>
                {error ? (
                  <p
                    className="rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl text-base font-semibold"
                  disabled={pending || password.length < PASSWORD_MIN_LEN}
                >
                  {pending ? "در حال ورود…" : "ورود با رمز"}
                </Button>
              </form>
            )}
          </>
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
                placeholder="111111"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="h-14 rounded-xl text-center text-xl tracking-[0.4em] placeholder:tracking-normal"
                required
              />
              <p className="text-center text-xs text-muted-foreground">
                کد نمونه:{" "}
                <span className="font-mono font-semibold text-foreground">
                  111111
                </span>
              </p>
            </div>
            {error ? (
              <p
                className="rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-base font-semibold"
              disabled={pending || otp.length < 6}
            >
              {pending ? "در حال ورود…" : "تأیید و ورود"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full rounded-xl"
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

        <p className="border-t border-border/50 pt-4 text-center text-sm text-muted-foreground">
          حساب ندارید؟{" "}
          <Link
            href={
              callbackUrl
                ? `/register?callbackUrl=${encodeURIComponent(redirectTo)}`
                : "/register"
            }
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            ثبت‌نام کنید
          </Link>
        </p>
      </div>
    </div>
  );
}
