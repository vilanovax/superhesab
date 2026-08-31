/**
 * BUILDING public report links — tokenized, scoped, no SpaceMember.
 * Sensitive modules (expense lines, per-unit charges) are opt-in.
 */

import "server-only";

import type { SpaceCurrency } from "@/lib/format";
import {
  buildBasesByMonth,
  effectiveBaseForMonth,
  tehranCivilMonth,
  tehranCivilYear,
  unitArrears,
  unitCollected,
  unitExpectedYtd,
  unitMonthlyCharge,
  type ChargeStatusValue,
  type PaymentSlice,
} from "@/lib/building";
import { prisma } from "@/lib/db/prisma";
import { jalaliMonthBounds, jalaliYearBounds } from "@/lib/jalali";
import {
  getExpensesByCategoryInRange,
  getExpenseLinesInRange,
} from "@/lib/reports-server";
import type { CategoryExpenseRow, ReportExpenseLine } from "@/lib/reports";
import {
  getCachedBuildingUnits,
  getCachedChargeBaseOverrides,
  getCachedChargePlan,
} from "@/lib/spaces/building-cache";
import { getTemplate } from "@/lib/templates/registry";
import type {
  BuildingShareLinkDTO,
  BuildingShareScopes,
} from "@/lib/building-share-scopes";

export {
  DEFAULT_SHARE_SCOPES,
  MAX_ACTIVE_BUILDING_SHARE_LINKS,
  SHARE_SCOPE_META,
  type BuildingShareLinkDTO,
  type BuildingShareScopes,
} from "@/lib/building-share-scopes";
export const EXPENSE_LIST_CAP = 30;

export type BuildingShareChargesSummary = {
  year: number;
  throughMonth: number;
  baseCharge: number;
  activeUnits: number;
  expectedYtd: number;
  collectedYtd: number;
  arrearsTotal: number;
  collectPct: number;
};

export type BuildingShareUnitRow = {
  name: string;
  monthlyCharge: number;
  arrears: number;
  collected: number;
};

export type BuildingShareAnnouncement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
};

export type BuildingShareReport = {
  token: string;
  title: string | null;
  spaceName: string;
  currency: SpaceCurrency;
  year: number;
  scopes: BuildingShareScopes;
  expensesSummary: {
    monthTotal: number;
    yearTotal: number;
    monthCategories: CategoryExpenseRow[];
    yearCategories: CategoryExpenseRow[];
  } | null;
  expensesList: ReportExpenseLine[] | null;
  chargesSummary: BuildingShareChargesSummary | null;
  chargesUnits: BuildingShareUnitRow[] | null;
  announcements: BuildingShareAnnouncement[] | null;
};

function scopesFromRow(row: {
  includeExpensesSummary: boolean;
  includeExpensesList: boolean;
  includeChargesSummary: boolean;
  includeChargesUnits: boolean;
  includeAnnouncements: boolean;
}): BuildingShareScopes {
  return {
    includeExpensesSummary: row.includeExpensesSummary,
    includeExpensesList: row.includeExpensesList,
    includeChargesSummary: row.includeChargesSummary,
    includeChargesUnits: row.includeChargesUnits,
    includeAnnouncements: row.includeAnnouncements,
  };
}

export function toShareLinkDTO(row: {
  id: string;
  token: string;
  title: string | null;
  includeExpensesSummary: boolean;
  includeExpensesList: boolean;
  includeChargesSummary: boolean;
  includeChargesUnits: boolean;
  includeAnnouncements: boolean;
  revokedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  _count?: { follows: number };
}): BuildingShareLinkDTO {
  return {
    id: row.id,
    token: row.token,
    title: row.title,
    scopes: scopesFromRow(row),
    revoked: Boolean(row.revokedAt),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    followCount: row._count?.follows ?? 0,
  };
}

export function isShareLinkLive(row: {
  revokedAt: Date | null;
  expiresAt: Date | null;
}): boolean {
  if (row.revokedAt) return false;
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return false;
  return true;
}

