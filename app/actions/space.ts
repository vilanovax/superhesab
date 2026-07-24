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
  type: z.enum(["TRIP", "PARTNER", "PERSONAL", "FAMILY", "BUILDING"]),
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
  /** Jalali year for BUILDING charge dashboard default */
  defaultPlanYear: z.number().int().min(1390).max(1500).nullable().optional(),
});

export async function updateSpaceSettings(input: {
  spaceId: string;
  name: string;
  currency: SpaceCurrency;
  roundUpToThousand: boolean;
  monthlyBudget?: number | null;
  defaultPlanYear?: number | null;
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

  const features = getTemplate(space?.type ?? "TRIP").features;

  await prisma.space.update({
    where: { id: parsed.data.spaceId },
    data: {
      name: parsed.data.name,
      currency: parsed.data.currency,
      roundUpToThousand: parsed.data.roundUpToThousand,
      ...(features.budget
        ? {
            monthlyBudget:
              parsed.data.monthlyBudget === undefined
                ? undefined
                : parsed.data.monthlyBudget && parsed.data.monthlyBudget > 0
                  ? parsed.data.monthlyBudget
                  : null,
          }
        : {}),
      ...(features.buildingCharges
        ? {
            defaultPlanYear:
              parsed.data.defaultPlanYear === undefined
                ? undefined
                : parsed.data.defaultPlanYear &&
                    parsed.data.defaultPlanYear >= 1390
                  ? parsed.data.defaultPlanYear
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
  const planYearRaw = String(formData.get("defaultPlanYear") ?? "").trim();
  const defaultPlanYear =
    planYearRaw === ""
      ? null
      : Number.parseInt(planYearRaw.replace(/\D/g, ""), 10);
  const result = await updateSpaceSettings({
    spaceId,
    name,
    currency,
    roundUpToThousand,
    monthlyBudget:
      monthlyBudget != null && Number.isFinite(monthlyBudget)
        ? monthlyBudget
        : null,
    defaultPlanYear:
      defaultPlanYear != null && Number.isFinite(defaultPlanYear)
        ? defaultPlanYear
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

export type SpaceLifecycleResult =
  | { ok: true; spaceId: string; name: string }
  | { ok: false; error: string };

async function requireOwnerMembership(spaceId: string, userId: string) {
  const membership = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId } },
    include: {
      space: {
        select: { id: true, name: true, archivedAt: true, ownerId: true },
      },
    },
  });
  if (!membership || membership.role !== "OWNER") {
    return null;
  }
  return membership;
}

/** Soft-archive: hide from home; space routes become inaccessible. */
export async function archiveSpace(
  spaceId: string,
): Promise<SpaceLifecycleResult> {
  const session = await requireUser();
  const membership = await requireOwnerMembership(spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "فقط مالک می‌تواند دفتر را آرشیو کند." };
  }
  if (membership.space.archivedAt) {
    return { ok: false, error: "این دفتر از قبل آرشیو شده است." };
  }

  await prisma.space.update({
    where: { id: spaceId },
    data: { archivedAt: new Date() },
  });

  revalidatePath("/app");
  revalidatePath("/app/archive");
  revalidatePath(`/spaces/${spaceId}`);
  return { ok: true, spaceId, name: membership.space.name };
}

/** Restore archived space back to the active list. */
export async function restoreSpace(
  spaceId: string,
): Promise<SpaceLifecycleResult> {
  const session = await requireUser();
  const membership = await requireOwnerMembership(spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "فقط مالک می‌تواند دفتر را از آرشیو برگرداند." };
  }
  if (!membership.space.archivedAt) {
    return { ok: false, error: "این دفتر در آرشیو نیست." };
  }

  await prisma.space.update({
    where: { id: spaceId },
    data: { archivedAt: null },
  });

  revalidatePath("/app");
  revalidatePath("/app/archive");
  revalidatePath(`/spaces/${spaceId}`);
  return { ok: true, spaceId, name: membership.space.name };
}

/**
 * Permanent delete — only allowed after archive (safety gate).
 * Cascades expenses / units / charges via Prisma relations.
 */
export async function permanentlyDeleteSpace(
  spaceId: string,
): Promise<SpaceLifecycleResult> {
  const session = await requireUser();
  const membership = await requireOwnerMembership(spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "فقط مالک می‌تواند دفتر را حذف کند." };
  }
  if (!membership.space.archivedAt) {
    return {
      ok: false,
      error: "برای امنیت بیشتر، اول دفتر را آرشیو کنید؛ حذف فقط از صفحه آرشیو ممکن است.",
    };
  }

  const name = membership.space.name;
  await prisma.space.delete({ where: { id: spaceId } });

  revalidatePath("/app");
  revalidatePath("/app/archive");
  return { ok: true, spaceId, name };
}
