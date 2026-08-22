"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guards";
import { isPresetAvatarUrl } from "@/lib/preset-avatars";
import {
  hashPassword,
  PASSWORD_MAX_LEN,
  validatePasswordPlain,
  verifyPassword,
} from "@/lib/password";

export type ProfileActionResult =
  | { ok: true }
  | { ok: false; error: string };

const profileSchema = z.object({
  name: z.string().trim().max(80),
  avatarUrl: z
    .union([
      z.literal(null),
      z.string().refine((v) => isPresetAvatarUrl(v), "آواتار نامعتبر است."),
    ])
    .optional(),
});

export async function updateProfile(input: {
  name: string;
  avatarUrl?: string | null;
}): Promise<ProfileActionResult> {
  const session = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "اطلاعات پروفایل نامعتبر است." };
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      name: parsed.data.name.length > 0 ? parsed.data.name : null,
      ...(parsed.data.avatarUrl !== undefined
        ? { avatarUrl: parsed.data.avatarUrl }
        : {}),
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

const changePasswordSchema = z.object({
  currentPassword: z.string().max(PASSWORD_MAX_LEN),
  newPassword: z.string().min(1).max(PASSWORD_MAX_LEN),
  confirmPassword: z.string().min(1).max(PASSWORD_MAX_LEN),
});

/**
 * Set or change the account password.
 * - First time (no hash): currentPassword may be empty.
 * - Afterwards: currentPassword must match.
 */
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ProfileActionResult> {
  const session = await requireUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "اطلاعات رمز نامعتبر است." };
  }

  const { currentPassword, newPassword, confirmPassword } = parsed.data;
  if (newPassword !== confirmPassword) {
    return { ok: false, error: "تکرار رمز با رمز جدید یکی نیست." };
  }

  const strengthError = validatePasswordPlain(newPassword);
  if (strengthError) {
    return { ok: false, error: strengthError };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, passwordHash: true, isVirtual: true },
  });
  if (!user || user.isVirtual) {
    return { ok: false, error: "حساب کاربری معتبر نیست." };
  }

  if (user.passwordHash) {
    if (!currentPassword) {
      return { ok: false, error: "رمز فعلی را وارد کنید." };
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return { ok: false, error: "رمز فعلی نادرست است." };
    }
    if (verifyPassword(newPassword, user.passwordHash)) {
      return { ok: false, error: "رمز جدید باید با رمز فعلی فرق داشته باشد." };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) },
  });

  revalidatePath("/app/settings");
  return { ok: true };
}