async function loadChargeSlice(spaceId: string, year: number) {
  const now = new Date();
  const currentJalali = tehranCivilYear(now);
  const throughMonth =
    year === currentJalali
      ? tehranCivilMonth(now)
      : year < currentJalali
        ? 12
        : 0;

  const [plan, overrides, units, payments] = await Promise.all([
    getCachedChargePlan(spaceId, year),
    getCachedChargeBaseOverrides(spaceId, year),
    getCachedBuildingUnits(spaceId),
    prisma.chargePayment.findMany({
      where: { year, unit: { spaceId } },
      select: {
        unitId: true,
        month: true,
        amount: true,
        status: true,
      },
    }),
  ]);

  const basesByMonth = buildBasesByMonth(plan?.baseCharge ?? 0, overrides);
  const baseCharge = effectiveBaseForMonth(
    basesByMonth,
    Math.max(1, throughMonth || 1),
  );
  const paymentsByUnit = new Map<string, PaymentSlice[]>();
  for (const p of payments) {
    const list = paymentsByUnit.get(p.unitId) ?? [];
    list.push({
      month: p.month,
      amount: p.amount,
      status: p.status as ChargeStatusValue,
    });
    paymentsByUnit.set(p.unitId, list);
  }

  const active = units.filter((u) => u.isActive);
  const rows = active.map((u) => {
    const slices = paymentsByUnit.get(u.id) ?? [];
    const monthlyCharge = unitMonthlyCharge(baseCharge, u.multiplier);
    const arrears = plan
      ? unitArrears({
          basesByMonth,
          multiplier: u.multiplier,
          throughMonth,
          payments: slices,
        })
      : 0;
    const collected = plan
      ? unitCollected({
          basesByMonth,
          multiplier: u.multiplier,
          payments: slices,
        })
      : 0;
    return {
      name: u.name,
      monthlyCharge,
      arrears,
      collected,
      multiplier: u.multiplier,
    };
  });

  const expectedYtd = rows.reduce(
    (s, u) =>
      s +
      unitExpectedYtd({
        basesByMonth,
        multiplier: u.multiplier,
        throughMonth,
      }),
    0,
  );
  const collectedYtd = rows.reduce((s, u) => s + u.collected, 0);
  const arrearsTotal = rows.reduce((s, u) => s + u.arrears, 0);

  const publicUnits: BuildingShareUnitRow[] = rows
    .map(({ name, monthlyCharge, arrears, collected }) => ({
      name,
      monthlyCharge,
      arrears,
      collected,
    }))
    .sort((a, b) => b.arrears - a.arrears || a.name.localeCompare(b.name, "fa"));

  return {
    year,
    throughMonth,
    baseCharge,
    activeUnits: rows.length,
    expectedYtd,
    collectedYtd,
    arrearsTotal,
    collectPct:
      expectedYtd > 0
        ? Math.min(100, Math.round((collectedYtd * 100) / expectedYtd))
        : 0,
    units: publicUnits,
  };
}

/**
 * Slim stats for the home “followed reports” cards — month spend total +
 * charge collectPct only. Avoids year categories, expense lines, units list,
 * and announcements that `loadBuildingShareReport` pulls for the full page.
 */
export async function loadBuildingShareHomeCardStats(input: {
  spaceId: string;
  defaultPlanYear: number | null;
  includeExpensesSummary: boolean;
  includeChargesSummary: boolean;
}): Promise<{ collectPct: number | null; monthSpend: number | null }> {
  const nowYear = tehranCivilYear();
  const nowMonth = tehranCivilMonth();
  const chargeYear = input.defaultPlanYear ?? nowYear;
  const monthBounds = jalaliMonthBounds(nowYear, nowMonth);

  const [monthAgg, chargeSlice] = await Promise.all([
    input.includeExpensesSummary
      ? prisma.expense.aggregate({
          where: {
            spaceId: input.spaceId,
            transactionType: "EXPENSE",
            date: { gte: monthBounds.start, lte: monthBounds.end },
          },
          _sum: { totalAmount: true },
        })
      : Promise.resolve(null),
    input.includeChargesSummary
      ? loadChargeSlice(input.spaceId, chargeYear)
      : Promise.resolve(null),
  ]);

  return {
    monthSpend: monthAgg ? (monthAgg._sum.totalAmount ?? 0) : null,
    collectPct: chargeSlice ? chargeSlice.collectPct : null,
  };
}

