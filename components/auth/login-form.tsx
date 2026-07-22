"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestOtp, verifyOtp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "phone" | "otp";

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
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
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

  return (
    <div className="animate-fade-up w-full max-w-sm space-y-8 overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-6 shadow-[0_20px_50px_-24px_rgba(15,92,87,0.45)] backdrop-blur-md">
      <div className="surface-hero -mx-6 -mt-6 mb-2 px-6 py-5">
        <p className="text-xs font-semibold tracking-[0.18em] text-white/70">
          SUPERHESAB
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
          ورود با موبایل
        </h1>
        <p className="mt-1.5 text-sm text-white/75">
          {step === "phone"
            ? "شماره موبایل خود را وارد کنید."
            : `کد ارسال‌شده به ${phone} را وارد کنید.`}
        </p>
      </div>

      {step === "phone" ? (
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
