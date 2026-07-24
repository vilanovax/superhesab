"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { SPEND_CATEGORIES, type ExpenseCategory } from "@/lib/categorizer";
import { asMoney } from "@/lib/money";
import { getTemplate } from "@/lib/templates/registry";

export type CategoryBudgetDTO = {
  category: ExpenseCategory;
  amount: number;
};

export type CategoryBudgetActionResult =
  | { ok: true }
  | { ok: false; error: string };

const upsertSchema = z.object({
  spaceId: z.string().min(1),
  budgets: z.array(
    z.object({
      category: z.enum([
        "FOOD",
        "TRANSPORT",
        "ACCOMMODATION",
        "ENTERTAINMENT",
        "SHOPPING",
        "OTHER",
      ]),
      amount: z.number().int().min(0),
    }),
  ),
});

async function assertCategoryBudgets(spaceId: string, userId: string) {
  const membership = await requireSpaceMember(spaceId, userId);
  if (!membership) {
    return { ok: false as const, error: "به این فضا دسترسی ندارید." };
  }
  if (membership.role !== "OWNER") {
    return { ok: false as const, error: "فقط مالک می‌تواند بودجه دسته را تغییر دهد." };
  }
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { type: true },
  });
  if (!space || !getTemplate(space.type).features.categoryBudgets) {
    return {
      ok: false as const,
      error: "بودجه دسته‌ای در این قالب فعال نیست.",
    };
  }
  return { ok: true as const };
}

export async function listCategoryBudgets(
  spaceId: string,
): Promise<CategoryBudgetDTO[]> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) return [];

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { type: true },
  });
  if (!space || !getTemplate(space.type).features.categoryBudgets) return [];

  const rows = await prisma.categoryBudget.findMany({
    where: { spaceId },
    select: { category: true, amount: true },
  });

  return rows.map((r) => ({
    category: r.category as ExpenseCategory,
    amount: r.amount,
  }));
}

/** Upsert non-zero caps; delete zero/empty entries. */
export async function saveCategoryBudgets(input: {
  spaceId: string;
  budgets: { category: ExpenseCategory; amount: number }[];
}): Promise<CategoryBudgetActionResult> {
  const session = await requireUser();
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "داده بودجه نامعتبر است." };
  }

  const access = await assertCategoryBudgets(
    parsed.data.spaceId,
    session.userId,
  );
  if (!access.ok) return access;

  const allowed = new Set(SPEND_CATEGORIES);
  const cleaned = parsed.data.budgets.filter((b) =>
    allowed.has(b.category as ExpenseCategory),
  );

  try {
    await prisma.$transaction(async (tx) => {
      for (const b of cleaned) {
        const amount = asMoney(b.amount);
        if (amount <= 0) {
          await tx.categoryBudget.deleteMany({
            where: {
              spaceId: parsed.data.spaceId,
              category: b.category,
            },
          });
          continue;
        }
        await tx.categoryBudget.upsert({
          where: {
            spaceId_category: {
              spaceId: parsed.data.spaceId,
              category: b.category,
            },
          },
          create: {
            spaceId: parsed.data.spaceId,
            category: b.category,
            amount,
          },
          update: { amount },
        });
      }
    });

    revalidatePath(`/spaces/${parsed.data.spaceId}`);
    revalidatePath(`/spaces/${parsed.data.spaceId}/settings`);
    return { ok: true };
  } catch {
    return { ok: false, error: "ذخیره بودجه دسته‌ای ناموفق بود." };
  }
}
