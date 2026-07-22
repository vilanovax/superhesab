"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestOtp, verifyOtp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "phone" | "otp";

export function LoginForm() {
  const router = useRouter();
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
      router.replace("/app");
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-sm space-y-8 rounded-lg border border-border bg-card p-6 shadow-none">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground">
          SuperHesab
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          ورود با موبایل
        </h1>
        <p className="text-sm text-muted-foreground">
          {step === "phone"
            ? "شماره موبایل خود را وارد کنید."
            : `کد ارسال‌شده به ${phone} را وارد کنید.`}
        </p>
      </header>

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
