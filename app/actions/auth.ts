"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { assertFeatureEnabled } from "@/lib/feature-flags";
import { PASSWORD_MAX_LEN } from "@/lib/password-policy";
import { verifyPassword } from "@/lib/password";
import { normalizeDigits, normalizePhone } from "@/lib/format";
import {
  clearSessionCookie,
  setSessionCookie,
  signSessionToken,
} from "@/lib/session";

/** Default testing OTP until SMS is wired. Disable with ALLOW_MOCK_OTP=false. */
const MOCK_OTP = "111111";

function isMockOtpAllowed(): boolean {
  // Default ON for local/testing; set ALLOW_MOCK_OTP=false to hard-disable.
  return process.env.ALLOW_MOCK_OTP !== "false";
}

export type AuthActionResult =
  | { ok: true }
  | { ok: false; error: string };

function assertOtpAccepted(otp: string): AuthActionResult | null {
  if (!isMockOtpAllowed()) {
    return {
      ok: false,
      error:
        "ورود با کد پیامکی فعلاً فعال نیست. از رمز عبور استفاده کنید یا با پشتیبانی تماس بگیرید.",
    };
  }
  if (normalizeOtp(otp) !== MOCK_OTP) {
    return { ok: false, error: "کد تأیید نادرست است." };
  }
  return null;
}

function isValidPhone(phone: string): boolean {
  // Accept IR mobile (+98 / 09) and generic E.164-ish digits for MVP
  return /^(\+98|0)?9\d{9}$/.test(phone) || /^\+?\d{10,15}$/.test(phone);
}

function normalizeOtp(otp: string): string {
  return normalizeDigits(otp);
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

async function createSession(user: { id: string; phone: string }) {
  const token = await signSessionToken({
    userId: user.id,
    phone: user.phone,
  });
  await setSessionCookie(token);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  });
}

async function assertLoginAllowed(
  phone: string,
): Promise<
  | { ok: true; user: { id: string; phone: string } }
  | { ok: false; error: string }
> {
  const user = await prisma.user.findUnique({
    where: { phone },
    select: {
      id: true,
      phone: true,
      isVirtual: true,
      disabledAt: true,
    },
  });
  if (!user || user.isVirtual) {
    return {
      ok: false,
      error: "حسابی با این شماره نیست. ابتدا ثبت‌نام کنید.",
    };
  }
  if (user.disabledAt) {
    return { ok: false, error: "این حساب غیرفعال شده است." };
  }
  return { ok: true, user: { id: user.id, phone: user.phone } };
}

export async function requestOtp(phone: string): Promise<AuthActionResult> {
  const normalized = normalizePhone(phone);
  if (!normalized || !isValidPhone(normalized)) {
    return { ok: false, error: "شماره موبایل معتبر نیست." };
  }

  const allowed = await assertLoginAllowed(normalized);
  if (!allowed.ok) return allowed;

  if (!isMockOtpAllowed()) {
    return {
      ok: false,
      error:
        "ارسال کد پیامکی فعلاً فعال نیست. از ورود با رمز عبور استفاده کنید.",
    };
  }
  // Dev mock: no SMS provider wired yet
  return { ok: true };
}

export async function verifyOtp(
  phone: string,
  otp: string,
): Promise<AuthActionResult> {
  const normalized = normalizePhone(phone);
  if (!normalized || !isValidPhone(normalized)) {
    return { ok: false, error: "شماره موبایل معتبر نیست." };
  }

  const otpGate = assertOtpAccepted(otp);
  if (otpGate) return otpGate;

  const allowed = await assertLoginAllowed(normalized);
  if (!allowed.ok) return allowed;

  await createSession(allowed.user);
  return { ok: true };
}

