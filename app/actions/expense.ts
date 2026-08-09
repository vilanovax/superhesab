"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import {
  allowedCategoriesForSpace,
  guessCategoryFromTitle,
} from "@/lib/categorizer";
import { privateCategoriesHiddenFromViewer } from "@/lib/category-privacy";
import { expenseDayKey, parseExpenseDateInput } from "@/lib/format";
import type { ExpenseCategory } from "@/lib/generated/prisma/enums";
import { jalaliYearBounds } from "@/lib/jalali";
import {
  asMoney,
  calculatePercentageSplits,
  calculateWeightedSplits,
  clampShare,
  DEFAULT_SHARE,
} from "@/lib/money";
import { canMutateMoney } from "@/lib/rbac";
import {
  expenseEditSelect,
  queryExpenseLedgerPage,
} from "@/lib/spaces/expense-ledger";
import { getTemplate } from "@/lib/templates/registry";
import {
  expenseSchema,
  type ExpenseFormValues,
} from "@/lib/validations/expense";
import type { SpaceType } from "@/types";

export type ExpenseActionResult =
  | { ok: true; expenseId: string }
  | { ok: false; error: string };

/** Serializable edit-form payload (splits loaded on demand). */
export type ExpenseForEdit = {
  expenseId: string;
  title: string;
  totalAmount: number;
  paidById: string;
  date: string;
  category: ExpenseCategory;
  categoryLabel: string | null;
  transactionType: "EXPENSE" | "INCOME";
  splitMode: "EQUAL" | "EXACT" | "PERCENT";
  splitAmounts: Record<string, number>;
  splitShares: Record<string, number>;
  splitPercents: Record<string, number>;
};

export type GetExpenseForEditResult =
  | { ok: true; expense: ExpenseForEdit }
  | { ok: false; error: string };

type OwedRow = {
  userId: string;
  owedAmount: number;
  share: number;
  percent: number | null;
};

async function assertCategoryNotHidden(
  spaceId: string,
  spaceType: SpaceType,
  userId: string,
  category: ExpenseCategory | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (category === undefined) return { ok: true };
  if (!getTemplate(spaceType).features.categoryPrivacy) return { ok: true };

  const [policies, spaceMeta] = await Promise.all([
    prisma.spaceCategoryPolicy.findMany({
      where: { spaceId, visibility: "PRIVATE" },
      select: { category: true, visibility: true, ownerUserId: true },
    }),
    prisma.space.findUnique({
      where: { id: spaceId },
      select: { ownerId: true },
    }),
  ]);
  const hidden = privateCategoriesHiddenFromViewer(policies, userId, {
    spaceOwnerId: spaceMeta?.ownerId,
    viewerIsSpaceOwner: spaceMeta?.ownerId === userId,
  });
  if (hidden.includes(category)) {
    return { ok: false, error: "این دسته خصوصیِ عضو دیگری است." };
  }
  return { ok: true };
}

async function assertCanMutateExpense(spaceId: string, userId: string) {
  const membership = await requireSpaceMember(spaceId, userId);
  if (!membership) {
    return { ok: false as const, error: "به این فضا دسترسی ندارید." };
  }
  if (!canMutateMoney(membership.role)) {
    return {
      ok: false as const,
      error: "نقش ناظر اجازه ثبت یا ویرایش هزینه ندارد.",
    };
  }
  return { ok: true as const, membership };
}

function personalOwedRows(
  userId: string,
  totalAmount: number,
): OwedRow[] {
  return [
    {
      userId,
      owedAmount: asMoney(totalAmount),
      share: DEFAULT_SHARE,
      percent: null,
    },
  ];
}

