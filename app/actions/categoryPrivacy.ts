"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import {
  HOME_PRIVACY_CATEGORIES,
  type CategoryPolicyRow,
} from "@/lib/category-privacy";
import { prisma } from "@/lib/db/prisma";
import { assertFeatureEnabled, isFeatureEnabled } from "@/lib/feature-flags";
import { getTemplate } from "@/lib/templates/registry";
import type { ExpenseCategory } from "@/lib/generated/prisma/enums";

const setSchema = z.object({
  spaceId: z.string().min(1),
  category: z
    .string()
    .refine(
      (c): c is ExpenseCategory =>
        (HOME_PRIVACY_CATEGORIES as readonly string[]).includes(c),
      "دسته نامعتبر",
    ),
  private: z.boolean(),
});

export type CategoryPrivacyDTO = CategoryPolicyRow;

export async function listCategoryPolicies(
  spaceId: string,
): Promise<CategoryPrivacyDTO[]> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) return [];

  const features = getTemplate(membership.space.type).features;
  if (!features.categoryPrivacy) return [];
  if (!(await isFeatureEnabled("category_privacy"))) return [];

  const rows = await prisma.spaceCategoryPolicy.findMany({
    where: { spaceId, visibility: "PRIVATE" },
    select: { category: true, visibility: true, ownerUserId: true },
  });
  return rows;
}

export async function setCategoryPrivacy(
  input: z.infer<typeof setSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireUser();
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "داده نامعتبر است." };
  }

  const membership = await requireSpaceMember(
    parsed.data.spaceId,
    session.userId,
  );
  if (!membership) {
    return { ok: false, error: "دسترسی ندارید." };
  }
  if (membership.role === "VIEWER") {
    return { ok: false, error: "ناظر نمی‌تواند حریم دسته را عوض کند." };
  }

  const features = getTemplate(membership.space.type).features;
  if (!features.categoryPrivacy) {
    return { ok: false, error: "این قالب حریم دسته ندارد." };
  }

  const privacyGate = await assertFeatureEnabled(
    "category_privacy",
    "حریم دسته فعلاً غیرفعال است.",
  );
  if (!privacyGate.ok) return privacyGate;

  const { spaceId, category, private: makePrivate } = parsed.data;

  const existing = await prisma.spaceCategoryPolicy.findUnique({
    where: { spaceId_category: { spaceId, category } },
    select: { ownerUserId: true, visibility: true },
  });

  if (makePrivate) {
    if (
      existing &&
      existing.visibility === "PRIVATE" &&
      existing.ownerUserId !== session.userId
    ) {
      return {
        ok: false,
        error: "این دسته الان خصوصیِ عضو دیگری است.",
      };
    }
    await prisma.spaceCategoryPolicy.upsert({
      where: { spaceId_category: { spaceId, category } },
      create: {
        spaceId,
        category,
        visibility: "PRIVATE",
        ownerUserId: session.userId,
      },
      update: {
        visibility: "PRIVATE",
        ownerUserId: session.userId,
      },
    });
  } else {
    if (
      existing &&
      existing.ownerUserId !== session.userId &&
      membership.role !== "OWNER"
    ) {
      return {
        ok: false,
        error: "فقط مالک دستهٔ خصوصی یا مالک دفتر می‌تواند مشترک کند.",
      };
    }
    await prisma.spaceCategoryPolicy.deleteMany({
      where: { spaceId, category },
    });
  }

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath(`/spaces/${spaceId}/settings`);
  return { ok: true };
}
