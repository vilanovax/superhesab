/**
 * Pure helpers for خانه category privacy (SHARED default / PRIVATE per owner).
 * See docs/home-category-privacy-prd.md.
 */

import type { ExpenseCategory } from "@/lib/generated/prisma/enums";
import {
  INCOME_CATEGORIES,
  SPEND_CATEGORIES,
} from "@/lib/categorizer";

export type CategoryPolicyRow = {
  category: ExpenseCategory;
  visibility: "SHARED" | "PRIVATE";
  ownerUserId: string;
};

/** Builtin categories that can be toggled private on خانه. */
export const HOME_PRIVACY_CATEGORIES: ExpenseCategory[] = [
  ...SPEND_CATEGORIES,
  ...INCOME_CATEGORIES,
];

export function privateCategoriesHiddenFromViewer(
  policies: CategoryPolicyRow[],
  viewerUserId: string,
  opts?: { spaceOwnerId?: string | null; viewerIsSpaceOwner?: boolean },
): ExpenseCategory[] {
  if (opts?.viewerIsSpaceOwner || opts?.spaceOwnerId === viewerUserId) {
    return [];
  }
  return policies
    .filter(
      (p) =>
        p.visibility === "PRIVATE" && p.ownerUserId !== viewerUserId,
    )
    .map((p) => p.category);
}

export function isCategoryVisibleToViewer(
  category: ExpenseCategory,
  policies: CategoryPolicyRow[],
  viewerUserId: string,
  opts?: { spaceOwnerId?: string | null; viewerIsSpaceOwner?: boolean },
): boolean {
  const hidden = privateCategoriesHiddenFromViewer(
    policies,
    viewerUserId,
    opts,
  );
  return !hidden.includes(category);
}

export function filterCategoriesForViewer(
  categories: ExpenseCategory[],
  policies: CategoryPolicyRow[],
  viewerUserId: string,
  opts?: { spaceOwnerId?: string | null; viewerIsSpaceOwner?: boolean },
): ExpenseCategory[] {
  return categories.filter((c) =>
    isCategoryVisibleToViewer(c, policies, viewerUserId, opts),
  );
}

export function expenseVisibleToViewer(
  expense: { category: ExpenseCategory },
  policies: CategoryPolicyRow[],
  viewerUserId: string,
  opts?: { spaceOwnerId?: string | null; viewerIsSpaceOwner?: boolean },
): boolean {
  return isCategoryVisibleToViewer(
    expense.category,
    policies,
    viewerUserId,
    opts,
  );
}

/** Prisma `where` fragment: exclude others' private categories. */
export function expenseCategoryPrivacyWhere(
  policies: CategoryPolicyRow[],
  viewerUserId: string,
  opts?: { spaceOwnerId?: string | null; viewerIsSpaceOwner?: boolean },
): { category?: { notIn: ExpenseCategory[] } } {
  const hidden = privateCategoriesHiddenFromViewer(
    policies,
    viewerUserId,
    opts,
  );
  if (hidden.length === 0) return {};
  return { category: { notIn: hidden } };
}