async function resolveOwedRows(
  input: ExpenseFormValues,
  options: {
    forcePersonalUserId?: string;
    householdPaidById?: string;
  },
): Promise<{ ok: true; owedByUser: OwedRow[] } | { ok: false; error: string }> {
  if (options.forcePersonalUserId) {
    return {
      ok: true,
      owedByUser: personalOwedRows(
        options.forcePersonalUserId,
        input.totalAmount,
      ),
    };
  }

  if (options.householdPaidById) {
    const members = await prisma.spaceMember.findMany({
      where: { spaceId: input.spaceId },
      select: { userId: true },
    });
    const memberIds = new Set(members.map((m) => m.userId));
    if (!memberIds.has(options.householdPaidById)) {
      return { ok: false, error: "پرداخت‌کننده عضو این فضا نیست." };
    }
    return {
      ok: true,
      owedByUser: personalOwedRows(
        options.householdPaidById,
        input.totalAmount,
      ),
    };
  }

  const members = await prisma.spaceMember.findMany({
    where: { spaceId: input.spaceId },
    select: { userId: true },
  });
  const memberIds = new Set(members.map((m) => m.userId));

  if (!memberIds.has(input.paidById)) {
    return { ok: false, error: "پرداخت‌کننده عضو این فضا نیست." };
  }

  const selected = input.splits.filter((s) => s.selected);
  if (selected.length === 0) {
    return { ok: false, error: "حداقل یک نفر باید در تسهیم باشد." };
  }

  for (const split of selected) {
    if (!memberIds.has(split.userId)) {
      return { ok: false, error: "یکی از افراد تسهیم عضو فضا نیست." };
    }
  }

  const total = asMoney(input.totalAmount);
  let owedByUser: OwedRow[];

  if (input.splitMode === "EQUAL") {
    try {
      const ordered = [...selected]
        .map((s) => ({
          userId: s.userId,
          share: clampShare(s.share ?? DEFAULT_SHARE),
        }))
        .sort((a, b) => a.userId.localeCompare(b.userId));
      const parts = calculateWeightedSplits(total, ordered);
      owedByUser = parts.map((row) => ({
        userId: row.userId,
        owedAmount: row.amount,
        share: row.share,
        percent: null,
      }));
    } catch {
      return { ok: false, error: "ضریب تسهیم نامعتبر است." };
    }
  } else if (input.splitMode === "PERCENT") {
    if (selected.some((s) => s.percent < 1)) {
      return {
        ok: false,
        error: "درصد هر نفر انتخاب‌شده باید حداقل ۱ باشد.",
      };
    }
    const percentSum = selected.reduce((acc, s) => acc + s.percent, 0);
    if (percentSum !== 100) {
      return {
        ok: false,
        error: `جمع درصدها (${percentSum}) باید ۱۰۰ باشد.`,
      };
    }
    try {
      const ordered = [...selected]
        .map((s) => ({
          userId: s.userId,
          percent: s.percent,
        }))
        .sort((a, b) => a.userId.localeCompare(b.userId));
      const parts = calculatePercentageSplits(total, ordered);
      owedByUser = parts.map((row) => ({
        userId: row.userId,
        owedAmount: row.amount,
        share: DEFAULT_SHARE,
        percent: row.percent,
      }));
    } catch {
      return { ok: false, error: "درصد تسهیم نامعتبر است." };
    }
  } else {
    if (selected.some((s) => s.amount < 1)) {
      return {
        ok: false,
        error: "سهم هر نفر انتخاب‌شده باید بیشتر از صفر باشد.",
      };
    }
    const sum = selected.reduce((acc, s) => acc + s.amount, 0);
    if (sum !== input.totalAmount) {
      return {
        ok: false,
        error: `جمع سهم‌ها (${sum}) باید برابر مبلغ کل باشد.`,
      };
    }
    owedByUser = selected.map((s) => ({
      userId: s.userId,
      owedAmount: s.amount,
      share: DEFAULT_SHARE,
      percent: null,
    }));
  }

  return { ok: true, owedByUser };
}

