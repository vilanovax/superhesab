"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guards";

export type ProfileActionResult =
  | { ok: true }
  | { ok: false; error: string };

const profileSchema = z.object({
  name: z.string().trim().max(80),
});

export async function updateProfile(input: {
  name: string;
}): Promise<ProfileActionResult> {
  const session = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "نام نامعتبر است." };
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      name: parsed.data.name.length > 0 ? parsed.data.name : null,
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/settings");
  return { ok: true };
}
