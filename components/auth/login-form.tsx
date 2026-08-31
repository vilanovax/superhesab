"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginWithPassword, requestOtp, verifyOtp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeDigits, toAsciiDigits } from "@/lib/format";
import { PASSWORD_MIN_LEN } from "@/lib/password-policy";
import { safeCallbackUrl } from "@/lib/safe-callback-url";
import { cn } from "@/lib/utils";

/** Live phone field: Eastern digits → ASCII; keep + and digits. */
function phoneFromInput(raw: string): string {
  return toAsciiDigits(raw).replace(/[^\d+]/g, "");
}

type Step = "phone" | "otp";
type AuthMode = "otp" | "password";

function focusEl(el: HTMLInputElement | null) {
  queueMicrotask(() => el?.focus());
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

  const phoneOtpRef = useRef<HTMLInputElement>(null);
  const phonePasswordRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  function onRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) {
      setError("شماره موبایل را وارد کنید.");
      focusEl(phoneOtpRef.current);
      return;
    }
    startTransition(async () => {
      const result = await requestOtp(phone);
      if (!result.ok) {
        setError(result.error);
        focusEl(phoneOtpRef.current);
        return;
      }
      setStep("otp");
    });
  }

  function onLoginPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) {
      setError("شماره موبایل را وارد کنید.");
      focusEl(phonePasswordRef.current);
      return;
    }
    if (password.length < PASSWORD_MIN_LEN) {
      setError(`رمز عبور حداقل ${PASSWORD_MIN_LEN} کاراکتر باشد.`);
      focusEl(passwordRef.current);
      return;
    }
    startTransition(async () => {
      const result = await loginWithPassword(phone, password);
      if (!result.ok) {
        setError(result.error);
        focusEl(passwordRef.current);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    });
  }

  function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.length < 6) {
      setError("کد ۶ رقمی را کامل وارد کنید.");
      focusEl(otpRef.current);
      return;
    }
    startTransition(async () => {
      const result = await verifyOtp(phone, otp);
      if (!result.ok) {
        setError(result.error);
        focusEl(otpRef.current);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    });
  }

  const subtitle =
    step === "otp"
      ? "کد ۶ رقمی ارسال‌شده را وارد کنید."
      : mode === "password"
        ? "با موبایل و رمزی که در تنظیمات گذاشته‌اید."
        : "شماره موبایل را وارد کنید تا کد برایتان بیاید.";

  return (
    <div className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-md">
      <div className="surface-hero relative overflow-hidden px-5 py-4 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-e-10 -top-14 size-36 rounded-full bg-on-hero/12 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-s-12 -bottom-10 size-32 rounded-full bg-ink/20 blur-3xl"
        />
        <div className="relative">
          <p className="text-caption font-medium text-on-hero/70">ورود</p>
          <h2 className="mt-0.5 text-xl font-bold tracking-tight text-on-hero">
            خوش آمدید
          </h2>
          <p className="mt-1 text-caption leading-relaxed text-on-hero/75">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {step === "phone" ? (
          <>
            <div
              className="grid grid-cols-2 gap-1 rounded-[1.15rem] border border-border/45 bg-muted/40 p-1"
              role="tablist"
              aria-label="روش ورود"
            >
              {(
                [
                  { id: "otp" as const, label: "کد تأیید", hint: "پیامک" },
                  { id: "password" as const, label: "رمز عبور", hint: "سریع" },
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
                      "flex h-12 cursor-pointer flex-col items-center justify-center rounded-xl px-2 transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-card/80 hover:text-foreground",
                    )}
                  >
                    <span className="text-body-sm font-semibold leading-none">
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 text-[10px] leading-none",
                        active
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground/70",
                      )}
                    >
                      {item.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            {mode === "otp" ? (
              <form onSubmit={onRequestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-caption font-semibold">
                    موبایل
                  </Label>
                  <Input
                    ref={phoneOtpRef}
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    spellCheck={false}
                    dir="ltr"
                    placeholder="مثلاً 0912…"
                    value={phone}
                    onChange={(e) => setPhone(phoneFromInput(e.target.value))}
                    className="h-12 rounded-xl text-base tabular-nums"
                    required
                  />
                </div>
                {error ? (
                  <p
                    className="rounded-xl bg-destructive-soft px-3 py-2.5 text-caption font-medium text-destructive"
                    role="alert"
                    aria-live="assertive"
                  >
                    {error}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="h-12 w-full cursor-pointer rounded-xl text-base font-semibold"
                  disabled={pending}
                >
                  {pending ? "در حال ارسال…" : "دریافت کد"}
                </Button>
              </form>
            ) : (
              <form onSubmit={onLoginPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="phone-password"
                    className="text-caption font-semibold"
                  >
                    موبایل
                  </Label>
                  <Input
                    ref={phonePasswordRef}
                    id="phone-password"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    spellCheck={false}
                    dir="ltr"
                    placeholder="مثلاً 0912…"
                    value={phone}
                    onChange={(e) => setPhone(phoneFromInput(e.target.value))}
                    className="h-12 rounded-xl text-base tabular-nums"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="login-password"
                    className="text-caption font-semibold"
                  >
                    رمز عبور
                  </Label>
                  <Input
                    ref={passwordRef}
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    spellCheck={false}
                    dir="ltr"
                    placeholder="رمز خود را وارد کنید"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl text-base"
                    required
                    minLength={PASSWORD_MIN_LEN}
                  />
                </div>
                {error ? (
                  <p
                    className="rounded-xl bg-destructive-soft px-3 py-2.5 text-caption font-medium text-destructive"
                    role="alert"
                    aria-live="assertive"
                  >
                    {error}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="h-12 w-full cursor-pointer rounded-xl text-base font-semibold"
                  disabled={pending}
                >
                  {pending ? "در حال ورود…" : "ورود با رمز"}
                </Button>
              </form>
            )}
          </>
        ) : (
          <form onSubmit={onVerifyOtp} className="space-y-4">
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-border/45 bg-muted/40 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-caption text-muted-foreground">کد برای</p>
                <p
                  className="mt-0.5 truncate text-body-sm font-semibold tabular-nums text-foreground"
                  dir="ltr"
                >
                  {phone}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError(null);
                }}
                className="shrink-0 cursor-pointer rounded-full border border-border/55 bg-card px-3 py-1.5 text-caption font-semibold text-primary transition-colors hover:border-primary/25"
              >
                تغییر
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="otp" className="text-caption font-semibold">
                کد تأیید
              </Label>
              <Input
                ref={otpRef}
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                spellCheck={false}
                dir="ltr"
                placeholder="• • • • • •"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(normalizeDigits(e.target.value).slice(0, 6))
                }
                className="h-14 rounded-xl text-center text-xl tracking-[0.45em] placeholder:tracking-[0.2em] placeholder:text-muted-foreground/50"
                required
              />
              <p className="text-center text-caption text-muted-foreground">
                کد تست:{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  111111
                </span>
              </p>
            </div>
            {error ? (
              <p
                className="rounded-xl bg-destructive-soft px-3 py-2.5 text-caption font-medium text-destructive"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-12 w-full cursor-pointer rounded-xl text-base font-semibold"
              disabled={pending}
            >
              {pending ? "در حال ورود…" : "تأیید و ورود"}
            </Button>
          </form>
        )}

        <p className="border-t border-border/40 pt-4 text-center text-caption text-muted-foreground">
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