export async function addExpense(
  data: ExpenseFormValues,
): Promise<ExpenseActionResult> {
  const parsed = expenseSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

  const session = await requireUser();
  const input = parsed.data;
  const access = await assertCanMutateExpense(input.spaceId, session.userId);
  if (!access.ok) return access;

  const spaceType = access.membership.space.type;
  const features = getTemplate(spaceType).features;
  const transactionType = features.incomeExpense
    ? (input.transactionType ?? "EXPENSE")
    : "EXPENSE";

  const paidById = features.solo ? session.userId : input.paidById;
  const resolved = await resolveOwedRows(
    { ...input, paidById },
    {
      forcePersonalUserId: features.solo ? session.userId : undefined,
      householdPaidById:
        features.householdLedger || features.buildingCharges
          ? paidById
          : undefined,
    },
  );
  if (!resolved.ok) return resolved;

  const allowedCategories = allowedCategoriesForSpace({
    buildingCharges: features.buildingCharges,
    transactionType,
  });
  if (
    input.category !== undefined &&
    !allowedCategories.includes(input.category)
  ) {
    return {
      ok: false,
      error: "دسته با نوع تراکنش هم‌خوان نیست.",
    };
  }

  const privacy = await assertCategoryNotHidden(
    input.spaceId,
    spaceType,
    session.userId,
    input.category,
  );
  if (!privacy.ok) return privacy;

  const customLabel = input.categoryLabel?.trim() || null;
  const fallbackBucket =
    transactionType === "INCOME" ? "OTHER_INCOME" : "OTHER";
  const hasManualCategory = input.category !== undefined;
  const categoryLocked = hasManualCategory || Boolean(customLabel);
  // Explicit category wins (e.g. BUILDING_BILLS + tag in categoryLabel).
  // Freeform label alone still maps to OTHER / OTHER_INCOME.
  let category = hasManualCategory
    ? input.category!
    : customLabel
      ? fallbackBucket
      : guessCategoryFromTitle(input.title, transactionType, {
          building: features.buildingCharges,
        });

  const guessedPrivacy = await assertCategoryNotHidden(
    input.spaceId,
    spaceType,
    session.userId,
    category,
  );
  if (!guessedPrivacy.ok) {
    category = fallbackBucket;
  }

  try {
    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          spaceId: input.spaceId,
          title: input.title,
          totalAmount: input.totalAmount,
          paidById,
          createdById: session.userId,
          updatedById: session.userId,
          date: parseExpenseDateInput(input.date),
          transactionType,
          category,
          categoryLabel: customLabel,
          isCategoryLocked: categoryLocked,
          splitMode: input.splitMode,
        },
      });

      await tx.expenseSplit.createMany({
        data: resolved.owedByUser.map((row) => ({
          expenseId: created.id,
          userId: row.userId,
          owedAmount: row.owedAmount,
          share: row.share,
          percent: row.percent,
        })),
      });

      return created;
    });

    revalidatePath(`/spaces/${input.spaceId}`);
    revalidatePath("/app");

    return { ok: true, expenseId: expense.id };
  } catch {
    return { ok: false, error: "ثبت هزینه ناموفق بود. دوباره تلاش کنید." };
  }
}

