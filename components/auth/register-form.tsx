"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  requestRegisterOtp,
  verifyRegisterOtp,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeDigits, toAsciiDigits } from "@/lib/format";
import { safeCallbackUrl } from "@/lib/safe-callback-url";

function phoneFromInput(raw: string): string {
  return toAsciiDigits(raw).replace(/[^\d+]/g, "");
}

type Step = "details" | "otp";

function focusEl(el: HTMLInputElement | null) {
  queueMicrotask(() => el?.focus());
}

export function RegisterForm({
  callbackUrl,
}: {
  callbackUrl?: string | null;
}) {
  const router = useRouter();
  const redirectTo = safeCallbackUrl(callbackUrl);
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  function onRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("نام نمایشی حداقل ۲ کاراکتر باشد.");
      focusEl(nameRef.current);
      return;
    }
    if (!phone.trim()) {
      setError("شماره موبایل را وارد کنید.");
      focusEl(phoneRef.current);
      return;
    }
    startTransition(async () => {
      const result = await requestRegisterOtp({ name, phone });
      if (!result.ok) {
        setError(result.error);
        focusEl(phoneRef.current);
        return;
      }
      setStep("otp");
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
      const result = await verifyRegisterOtp({ name, phone, otp });
      if (!result.ok) {
        setError(result.error);
        focusEl(otpRef.current);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    });
  }

  const stepIndex = step === "details" ? 1 : 2;

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
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-caption font-medium text-on-hero/70">ثبت‌نام</p>
            <h2 className="mt-0.5 text-xl font-bold tracking-tight text-on-hero">
              شروع ساده
            </h2>
            <p className="mt-1 text-caption leading-relaxed text-on-hero/75">
              {step === "otp"
                ? "کد ۶ رقمی ارسال‌شده را وارد کنید."
                : "فقط نام و موبایل — کمتر از یک دقیقه."}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-on-hero/12 px-2.5 py-1 text-caption font-semibold tabular-nums text-on-hero ring-1 ring-on-hero/15">
            {stepIndex} / ۲
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {step === "details" ? (
          <form onSubmit={onRequestOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="register-name"
                className="text-caption font-semibold"
              >
                نام نمایشی
              </Label>
              <Input
                ref={nameRef}
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="مثلاً علی"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl text-base"
                required
                minLength={2}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="register-phone"
                className="text-caption font-semibold"
              >
                موبایل
              </Label>
              <Input
                ref={phoneRef}
                id="register-phone"
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
              {pending ? "در حال ارسال…" : "دریافت کد تأیید"}
            </Button>
          </form>
        ) : (
          <form onSubmit={onVerifyOtp} className="space-y-4">
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-border/45 bg-muted/40 px-3.5 py-3">
              <div className="min-w-0">
                <p className="truncate text-body-sm font-semibold text-foreground">
                  {name}
                </p>
                <p
                  className="mt-0.5 truncate text-caption tabular-nums text-muted-foreground"
                  dir="ltr"
                >
                  {phone}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setStep("details");
                  setOtp("");
                  setError(null);
                }}
                className="shrink-0 cursor-pointer rounded-full border border-border/55 bg-card px-3 py-1.5 text-caption font-semibold text-primary transition-colors hover:border-primary/25"
              >
                ویرایش
              </button>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="register-otp"
                className="text-caption font-semibold"
              >
                کد تأیید
              </Label>
              <Input
                ref={otpRef}
                id="register-otp"
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
              {pending ? "در حال ثبت‌نام…" : "تأیید و ساخت حساب"}
            </Button>
          </form>
        )}

        <p className="border-t border-border/40 pt-4 text-center text-caption text-muted-foreground">
          قبلاً ثبت‌نام کرده‌اید؟{" "}
          <Link
            href={
              callbackUrl
                ? `/login?callbackUrl=${encodeURIComponent(redirectTo)}`
                : "/login"
            }
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            ورود
          </Link>
        </p>
      </div>
    </div>
  );
}
