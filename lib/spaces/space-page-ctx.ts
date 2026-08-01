import { cache } from "react";
import { getBuildingManagerView } from "@/app/actions/building";
import { getFundDashboard, listFundProofsForManager } from "@/app/actions/fund";
import { getSpaceBalances } from "@/app/actions/settlement";
import { requireSpaceMember } from "@/lib/auth/guards";
import {
  privateCategoriesHiddenFromViewer,
} from "@/lib/category-privacy";
import { prisma } from "@/lib/db/prisma";
import {
  tehranCivilMonth,
  tehranCivilYear,
} from "@/lib/building";
import { jalaliMonthBounds, jalaliYearBounds } from "@/lib/jalali";
import { tehranMonthRange } from "@/lib/personal";
import type { SessionPayload } from "@/lib/session";
import { getTemplate } from "@/lib/templates/registry";
import {
  resolveDefaultTab,
  type SpaceTabId,
} from "@/lib/spaces/space-tab-data";
import type { ExpenseCategory } from "@/lib/generated/prisma/enums";

export type SpaceMembership = NonNullable<
  Awaited<ReturnType<typeof requireSpaceMember>>
>;

export type SpacePageSearchParams = {
  year?: string;
  tab?: string;
  rm?: string;
  period?: string;
};

export type SpacePageCtx = {
  id: string;
  session: SessionPayload;
  membership: SpaceMembership;
  features: ReturnType<typeof getTemplate>["features"];
  planYear: number;
  reportMonth: number | null;
  fundPeriod: number | undefined;
  monthRange: { start: Date; end: Date };
  reportRange: { start: Date; end: Date } | null;
  activeTab: SpaceTabId;
  hiddenCategories: ExpenseCategory[];
  hiddenCategoriesKey: string;
};

const memberUserSelect = {
  id: true,
  name: true,
  phone: true,
  avatarUrl: true,
  isVirtual: true,
} as const;

function categoryPrivacyFilter(hiddenCategories: ExpenseCategory[]) {
  return hiddenCategories.length > 0
    ? { category: { notIn: hiddenCategories } }
    : {};
}