export async function updateExpense(
  expenseId: string,
  data: ExpenseFormValues,
): Promise<ExpenseActionResult> {
  const parsed = expenseSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

  const session = await requireUser();
  const input = parsed.data;
  const access = await assertCanMutateExpense(input.spaceId, session.userId);
  if (!access.ok) return access;

  const spaceType = access.membership.space.type;
  const features = getTemplate(spaceType).features;
  const transactionType = features.incomeExpense
    ? (input.transactionType ?? "EXPENSE")
    : "EXPENSE";

  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, spaceId: input.spaceId },
    select: {
      id: true,
      category: true,
      categoryLabel: true,
      isCategoryLocked: true,
      transactionType: true,
      createdById: true,
    },
  });
  if (!existing) {
    return { ok: false, error: "هزینه پیدا نشد." };
  }

  if (
    access.membership.role === "EDITOR" &&
    existing.createdById !== session.userId
  ) {
    return {
      ok: false,
      error: "فقط می‌توانید تراکنش‌هایی را ویرایش کنید که خودتان ثبت کرده‌اید.",
    };
  }

  const paidById = features.solo ? session.userId : input.paidById;
  const resolved = await resolveOwedRows(
    { ...input, paidById },
    {
      forcePersonalUserId: features.solo ? session.userId : undefined,
      householdPaidById:
        features.householdLedger || features.buildingCharges
          ? paidById
          : undefined,
    },
  );
  if (!resolved.ok) return resolved;

  const allowedCategories = allowedCategoriesForSpace({
    buildingCharges: features.buildingCharges,
    transactionType,
  });
  if (
    input.category !== undefined &&
    !allowedCategories.includes(input.category)
  ) {
    return {
      ok: false,
      error: "دسته با نوع تراکنش هم‌خوان نیست.",
    };
  }

  const privacy = await assertCategoryNotHidden(
    input.spaceId,
    spaceType,
    session.userId,
    input.category,
  );
  if (!privacy.ok) return privacy;

  const fallbackBucket =
    transactionType === "INCOME" ? "OTHER_INCOME" : "OTHER";
  let category = existing.category;
  let categoryLabel = existing.categoryLabel;
  let isCategoryLocked = existing.isCategoryLocked;

  if (input.category !== undefined) {
    category = input.category;
    isCategoryLocked = true;
    if (input.category !== existing.category && input.categoryLabel === undefined) {
      categoryLabel = null;
    }
  }

  if (input.categoryLabel !== undefined) {
    const nextLabel = input.categoryLabel?.trim() || null;
    categoryLabel = nextLabel;
    if (nextLabel) {
      isCategoryLocked = true;
      // Custom freeform category only when no/OTHER bucket — keep BUILDING_* + tag.
      if (
        input.category === undefined &&
        (category === "OTHER" || category === "OTHER_INCOME")
      ) {
        category = fallbackBucket;
      } else if (
        input.category === "OTHER" ||
        input.category === "OTHER_INCOME"
      ) {
        category = input.category;
      }
    }
  }

  if (
    !isCategoryLocked &&
    input.categoryLabel === undefined &&
    input.category === undefined
  ) {
    category = guessCategoryFromTitle(input.title, transactionType, {
      building: features.buildingCharges,
    });
    categoryLabel = null;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: expenseId },
        data: {
          title: input.title,
          totalAmount: input.totalAmount,
          paidById,
          date: parseExpenseDateInput(input.date),
          transactionType,
          category,
          categoryLabel,
          isCategoryLocked,
          updatedById: session.userId,
          splitMode: input.splitMode,
        },
      });

      await tx.expenseSplit.deleteMany({ where: { expenseId } });
      await tx.expenseSplit.createMany({
        data: resolved.owedByUser.map((row) => ({
          expenseId,
          userId: row.userId,
          owedAmount: row.owedAmount,
          share: row.share,
          percent: row.percent,
        })),
      });
    });

    revalidatePath(`/spaces/${input.spaceId}`);
    revalidatePath("/app");

    return { ok: true, expenseId };
  } catch {
    return { ok: false, error: "ویرایش هزینه ناموفق بود." };
  }
}

export async function deleteExpense(
  expenseId: string,
  spaceId: string,
): Promise<ExpenseActionResult> {
  const session = await requireUser();
  const access = await assertCanMutateExpense(spaceId, session.userId);
  if (!access.ok) return access;

  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, spaceId },
    select: { id: true, createdById: true },
  });
  if (!existing) {
    return { ok: false, error: "هزینه پیدا نشد." };
  }

  if (
    access.membership.role === "EDITOR" &&
    existing.createdById !== session.userId
  ) {
    return {
      ok: false,
      error: "فقط می‌توانید تراکنش‌هایی را حذف کنید که خودتان ثبت کرده‌اید.",
    };
  }

  try {
    await prisma.expense.delete({ where: { id: expenseId } });
    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath("/app");
    return { ok: true, expenseId };
  } catch {
    return { ok: false, error: "حذف هزینه ناموفق بود." };
  }
}