/**
 * Public read by token. Returns null when missing, revoked, expired,
 * archived, or not a building space.
 */
export async function loadBuildingShareReport(
  token: string,
): Promise<BuildingShareReport | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const link = await prisma.buildingShareLink.findUnique({
    where: { token: trimmed },
    include: {
      space: {
        select: {
          id: true,
          name: true,
          type: true,
          currency: true,
          archivedAt: true,
          defaultPlanYear: true,
        },
      },
    },
  });
  if (!link || !isShareLinkLive(link)) return null;
  if (link.space.archivedAt) return null;
  if (!getTemplate(link.space.type).features.buildingCharges) return null;

  const scopes = scopesFromRow(link);
  const nowYear = tehranCivilYear();
  const nowMonth = tehranCivilMonth();
  const chargeYear = link.space.defaultPlanYear ?? nowYear;
  const monthBounds = jalaliMonthBounds(nowYear, nowMonth);
  const yearBounds = jalaliYearBounds(nowYear);

  const needExpenses =
    scopes.includeExpensesSummary || scopes.includeExpensesList;
  const needCharges =
    scopes.includeChargesSummary || scopes.includeChargesUnits;

  const [monthCategories, yearCategories, expenseLines, chargeSlice, announcements] =
    await Promise.all([
      needExpenses
        ? getExpensesByCategoryInRange(
            link.spaceId,
            monthBounds.start,
            monthBounds.end,
          )
        : Promise.resolve([]),
      needExpenses
        ? getExpensesByCategoryInRange(
            link.spaceId,
            yearBounds.start,
            yearBounds.end,
          )
        : Promise.resolve([]),
      scopes.includeExpensesList
        ? getExpenseLinesInRange(
            link.spaceId,
            yearBounds.start,
            yearBounds.end,
          ).then((rows) => rows.slice(0, EXPENSE_LIST_CAP))
        : Promise.resolve([]),
      needCharges
        ? loadChargeSlice(link.spaceId, chargeYear)
        : Promise.resolve(null),
      scopes.includeAnnouncements
        ? prisma.buildingAnnouncement.findMany({
            where: { spaceId: link.spaceId, archivedAt: null },
            orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
            take: 20,
            select: {
              id: true,
              title: true,
              body: true,
              pinned: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

  return {
    token: link.token,
    title: link.title,
    spaceName: link.space.name,
    currency: link.space.currency,
    year: chargeYear,
    scopes,
    expensesSummary: scopes.includeExpensesSummary
      ? {
          monthTotal: monthCategories.reduce((s, r) => s + r.amount, 0),
          yearTotal: yearCategories.reduce((s, r) => s + r.amount, 0),
          monthCategories,
          yearCategories,
        }
      : null,
    expensesList: scopes.includeExpensesList ? expenseLines : null,
    chargesSummary:
      scopes.includeChargesSummary && chargeSlice
        ? {
            year: chargeSlice.year,
            throughMonth: chargeSlice.throughMonth,
            baseCharge: chargeSlice.baseCharge,
            activeUnits: chargeSlice.activeUnits,
            expectedYtd: chargeSlice.expectedYtd,
            collectedYtd: chargeSlice.collectedYtd,
            arrearsTotal: chargeSlice.arrearsTotal,
            collectPct: chargeSlice.collectPct,
          }
        : null,
    chargesUnits: scopes.includeChargesUnits
      ? (chargeSlice?.units ?? [])
      : null,
    announcements: scopes.includeAnnouncements
      ? announcements.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          pinned: a.pinned,
          createdAt: a.createdAt.toISOString(),
        }))
      : null,
  };
}
