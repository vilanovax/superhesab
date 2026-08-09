"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import {
  categoriesForType,
  type ExpenseCategory,
  type TransactionType,
} from "@/lib/categorizer";
import { asMoney, DEFAULT_SHARE } from "@/lib/money";
import {
  tehranDayOfMonth,
  tehranMonthKey,
  tehranMonthRange,
} from "@/lib/personal";
import { getTemplate } from "@/lib/templates/registry";
import { parseExpenseDateInput } from "@/lib/format";

export type RecurringRuleDTO = {
  id: string;
  title: string;
  amount: number;
  transactionType: TransactionType;
  category: ExpenseCategory;
  dayOfMonth: number;
  active: boolean;
};

export type RecurringActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const categoryEnum = z.enum([
  "FOOD",
  "TRANSPORT",
  "ACCOMMODATION",
  "ENTERTAINMENT",
  "SHOPPING",
  "OTHER",
  "SALARY",
  "TRANSFER",
  "OTHER_INCOME",
]);

const createRuleSchema = z.object({
  spaceId: z.string().min(1),
  title: z.string().trim().min(2).max(120),
  amount: z.number().int().positive(),
  transactionType: z.enum(["EXPENSE", "INCOME"]),
  category: categoryEnum,
  dayOfMonth: z.number().int().min(1).max(28),
});

const toggleSchema = z.object({
  spaceId: z.string().min(1),
  ruleId: z.string().min(1),
  active: z.boolean(),
});

const deleteSchema = z.object({
  spaceId: z.string().min(1),
  ruleId: z.string().min(1),
});

async function assertRecurring(
  spaceId: string,
  userId: string,
  needOwner = false,
) {
  const membership = await requireSpaceMember(spaceId, userId);
  if (!membership) {
    return { ok: false as const, error: "به این فضا دسترسی ندارید." };
  }
  if (needOwner && membership.role !== "OWNER") {
    return {
      ok: false as const,
      error: "فقط مالک می‌تواند قوانین تکرارپذیر را مدیریت کند.",
    };
  }
  if (!needOwner && membership.role === "VIEWER") {
    return { ok: false as const, error: "نقش ناظر اجازه تغییر ندارد." };
  }
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { type: true },
  });
  if (!space || !getTemplate(space.type).features.recurring) {
    return {
      ok: false as const,
      error: "تراکنش تکرارپذیر در این قالب فعال نیست.",
    };
  }
  return { ok: true as const, membership };
}

export async function listRecurringRules(
  spaceId: string,
): Promise<RecurringRuleDTO[]> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) return [];

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { type: true },
  });
  if (!space || !getTemplate(space.type).features.recurring) return [];

  const rows = await prisma.recurringRule.findMany({
    where: { spaceId },
    orderBy: [{ active: "desc" }, { dayOfMonth: "asc" }, { createdAt: "desc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    amount: r.amount,
    transactionType: r.transactionType as TransactionType,
    category: r.category as ExpenseCategory,
    dayOfMonth: r.dayOfMonth,
    active: r.active,
  }));
}

export async function createRecurringRule(input: {
  spaceId: string;
  title: string;
  amount: number;
  transactionType: TransactionType;
  category: ExpenseCategory;
  dayOfMonth: number;
}): Promise<RecurringActionResult> {
  const session = await requireUser();
  const parsed = createRuleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

  const access = await assertRecurring(parsed.data.spaceId, session.userId, true);
  if (!access.ok) return access;

  const allowed = categoriesForType(parsed.data.transactionType);
  if (!allowed.includes(parsed.data.category as ExpenseCategory)) {
    return { ok: false, error: "دسته با نوع تراکنش هم‌خوان نیست." };
  }

  try {
    const rule = await prisma.recurringRule.create({
      data: {
        spaceId: parsed.data.spaceId,
        title: parsed.data.title,
        amount: asMoney(parsed.data.amount),
        transactionType: parsed.data.transactionType,
        category: parsed.data.category,
        dayOfMonth: parsed.data.dayOfMonth,
        createdById: session.userId,
        active: true,
      },
    });
    revalidatePath(`/spaces/${parsed.data.spaceId}`);
    revalidatePath(`/spaces/${parsed.data.spaceId}/settings`);
    return { ok: true, id: rule.id };
  } catch {
    return { ok: false, error: "ثبت قانون ناموفق بود." };
  }
}

