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

type Step = "details" | "otp";

function safeCallbackUrl(raw: string | undefined | null): string {
  if (!raw) return "/app";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/app";
  return raw;
}

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

  return (
    <div className="animate-fade-up overflow-hidden rounded-[1.35rem] border border-border/60 bg-card/90 shadow-lg backdrop-blur-md transition-transform duration-300 motion-safe:hover:-translate-y-0.5">
      <div className="surface-hero relative overflow-hidden px-5 py-5 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-8 -top-10 size-28 rounded-full bg-on-hero/15 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 start-1/4 size-32 rounded-full bg-on-hero/10 blur-3xl"
        />
        <p className="relative text-[11px] font-semibold tracking-[0.2em] text-on-hero/70">
          ثبت‌نام
        </p>
        <h2 className="relative mt-1.5 text-xl font-bold tracking-tight text-on-hero sm:text-2xl">
          شروع ساده
        </h2>
        <p className="relative mt-1.5 text-sm text-on-hero/75">
          {step === "otp"
            ? `کد ارسال‌شده به ${phone} را وارد کنید.`
            : "فقط نام و موبایل — یک دقیقه تا اولین دفتر."}
        </p>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {step === "details" ? (
          <form onSubmit={onRequestOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name">نام نمایشی</Label>
              <Input
                ref={nameRef}
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="مثلاً علی…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl text-base"
                required
                minLength={2}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-phone">موبایل</Label>
              <Input
                ref={phoneRef}
                id="register-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                spellCheck={false}
                dir="ltr"
                placeholder="09123456789…"
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
                aria-live="assertive"
              >
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-base font-semibold"
              disabled={pending}
            >
              {pending ? "در حال ارسال…" : "دریافت کد تأیید"}
            </Button>
          </form>
        ) : (
          <form onSubmit={onVerifyOtp} className="space-y-4">
            <div className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
              <p className="font-semibold text-foreground">{name}</p>
              <p className="mt-0.5 tabular-nums text-muted-foreground" dir="ltr">
                {phone}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-otp">کد تأیید</Label>
              <Input
                ref={otpRef}
                id="register-otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                spellCheck={false}
                dir="ltr"
                placeholder="111111…"
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
                aria-live="assertive"
              >
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-base font-semibold"
              disabled={pending}
            >
              {pending ? "در حال ثبت‌نام…" : "تأیید و ساخت حساب"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full rounded-xl"
              disabled={pending}
              onClick={() => {
                setStep("details");
                setOtp("");
                setError(null);
              }}
            >
              ویرایش نام یا شماره
            </Button>
          </form>
        )}

        <p className="border-t border-border/50 pt-4 text-center text-sm text-muted-foreground">
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