export async function requestRegisterOtp(input: {
  name: string;
  phone: string;
}): Promise<AuthActionResult> {
  const regGate = await assertFeatureEnabled(
    "new_registrations",
    "ثبت‌نام فعلاً بسته است. بعداً دوباره تلاش کنید.",
  );
  if (!regGate.ok) return regGate;

  const name = normalizeName(input.name);
  const normalized = normalizePhone(input.phone);

  if (!name || name.length < 2) {
    return { ok: false, error: "نام را کامل وارد کنید." };
  }
  if (name.length > 80) {
    return { ok: false, error: "نام خیلی طولانی است." };
  }
  if (!normalized || !isValidPhone(normalized)) {
    return { ok: false, error: "شماره موبایل معتبر نیست." };
  }

  const existing = await prisma.user.findUnique({
    where: { phone: normalized },
    select: { id: true, isVirtual: true },
  });
  if (existing && !existing.isVirtual) {
    return {
      ok: false,
      error: "این شماره قبلاً ثبت شده. وارد شوید.",
    };
  }

  if (!isMockOtpAllowed()) {
    return {
      ok: false,
      error:
        "ثبت‌نام با کد پیامکی فعلاً فعال نیست. بعداً دوباره تلاش کنید.",
    };
  }
  // Dev mock: no SMS provider wired yet
  return { ok: true };
}

export async function verifyRegisterOtp(input: {
  name: string;
  phone: string;
  otp: string;
}): Promise<AuthActionResult> {
  const regGate = await assertFeatureEnabled(
    "new_registrations",
    "ثبت‌نام فعلاً بسته است. بعداً دوباره تلاش کنید.",
  );
  if (!regGate.ok) return regGate;

  const name = normalizeName(input.name);
  const normalized = normalizePhone(input.phone);

  if (!name || name.length < 2) {
    return { ok: false, error: "نام را کامل وارد کنید." };
  }
  if (name.length > 80) {
    return { ok: false, error: "نام خیلی طولانی است." };
  }
  if (!normalized || !isValidPhone(normalized)) {
    return { ok: false, error: "شماره موبایل معتبر نیست." };
  }
  const otpGate = assertOtpAccepted(input.otp);
  if (otpGate) return otpGate;

  const existing = await prisma.user.findUnique({
    where: { phone: normalized },
    select: { id: true, isVirtual: true },
  });
  if (existing && !existing.isVirtual) {
    return {
      ok: false,
      error: "این شماره قبلاً ثبت شده. وارد شوید.",
    };
  }

  const user =
    existing && existing.isVirtual
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            name,
            isVirtual: false,
            avatarUrl: null,
          },
          select: { id: true, phone: true },
        })
      : await prisma.user.create({
          data: {
            phone: normalized,
            name,
            avatarUrl: null,
          },
          select: { id: true, phone: true },
        });

  await createSession(user);
  return { ok: true };
}

/**
 * Login with phone + password for accounts that have set a password.
 * OTP defaults to mock 111111 until SMS is wired (ALLOW_MOCK_OTP=false to disable).
 */
export async function loginWithPassword(
  phone: string,
  password: string,
): Promise<AuthActionResult> {
  const normalized = normalizePhone(phone);
  if (!normalized || !isValidPhone(normalized)) {
    return { ok: false, error: "شماره موبایل معتبر نیست." };
  }
  if (!password || password.length > PASSWORD_MAX_LEN) {
    return { ok: false, error: "رمز عبور را وارد کنید." };
  }

  const user = await prisma.user.findUnique({
    where: { phone: normalized },
    select: {
      id: true,
      phone: true,
      passwordHash: true,
      isVirtual: true,
      disabledAt: true,
    },
  });

  if (user?.disabledAt) {
    return { ok: false, error: "این حساب غیرفعال شده است." };
  }

  // Same generic error whether missing user or wrong password (no user enumeration).
  if (
    !user ||
    user.isVirtual ||
    !user.passwordHash ||
    !verifyPassword(password, user.passwordHash)
  ) {
    return { ok: false, error: "شماره یا رمز عبور نادرست است." };
  }

  await createSession(user);
  return { ok: true };
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
