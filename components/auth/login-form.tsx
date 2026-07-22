"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestOtp, verifyOtp } from "@/app/actions/auth";

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
    <div className="w-full max-w-sm space-y-8">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium tracking-wide text-zinc-500">
          SuperHesab
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          ورود با موبایل
        </h1>
        <p className="text-sm text-zinc-500">
          {step === "phone"
            ? "شماره موبایل خود را وارد کنید."
            : `کد ارسال‌شده به ${phone} را وارد کنید.`}
        </p>
      </header>

      {step === "phone" ? (
        <form onSubmit={onRequestOtp} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-700">موبایل</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="09123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-base text-zinc-900 outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2"
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition enabled:hover:bg-zinc-800 disabled:opacity-60"
          >
            {pending ? "در حال ارسال…" : "دریافت کد"}
          </button>
        </form>
      ) : (
        <form onSubmit={onVerifyOtp} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-700">کد تأیید</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              placeholder="123456"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-center text-lg tracking-[0.35em] text-zinc-900 outline-none ring-zinc-900/10 placeholder:tracking-normal placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2"
              required
            />
            <span className="block text-xs text-zinc-500">
              Use <span className="font-mono text-zinc-700">123456</span> for
              testing
            </span>
          </label>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending || otp.length < 6}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition enabled:hover:bg-zinc-800 disabled:opacity-60"
          >
            {pending ? "در حال ورود…" : "تأیید و ورود"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setStep("phone");
              setOtp("");
              setError(null);
            }}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
          >
            تغییر شماره
          </button>
        </form>
      )}
    </div>
  );
}