export type LoadMoreExpensesResult =
  | {
      ok: true;
      expenses: Awaited<
        ReturnType<typeof queryExpenseLedgerPage>
      >["expenses"];
      hasMore: boolean;
    }
  | { ok: false; error: string };

/**
 * Fetch one expense with splits for the edit form.
 * List paint omits splits; call this when the user opens edit.
 */
export async function getExpenseForEdit(
  expenseId: string,
  spaceId: string,
): Promise<GetExpenseForEditResult> {
  const session = await requireUser();
  const access = await assertCanMutateExpense(spaceId, session.userId);
  if (!access.ok) return access;

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, spaceId },
    select: expenseEditSelect,
  });
  if (!expense) {
    return { ok: false, error: "هزینه پیدا نشد." };
  }

  if (
    access.membership.role === "EDITOR" &&
    expense.createdById !== session.userId
  ) {
    return {
      ok: false,
      error: "فقط می‌توانید تراکنش‌هایی را ویرایش کنید که خودتان ثبت کرده‌اید.",
    };
  }

  const spaceType = access.membership.space.type;
  const privacy = await assertCategoryNotHidden(
    spaceId,
    spaceType,
    session.userId,
    expense.category,
  );
  if (!privacy.ok) return privacy;

  const splitPercents: Record<string, number> = {};
  for (const s of expense.splits) {
    if (typeof s.percent === "number") {
      splitPercents[s.userId] = s.percent;
    }
  }

  return {
    ok: true,
    expense: {
      expenseId: expense.id,
      title: expense.title,
      totalAmount: expense.totalAmount,
      paidById: expense.paidById,
      date: expenseDayKey(expense.date),
      category: expense.category,
      categoryLabel: expense.categoryLabel,
      transactionType: expense.transactionType,
      splitMode: expense.splitMode,
      splitAmounts: Object.fromEntries(
        expense.splits.map((s) => [s.userId, s.owedAmount]),
      ),
      splitShares: Object.fromEntries(
        expense.splits.map((s) => [s.userId, s.share]),
      ),
      splitPercents,
    },
  };
}

/** Keyset page after the last visible expense (newest → older). */
export async function loadMoreSpaceExpenses(
  spaceId: string,
  cursor: { date: string; id: string },
  options?: { year?: number },
): Promise<LoadMoreExpensesResult> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "دسترسی به این فضا ندارید." };
  }

  const cursorDate = new Date(cursor.date);
  if (!cursor.id || Number.isNaN(cursorDate.getTime())) {
    return { ok: false, error: "نشانگر صفحه نامعتبر است." };
  }

  const features = getTemplate(membership.space.type).features;
  const categoryPolicies = features.categoryPrivacy
    ? await prisma.spaceCategoryPolicy.findMany({
        where: { spaceId, visibility: "PRIVATE" },
        select: {
          category: true,
          visibility: true,
          ownerUserId: true,
        },
      })
    : [];
  const hiddenCategories = privateCategoriesHiddenFromViewer(
    categoryPolicies,
    session.userId,
    {
      spaceOwnerId: membership.space.ownerId,
      viewerIsSpaceOwner: membership.role === "OWNER",
    },
  );

  const year = options?.year;
  const bounds =
    features.buildingCharges &&
    year != null &&
    year >= 1390 &&
    year <= 1500
      ? jalaliYearBounds(year)
      : null;

  const page = await queryExpenseLedgerPage({
    spaceId,
    hiddenCategories,
    cursor: { date: cursorDate, id: cursor.id },
    dateFrom: bounds?.start,
    dateTo: bounds?.end,
    viewerUserId: session.userId,
  });

  return { ok: true, expenses: page.expenses, hasMore: page.hasMore };
}
