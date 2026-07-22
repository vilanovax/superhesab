"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guards";
import { getTemplate } from "@/lib/templates/registry";
import type { SpaceType } from "@/types";

const createSpaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["TRIP", "PARTNER"]),
});

export type SpaceActionResult =
  | { ok: true; spaceId: string }
  | { ok: false; error: string };

export async function createSpace(input: {
  name: string;
  type: SpaceType;
}): Promise<SpaceActionResult> {
  const session = await requireUser();
  const parsed = createSpaceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "نام یا نوع فضا نامعتبر است." };
  }

  const template = getTemplate(parsed.data.type);

  const space = await prisma.$transaction(async (tx) => {
    const created = await tx.space.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        ownerId: session.userId,
      },
    });

    await tx.spaceMember.create({
      data: {
        spaceId: created.id,
        userId: session.userId,
        role: "OWNER",
      },
    });

    // Ensure template default role constant is referenced (OWNER for creator)
    void template.defaultInviteRole;

    return created;
  });

  revalidatePath("/app");
  return { ok: true, spaceId: space.id };
}

export async function createSpaceAndRedirect(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const type = String(formData.get("type") ?? "TRIP") as SpaceType;
  const result = await createSpace({ name, type });
  if (!result.ok) {
    redirect(`/app?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/spaces/${result.spaceId}`);
}
