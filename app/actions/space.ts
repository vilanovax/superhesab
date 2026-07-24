"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guards";
import { isSpaceCurrency, type SpaceCurrency } from "@/lib/format";
import { getTemplate } from "@/lib/templates/registry";
import type { SpaceType } from "@/types";

const spaceCurrencySchema = z.enum([
  "TOMAN",
  "RIAL",
  "USD",
  "AED",
  "EUR",
]);

const createSpaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["TRIP", "PARTNER", "PERSONAL", "FAMILY"]),
  currency: spaceCurrencySchema.optional(),
});

export type SpaceActionResult =
  | { ok: true; spaceId: string }
  | { ok: false; error: string };

const updateSpaceSchema = z.object({
  spaceId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  currency: spaceCurrencySchema,
  roundUpToThousand: z.boolean(),
  monthlyBudget: z.number().int().min(0).nullable().optional(),
});

export async function updateSpaceSettings(input: {
  spaceId: string;
  name: string;
  currency: SpaceCurrency;
  roundUpToThousand: boolean;
  monthlyBudget?: number | null;
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

  const space = await prisma.space.findUnique({
    where: { id: parsed.data.spaceId },
    select: { type: true },
  });

  await prisma.space.update({
    where: { id: parsed.data.spaceId },
    data: {
      name: parsed.data.name,
      currency: parsed.data.currency,
      roundUpToThousand: parsed.data.roundUpToThousand,
      ...(getTemplate(space?.type ?? "TRIP").features.budget
        ? {
            monthlyBudget:
              parsed.data.monthlyBudget === undefined
                ? undefined
                : parsed.data.monthlyBudget && parsed.data.monthlyBudget > 0
                  ? parsed.data.monthlyBudget
                  : null,
          }
        : {}),
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
  const currencyRaw = String(formData.get("currency") ?? "TOMAN");
  const currency: SpaceCurrency = isSpaceCurrency(currencyRaw)
    ? currencyRaw
    : "TOMAN";
  const roundUpToThousand = formData.get("roundUpToThousand") === "on";
  const budgetRaw = String(formData.get("monthlyBudget") ?? "").trim();
  const monthlyBudget =
    budgetRaw === ""
      ? null
      : Number.parseInt(budgetRaw.replace(/\D/g, ""), 10);
  const result = await updateSpaceSettings({
    spaceId,
    name,
    currency,
    roundUpToThousand,
    monthlyBudget:
      monthlyBudget != null && Number.isFinite(monthlyBudget)
        ? monthlyBudget
        : null,
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
  currency?: SpaceCurrency;
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
  const currency: SpaceCurrency | undefined = isSpaceCurrency(currencyRaw)
    ? currencyRaw
    : "TOMAN";
  const result = await createSpace({ name, type, currency });
  if (!result.ok) {
    redirect(`/app?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/spaces/${result.spaceId}`);
}
