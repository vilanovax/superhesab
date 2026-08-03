"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/password";
import {
  clearSessionCookie,
  setSessionCookie,
  signSessionToken,
} from "@/lib/session";

const MOCK_OTP = "123456";

export type AuthActionResult =
  | { ok: true }
  | { ok: false; error: string };

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "").trim();
}

function isValidPhone(phone: string): boolean {
  // Accept IR mobile (+98 / 09) and generic E.164-ish digits for MVP
  return /^(\+98|0)?9\d{9}$/.test(phone) || /^\+?\d{10,15}$/.test(phone);
}

export async function requestOtp(phone: string): Promise<AuthActionResult> {
  const normalized = normalizePhone(phone);
  if (!normalized || !isValidPhone(normalized)) {
    return { ok: false, error: "شماره موبایل معتبر نیست." };
  }
  // Mock: no SMS provider in MVP
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

  if (otp.trim() !== MOCK_OTP) {
    return { ok: false, error: "کد تأیید نادرست است." };
  }

  const user = await prisma.user.upsert({
    where: { phone: normalized },
    create: {
      phone: normalized,
      name: null,
      avatarUrl: null,
    },
    update: {},
  });

  const token = await signSessionToken({
    userId: user.id,
    phone: user.phone,
  });
  await setSessionCookie(token);

  return { ok: true };
}

/**
 * Login with phone + password for accounts that have set a password.
 * OTP login remains available for everyone.
 */
export async function loginWithPassword(
  phone: string,
  password: string,
): Promise<AuthActionResult> {
  const normalized = normalizePhone(phone);
  if (!normalized || !isValidPhone(normalized)) {
    return { ok: false, error: "شماره موبایل معتبر نیست." };
  }
  if (!password || password.length > 72) {
    return { ok: false, error: "رمز عبور را وارد کنید." };
  }

  const user = await prisma.user.findUnique({
    where: { phone: normalized },
    select: {
      id: true,
      phone: true,
      passwordHash: true,
      isVirtual: true,
    },
  });

  // Same generic error whether missing user or wrong password (no user enumeration).
  if (
    !user ||
    user.isVirtual ||
    !user.passwordHash ||
    !verifyPassword(password, user.passwordHash)
  ) {
    return { ok: false, error: "شماره یا رمز عبور نادرست است." };
  }

  const token = await signSessionToken({
    userId: user.id,
    phone: user.phone,
  });
  await setSessionCookie(token);

  return { ok: true };
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
