"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { PASSWORD_MAX_LEN } from "@/lib/password-policy";
import { verifyPassword } from "@/lib/password";
import {
  clearSessionCookie,
  setSessionCookie,
  signSessionToken,
} from "@/lib/session";

/** Dev / MVP mock OTP — replace when SMS provider is wired. */
const MOCK_OTP = "111111";

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

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

async function createSession(user: { id: string; phone: string }) {
  const token = await signSessionToken({
    userId: user.id,
    phone: user.phone,
  });
  await setSessionCookie(token);
}

export async function requestOtp(phone: string): Promise<AuthActionResult> {
  const normalized = normalizePhone(phone);
  if (!normalized || !isValidPhone(normalized)) {
    return { ok: false, error: "شماره موبایل معتبر نیست." };
  }

  const user = await prisma.user.findUnique({
    where: { phone: normalized },
    select: { id: true, isVirtual: true },
  });
  if (!user || user.isVirtual) {
    return {
      ok: false,
      error: "حسابی با این شماره نیست. ابتدا ثبت‌نام کنید.",
    };
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

  const user = await prisma.user.findUnique({
    where: { phone: normalized },
    select: { id: true, phone: true, isVirtual: true },
  });
  if (!user || user.isVirtual) {
    return {
      ok: false,
      error: "حسابی با این شماره نیست. ابتدا ثبت‌نام کنید.",
    };
  }

  await createSession(user);
  return { ok: true };
}

export async function requestRegisterOtp(input: {
  name: string;
  phone: string;
}): Promise<AuthActionResult> {
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

  // Mock: no SMS provider in MVP
  return { ok: true };
}

export async function verifyRegisterOtp(input: {
  name: string;
  phone: string;
  otp: string;
}): Promise<AuthActionResult> {
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
  if (input.otp.trim() !== MOCK_OTP) {
    return { ok: false, error: "کد تأیید نادرست است." };
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

  await createSession(user);
  return { ok: true };
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