export async function setRecurringRuleActive(input: {
  spaceId: string;
  ruleId: string;
  active: boolean;
}): Promise<RecurringActionResult> {
  const session = await requireUser();
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "داده نامعتبر است." };
  }
  const access = await assertRecurring(parsed.data.spaceId, session.userId, true);
  if (!access.ok) return access;

  const updated = await prisma.recurringRule.updateMany({
    where: { id: parsed.data.ruleId, spaceId: parsed.data.spaceId },
    data: { active: parsed.data.active },
  });
  if (updated.count === 0) {
    return { ok: false, error: "قانون پیدا نشد." };
  }
  revalidatePath(`/spaces/${parsed.data.spaceId}`);
  revalidatePath(`/spaces/${parsed.data.spaceId}/settings`);
  return { ok: true, id: parsed.data.ruleId };
}

export async function deleteRecurringRule(input: {
  spaceId: string;
  ruleId: string;
}): Promise<RecurringActionResult> {
  const session = await requireUser();
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "داده نامعتبر است." };
  }
  const access = await assertRecurring(parsed.data.spaceId, session.userId, true);
  if (!access.ok) return access;

  await prisma.recurringRule.deleteMany({
    where: { id: parsed.data.ruleId, spaceId: parsed.data.spaceId },
  });
  revalidatePath(`/spaces/${parsed.data.spaceId}`);
  revalidatePath(`/spaces/${parsed.data.spaceId}/settings`);
  return { ok: true, id: parsed.data.ruleId };
}

/**
 * Materialize due recurring rules for the current Tehran month.
 * Idempotent via RecurringOccurrence unique (ruleId, monthKey).
 * Only creates for the current month (no multi-month backfill).
 * Requires an authenticated space member (not callable for arbitrary spaceIds).
 */
export async function ensureRecurringExpenses(spaceId: string): Promise<void> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) return;

  const space = membership.space;
  if (!getTemplate(space.type).features.recurring) return;

  const now = new Date();
  const monthKey = tehranMonthKey(now);
  const day = tehranDayOfMonth(now);
  const { start } = tehranMonthRange(now);

  const rules = await prisma.recurringRule.findMany({
    where: {
      spaceId,
      active: true,
      dayOfMonth: { lte: day },
    },
  });
  if (rules.length === 0) return;

  const existing = await prisma.recurringOccurrence.findMany({
    where: {
      monthKey,
      ruleId: { in: rules.map((r) => r.id) },
    },
    select: { ruleId: true },
  });
  const done = new Set(existing.map((e) => e.ruleId));
  let created = 0;

  for (const rule of rules) {
    if (done.has(rule.id)) continue;

    const dayStr = String(rule.dayOfMonth).padStart(2, "0");
    const isoDate = `${monthKey}-${dayStr}`;
    const expenseDate = parseExpenseDateInput(isoDate);
    // Clamp into month if parse drifts
    const date =
      expenseDate < start
        ? start
        : expenseDate;

    const payerId = space.ownerId;

    try {
      await prisma.$transaction(async (tx) => {
        const expense = await tx.expense.create({
          data: {
            spaceId,
            title: rule.title,
            totalAmount: rule.amount,
            paidById: payerId,
            createdById: rule.createdById,
            updatedById: rule.createdById,
            transactionType: rule.transactionType,
            category: rule.category,
            isCategoryLocked: true,
            date,
            splits: {
              create: [
                {
                  userId: payerId,
                  owedAmount: rule.amount,
                  share: DEFAULT_SHARE,
                },
              ],
            },
          },
        });

        await tx.recurringOccurrence.create({
          data: {
            ruleId: rule.id,
            monthKey,
            expenseId: expense.id,
          },
        });
      });
      created += 1;
    } catch {
      // Unique race or concurrent open — safe to ignore
    }
  }

  // Only invalidate when something new appeared (avoids noop full-page refresh).
  if (created > 0) {
    revalidatePath(`/spaces/${spaceId}`);
  }
}