/** Light setup only — safe to await before first paint of chrome. */
export async function resolveSpacePageCtx(input: {
  id: string;
  session: SessionPayload;
  membership: SpaceMembership;
  searchParams: SpacePageSearchParams;
}): Promise<SpacePageCtx> {
  const { id, session, membership, searchParams } = input;
  const { year: yearParam, tab: tabParam, rm: reportMonthParam, period: periodParam } =
    searchParams;

  const template = getTemplate(membership.space.type);
  const { features } = template;

  const yearOverrideRaw = Number.parseInt(
    String(yearParam ?? "").replace(/\D/g, ""),
    10,
  );
  const yearOverride =
    Number.isFinite(yearOverrideRaw) &&
    yearOverrideRaw >= 1390 &&
    yearOverrideRaw <= 1500
      ? yearOverrideRaw
      : undefined;

  const planYear =
    yearOverride ??
    membership.space.defaultPlanYear ??
    tehranCivilYear();

  const reportMonthRaw = Number.parseInt(
    String(reportMonthParam ?? "").replace(/\D/g, ""),
    10,
  );
  const reportMonth =
    features.buildingCharges &&
    Number.isFinite(reportMonthRaw) &&
    reportMonthRaw >= 1 &&
    reportMonthRaw <= 12
      ? reportMonthRaw
      : null;

  const fundPeriodRaw = Number.parseInt(
    String(periodParam ?? "").replace(/\D/g, ""),
    10,
  );
  const fundPeriod =
    features.fundRotating &&
    Number.isFinite(fundPeriodRaw) &&
    fundPeriodRaw >= 1
      ? fundPeriodRaw
      : undefined;

  const monthRange = features.buildingCharges
    ? jalaliMonthBounds(tehranCivilYear(), tehranCivilMonth())
    : tehranMonthRange();

  const reportRange = features.buildingCharges
    ? reportMonth != null
      ? jalaliMonthBounds(planYear, reportMonth)
      : jalaliYearBounds(planYear)
    : null;

  const activeTab = resolveDefaultTab(features, tabParam);

  const categoryPolicies = features.categoryPrivacy
    ? await prisma.spaceCategoryPolicy.findMany({
        where: { spaceId: id, visibility: "PRIVATE" },
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

  return {
    id,
    session,
    membership,
    features,
    planYear,
    reportMonth,
    fundPeriod,
    monthRange,
    reportRange,
    activeTab,
    hiddenCategories,
    hiddenCategoriesKey: hiddenCategories.slice().sort().join(","),
  };
}

/** Space row + members — shared by hero and tabs within one request. */
export const loadSpaceWithMembers = cache(async (spaceId: string) => {
  return prisma.space.findUnique({
    where: { id: spaceId },
    include: {
      members: {
        include: { user: { select: memberUserSelect } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
});

/** Ledger page (tab list) — not needed for hero chrome. */
export const loadSpaceExpensesPage = cache(
  async (spaceId: string, hiddenCategoriesKey: string) => {
    const hidden = hiddenCategoriesKey
      ? (hiddenCategoriesKey.split(",") as ExpenseCategory[])
      : [];
    return prisma.space.findUnique({
      where: { id: spaceId },
      select: {
        expenses: {
          where: categoryPrivacyFilter(hidden),
          select: {
            id: true,
            title: true,
            totalAmount: true,
            date: true,
            createdAt: true,
            updatedAt: true,
            paidById: true,
            transactionType: true,
            category: true,
            categoryLabel: true,
            isCategoryLocked: true,
            spaceId: true,
            paidBy: {
              select: {
                id: true,
                name: true,
                phone: true,
                isVirtual: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                phone: true,
                isVirtual: true,
              },
            },
            updatedBy: {
              select: {
                id: true,
                name: true,
                phone: true,
                isVirtual: true,
              },
            },
            splits: {
              select: {
                userId: true,
                owedAmount: true,
                share: true,
              },
            },
          },
          orderBy: { date: "desc" },
          take: 50,
        },
      },
    });
  },
);

/** Cheap counts for hero subtitle without loading full expense rows. */
export const loadExpenseHeroStats = cache(
  async (spaceId: string, hiddenCategoriesKey: string) => {
    const hidden = hiddenCategoriesKey
      ? (hiddenCategoriesKey.split(",") as ExpenseCategory[])
      : [];
    const where = {
      spaceId,
      transactionType: "EXPENSE" as const,
      ...categoryPrivacyFilter(hidden),
    };
    const [agg, count] = await Promise.all([
      prisma.expense.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
      prisma.expense.count({ where }),
    ]);
    return {
      expenseCount: count,
      totalExpenses: agg._sum.totalAmount ?? 0,
    };
  },
);

/** Slim rows for share-summary on trip/partner chrome. */
export const loadShareExpenseLines = cache(
  async (spaceId: string, hiddenCategoriesKey: string) => {
    const hidden = hiddenCategoriesKey
      ? (hiddenCategoriesKey.split(",") as ExpenseCategory[])
      : [];
    return prisma.expense.findMany({
      where: {
        spaceId,
        ...categoryPrivacyFilter(hidden),
      },
      select: {
        category: true,
        totalAmount: true,
        transactionType: true,
      },
      orderBy: { date: "desc" },
      take: 200,
    });
  },
);

export const loadMonthRows = cache(
  async (
    spaceId: string,
    startMs: number,
    endMs: number,
    hiddenCategoriesKey: string,
  ) => {
    const hidden = hiddenCategoriesKey
      ? (hiddenCategoriesKey.split(",") as ExpenseCategory[])
      : [];
    return prisma.expense.findMany({
      where: {
        spaceId,
        date: { gte: new Date(startMs), lte: new Date(endMs) },
        ...categoryPrivacyFilter(hidden),
      },
      select: {
        totalAmount: true,
        transactionType: true,
        category: true,
        categoryLabel: true,
        paidById: true,
      },
    });
  },
);

export const loadCachedBalances = cache(async (spaceId: string) => {
  return getSpaceBalances(spaceId);
});

export const loadCachedBuildingView = cache(
  async (spaceId: string, planYear: number) => {
    return getBuildingManagerView(spaceId, planYear);
  },
);

export const loadOpenBoardCount = cache(async (spaceId: string) => {
  return prisma.buildingSuggestion.count({
    where: {
      spaceId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
  });
});

export const loadCachedFundDashboard = cache(
  async (spaceId: string, fundPeriod: number | undefined) => {
    return getFundDashboard(spaceId, fundPeriod);
  },
);

export const loadFundProofs = cache(async (spaceId: string) => {
  return listFundProofsForManager(spaceId);
});

export const emptyBalances = {
  balances: {} as Record<string, number>,
  suggestions: [] as Awaited<ReturnType<typeof getSpaceBalances>>["suggestions"],
};
