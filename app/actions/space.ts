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
  currency: z.enum(["TOMAN", "RIAL"]).optional(),
});

export type SpaceActionResult =
  | { ok: true; spaceId: string }
  | { ok: false; error: string };

const updateSpaceSchema = z.object({
  spaceId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  currency: z.enum(["TOMAN", "RIAL"]),
  roundUpToThousand: z.boolean(),
});

export async function updateSpaceSettings(input: {
  spaceId: string;
  name: string;
  currency: "TOMAN" | "RIAL";
  roundUpToThousand: boolean;
}): Promise<SpaceActionResult> {
  const session = await requireUser();
  const parsed = updateSpaceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "اطلاعات تنظیمات نامعتبر است." };
  }

  const membership = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: {
        spaceId: parsed.data.spaceId,
        userId: session.userId,
      },
    },
  });

  if (!membership || membership.role !== "OWNER") {
    return { ok: false, error: "فقط مالک می‌تواند تنظیمات را تغییر دهد." };
  }

  await prisma.space.update({
    where: { id: parsed.data.spaceId },
    data: {
      name: parsed.data.name,
      currency: parsed.data.currency,
      roundUpToThousand: parsed.data.roundUpToThousand,
    },
  });

  revalidatePath(`/spaces/${parsed.data.spaceId}`);
  revalidatePath(`/spaces/${parsed.data.spaceId}/settings`);
  revalidatePath("/app");
  return { ok: true, spaceId: parsed.data.spaceId };
}

export async function updateSpaceSettingsAndRedirect(formData: FormData) {
  const spaceId = String(formData.get("spaceId") ?? "");
  const name = String(formData.get("name") ?? "");
  const currency = String(formData.get("currency") ?? "TOMAN") as
    | "TOMAN"
    | "RIAL";
  const roundUpToThousand = formData.get("roundUpToThousand") === "on";
  const result = await updateSpaceSettings({
    spaceId,
    name,
    currency,
    roundUpToThousand,
  });
  if (!result.ok) {
    redirect(
      `/spaces/${spaceId}/settings?error=${encodeURIComponent(result.error)}`,
    );
  }
  redirect(`/spaces/${spaceId}`);
}

export async function createSpace(input: {
  name: string;
  type: SpaceType;
  currency?: "TOMAN" | "RIAL";
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
        currency: parsed.data.currency ?? "TOMAN",
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
  const currencyRaw = String(formData.get("currency") ?? "TOMAN");
  const currency =
    currencyRaw === "RIAL" || currencyRaw === "TOMAN" ? currencyRaw : "TOMAN";
  const result = await createSpace({ name, type, currency });
  if (!result.ok) {
    redirect(`/app?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/spaces/${result.spaceId}`);
}
