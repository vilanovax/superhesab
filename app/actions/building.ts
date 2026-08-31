"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import {
  getSpaceMeta,
  requireSpaceMember,
  requireUser,
} from "@/lib/auth/guards";
import {
  getCachedBuildingUnits,
  getCachedChargeBaseOverrides,
  getCachedChargePlan,
  invalidateSpaceChargePlan,
  invalidateSpaceUnits,
} from "@/lib/spaces/building-cache";
import {
  buildBasesByMonth,
  CHARGE_STATUS_LABELS,
  effectiveBaseForMonth,
  monthLabelFa,
  tehranCivilMonth,
  tehranCivilYear,
  unitArrears,
  unitCollected,
  unitExpectedYtd,
  unitMonthlyCharge,
  type ChargeStatusValue,
  type PaymentSlice,
} from "@/lib/building";
import { unitSeesExpense } from "@/lib/building-category-scope";
import type { ExpenseCategory } from "@/lib/categorizer";
import { jalaliYearBounds } from "@/lib/jalali";
import { parseExpenseDateInput, type SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { asMoney } from "@/lib/money";
import { canMutateMoney } from "@/lib/rbac";
import { assertFeatureEnabled } from "@/lib/feature-flags";
import { getTemplate } from "@/lib/templates/registry";
import {
  createUnitSchema,
  updateUnitSchema,
  upsertChargePaymentSchema,
  upsertChargePlanSchema,
  applyChargeBaseOverrideSchema,
  createBuildingSuggestionSchema,
  updateBuildingSuggestionStatusSchema,
  createBuildingAnnouncementSchema,
  updateBuildingAnnouncementSchema,
  createChargeProofUploadIntentSchema,
  confirmChargeProofUploadSchema,
  reviewChargeProofSchema,
  type CreateUnitInput,
  type UpdateUnitInput,
  type UpsertChargePaymentInput,
  type UpsertChargePlanInput,
  type ApplyChargeBaseOverrideInput,
  type CreateBuildingSuggestionInput,
  type UpdateBuildingSuggestionStatusInput,
  type CreateBuildingAnnouncementInput,
  type UpdateBuildingAnnouncementInput,
  type CreateChargeProofUploadIntentInput,
  type ConfirmChargeProofUploadInput,
  type ReviewChargeProofInput,
} from "@/lib/validations/building";
import {
  chargeProofObjectKey,
  isStorageConfigured,
  presignGetObject,
  presignPutObject,
} from "@/lib/storage/s3";
import type { SuggestionStatusValue } from "@/lib/building";

export type BuildingActionResult =
  | { ok: true; id?: string; inviteToken?: string }
  | { ok: false; error: string };

export type UnitDTO = {
  id: string;
  name: string;
  area: number | null;
  multiplier: number;
  isActive: boolean;
  monthlyCharge: number;
  arrears: number;
  collected: number;
};

export type ChargePlanDTO = {
  id: string;
  year: number;
  baseCharge: number;
};

export type ChargeBaseOverrideDTO = {
  id: string;
  year: number;
  fromMonth: number;
  toMonth: number;
  baseCharge: number;
};

export type ChargePaymentDTO = {
  id: string;
  unitId: string;
  year: number;
  month: number;
  amount: number;
  status: ChargeStatusValue;
  date: string;
  note: string | null;
};

export type BuildingDashboardDTO = {
  year: number;
  throughMonth: number;
  plan: ChargePlanDTO | null;
  /** Inclusive month-range overrides for this year (disjoint after writes). */
  overrides: ChargeBaseOverrideDTO[];
  /** Effective base charge per month index 1..12 (plan + overrides). */
  basesByMonth: number[];
  units: UnitDTO[];
  payments: ChargePaymentDTO[];
  /** Active units with arrears > 0, sorted desc */
  debtors: UnitDTO[];
  totals: {
    expectedYtd: number;
    collectedYtd: number;
    arrearsTotal: number;
    activeUnits: number;
  };
};

async function assertBuilding(
  spaceId: string,
  userId: string,
  opts: { needOwner?: boolean; needMutate?: boolean } = {},
) {
  const membership = await requireSpaceMember(spaceId, userId);
  if (!membership) {
    return { ok: false as const, error: "به این فضا دسترسی ندارید." };
  }
  if (!getTemplate(membership.space.type).features.buildingCharges) {
    return {
      ok: false as const,
      error: "ماژول شارژ ساختمان در این قالب فعال نیست.",
    };
  }
  if (opts.needOwner && membership.role !== "OWNER") {
    return {
      ok: false as const,
      error: "فقط مالک می‌تواند واحدها و پلن شارژ را مدیریت کند.",
    };
  }
  if (opts.needMutate && !canMutateMoney(membership.role)) {
    return {
      ok: false as const,
      error: "نقش ناظر اجازه ثبت وصول ندارد.",
    };
  }
  return { ok: true as const, membership };
}

async function resolvePlanYear(
  spaceId: string,
  year?: number,
): Promise<number> {
  const currentJalali = tehranCivilYear();
  if (year && year >= 1390 && year <= 1500) return year;
  const meta = await getSpaceMeta(spaceId);
  if (
    meta?.defaultPlanYear &&
    meta.defaultPlanYear >= 1390 &&
    meta.defaultPlanYear <= 1500
  ) {
    return meta.defaultPlanYear;
  }
  return currentJalali;
}

type BuildingChargeBundle = {
  spaceId: string;
  year: number;
  throughMonth: number;
  plan: { id: string; year: number; baseCharge: number } | null;
  overrides: {
    id: string;
    year: number;
    fromMonth: number;
    toMonth: number;
    baseCharge: number;
  }[];
  units: {
    id: string;
    name: string;
    area: number | null;
    phone: string | null;
    multiplier: number;
    isActive: boolean;
    inviteToken: string;
    linkedUserId: string | null;
    linkedAt: Date | null;
    linkedUser: { name: string | null; phone: string } | null;
  }[];
  payments: {
    id: string;
    unitId: string;
    year: number;
    month: number;
    amount: number;
    status: string;
    date: Date;
    note: string | null;
  }[];
};

/** One plan+units+payments fetch per (spaceId, year) in a request. */
const loadBuildingChargeData = cache(
  async (spaceId: string, year: number): Promise<BuildingChargeBundle> => {
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
        where: {
          year,
          unit: { spaceId },
        },
        orderBy: [{ month: "asc" }, { unitId: "asc" }],
        select: {
          id: true,
          unitId: true,
          year: true,
          month: true,
          amount: true,
          status: true,
          date: true,
          note: true,
        },
      }),
    ]);

    return {
      spaceId,
      year,
      throughMonth,
      plan,
      overrides,
      units,
      payments,
    };
  },
);

function mapDashboard(bundle: BuildingChargeBundle): BuildingDashboardDTO {
  const { year, throughMonth, plan, overrides, units, payments } = bundle;
  const planBase = plan?.baseCharge ?? 0;
  const basesByMonth = buildBasesByMonth(planBase, overrides);
  const currentBase = effectiveBaseForMonth(
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

  const unitDtos: UnitDTO[] = units.map((u) => {
    const slices = paymentsByUnit.get(u.id) ?? [];
    const monthlyCharge = unitMonthlyCharge(currentBase, u.multiplier);
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
      id: u.id,
      name: u.name,
      area: u.area,
      multiplier: u.multiplier,
      isActive: u.isActive,
      monthlyCharge,
      arrears: u.isActive ? arrears : 0,
      collected,
    };
  });

  const active = unitDtos.filter((u) => u.isActive);
  const expectedYtd = active.reduce(
    (s, u) =>
      s +
      unitExpectedYtd({
        basesByMonth,
        multiplier: u.multiplier,
        throughMonth,
      }),
    0,
  );
  const collectedYtd = active.reduce((s, u) => s + u.collected, 0);
  const arrearsTotal = active.reduce((s, u) => s + u.arrears, 0);
  const debtors = active
    .filter((u) => u.arrears > 0)
    .sort((a, b) => b.arrears - a.arrears);

  return {
    year,
    throughMonth,
    plan: plan
      ? { id: plan.id, year: plan.year, baseCharge: plan.baseCharge }
      : null,
    overrides: overrides.map((o) => ({
      id: o.id,
      year: o.year,
      fromMonth: o.fromMonth,
      toMonth: o.toMonth,
      baseCharge: o.baseCharge,
    })),
    basesByMonth,
    units: unitDtos,
    payments: payments.map(toPaymentDTO),
    debtors,
    totals: {
      expectedYtd,
      collectedYtd,
      arrearsTotal,
      activeUnits: active.length,
    },
  };
}

function mapCalendar(bundle: BuildingChargeBundle): AnnualChargeCalendarDTO {
  const { spaceId, year, throughMonth, plan, overrides, units, payments } =
    bundle;
  const basesByMonth = buildBasesByMonth(plan?.baseCharge ?? 0, overrides);
  const currentBase = effectiveBaseForMonth(
    basesByMonth,
    Math.max(1, throughMonth || 1),
  );
  const activeUnits = units.filter((u) => u.isActive);
  const activeIds = new Set(activeUnits.map((u) => u.id));
  const byUnitMonth: AnnualChargeCalendarDTO["byUnitMonth"] = {};
  for (const u of activeUnits) {
    byUnitMonth[u.id] = {};
  }
  for (const p of payments) {
    if (!activeIds.has(p.unitId)) continue;
    const bucket = byUnitMonth[p.unitId] ?? (byUnitMonth[p.unitId] = {});
    bucket[p.month] = toPaymentDTO(p);
  }

  return {
    spaceId,
    year,
    throughMonth,
    basesByMonth,
    units: activeUnits.map((u) => ({
      id: u.id,
      name: u.name,
      multiplier: u.multiplier,
      monthlyCharge: unitMonthlyCharge(currentBase, u.multiplier),
    })),
    byUnitMonth,
  };
}

function mapUnitRows(bundle: BuildingChargeBundle): BuildingUnitRow[] {
  return bundle.units.map((u) => ({
    id: u.id,
    name: u.name,
    area: u.area,
    phone: u.phone,
    multiplier: u.multiplier,
    isActive: u.isActive,
    inviteToken: u.inviteToken,
    linkedUserId: u.linkedUserId,
    linkedUserName:
      u.linkedUser?.name?.trim() || u.linkedUser?.phone || null,
    linkedAt: u.linkedAt ? u.linkedAt.toISOString() : null,
  }));
}

function toPaymentDTO(p: {
  id: string;
  unitId: string;
  year: number;
  month: number;
  amount: number;
  status: string;
  date: Date;
  note: string | null;
}): ChargePaymentDTO {
  return {
    id: p.id,
    unitId: p.unitId,
    year: p.year,
    month: p.month,
    amount: p.amount,
    status: p.status as ChargeStatusValue,
    date: p.date.toISOString().slice(0, 10),
    note: p.note,
  };
}

export async function getBuildingDashboard(
  spaceId: string,
  year?: number,
): Promise<BuildingDashboardDTO | null> {
  const session = await requireUser();
  const access = await assertBuilding(spaceId, session.userId);
  if (!access.ok) return null;

  const y = await resolvePlanYear(spaceId, year);
  const bundle = await loadBuildingChargeData(spaceId, y);
  return mapDashboard(bundle);
}

export type AnnualCalendarUnit = {
  id: string;
  name: string;
  multiplier: number;
  /** Charge for throughMonth / current view — prefer basesByMonth × multiplier. */
  monthlyCharge: number;
};

export type AnnualChargeCalendarDTO = {
  spaceId: string;
  year: number;
  /** Months 1..throughMonth are "due if missing"; later months are future. */
  throughMonth: number;
  /** Effective base per month index 1..12. */
  basesByMonth: number[];
  units: AnnualCalendarUnit[];
  /** unitId → month (1–12) → payment (only months with a record). */
  byUnitMonth: Record<string, Partial<Record<number, ChargePaymentDTO>>>;
};

/** Macro grid: active units × months for one Jalali plan year. */
export async function getAnnualChargeCalendar(
  spaceId: string,
  year?: number,
): Promise<AnnualChargeCalendarDTO | null> {
  const session = await requireUser();
  const access = await assertBuilding(spaceId, session.userId);
  if (!access.ok) return null;

  const y = await resolvePlanYear(spaceId, year);
  const bundle = await loadBuildingChargeData(spaceId, y);
  return mapCalendar(bundle);
}

/**
 * Single gated load for the BUILDING manager space page —
 * dashboard + calendar + unit rows share one plan/units/payments query.
 */
export async function getBuildingManagerView(
  spaceId: string,
  year?: number,
  opts?: { includeCalendar?: boolean },
): Promise<{
  dashboard: BuildingDashboardDTO;
  calendar: AnnualChargeCalendarDTO | null;
  units: BuildingUnitRow[];
} | null> {
  const session = await requireUser();
  const access = await assertBuilding(spaceId, session.userId);
  if (!access.ok) return null;

  const y = await resolvePlanYear(spaceId, year);
  const bundle = await loadBuildingChargeData(spaceId, y);
  const includeCalendar = opts?.includeCalendar !== false;
  return {
    dashboard: mapDashboard(bundle),
    calendar: includeCalendar ? mapCalendar(bundle) : null,
    units: mapUnitRows(bundle),
  };
}

export async function createUnit(
  input: CreateUnitInput,
): Promise<BuildingActionResult> {
  const parsed = createUnitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();
  const access = await assertBuilding(parsed.data.spaceId, session.userId, {
    needOwner: true,
  });
  if (!access.ok) return access;

  try {
    const unit = await prisma.unit.create({
      data: {
        spaceId: parsed.data.spaceId,
        name: parsed.data.name,
        area: parsed.data.area ?? null,
        phone: parsed.data.phone?.trim() || null,
        multiplier: parsed.data.multiplier ?? 1000,
        isActive: true,
      },
    });
    invalidateSpaceUnits(parsed.data.spaceId);
    revalidatePath(`/spaces/${parsed.data.spaceId}`);
    revalidatePath(`/spaces/${parsed.data.spaceId}/settings`);
    return { ok: true, id: unit.id, inviteToken: unit.inviteToken };
  } catch {
    return { ok: false, error: "ثبت واحد ناموفق بود." };
  }
}

export async function updateUnit(
  input: UpdateUnitInput,
): Promise<BuildingActionResult> {
  const parsed = updateUnitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();
  const access = await assertBuilding(parsed.data.spaceId, session.userId, {
    needOwner: true,
  });
  if (!access.ok) return access;

  const updated = await prisma.unit.updateMany({
    where: { id: parsed.data.unitId, spaceId: parsed.data.spaceId },
    data: {
      name: parsed.data.name,
      area: parsed.data.area ?? null,
      phone: parsed.data.phone?.trim() || null,
      multiplier: parsed.data.multiplier,
      isActive: parsed.data.isActive,
    },
  });
  if (updated.count === 0) {
    return { ok: false, error: "واحد پیدا نشد." };
  }
  invalidateSpaceUnits(parsed.data.spaceId);
  revalidatePath(`/spaces/${parsed.data.spaceId}`);
  revalidatePath(`/spaces/${parsed.data.spaceId}/settings`);
  return { ok: true, id: parsed.data.unitId };
}

/**
 * Persist the hero year chip as the space's default plan year so leaving and
 * re-opening the building (without `?year=`) keeps the same fiscal year.
 * OWNER / EDITOR only — viewers may still browse via URL without writing.
 */
export async function rememberBuildingPlanYear(input: {
  spaceId: string;
  year: number;
}): Promise<BuildingActionResult> {
  const year = Math.trunc(input.year);
  if (!Number.isFinite(year) || year < 1390 || year > 1500) {
    return { ok: false, error: "سال مالی نامعتبر است." };
  }
  const session = await requireUser();
  const access = await assertBuilding(input.spaceId, session.userId, {
    needMutate: true,
  });
  if (!access.ok) return access;

  const current = await prisma.space.findUnique({
    where: { id: input.spaceId },
    select: { defaultPlanYear: true },
  });
  if (current?.defaultPlanYear === year) {
    return { ok: true };
  }

  await prisma.space.update({
    where: { id: input.spaceId },
    data: { defaultPlanYear: year },
  });

  revalidatePath(`/spaces/${input.spaceId}`);
  revalidatePath(`/spaces/${input.spaceId}/settings`);
  revalidatePath(`/spaces/${input.spaceId}/resident`);
  return { ok: true };
}

export async function upsertChargePlan(
  input: UpsertChargePlanInput,
): Promise<BuildingActionResult> {
  const parsed = upsertChargePlanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();
  const access = await assertBuilding(parsed.data.spaceId, session.userId, {
    needOwner: true,
  });
  if (!access.ok) return access;

  try {
    const plan = await prisma.chargePlan.upsert({
      where: {
        spaceId_year: {
          spaceId: parsed.data.spaceId,
          year: parsed.data.year,
        },
      },
      create: {
        spaceId: parsed.data.spaceId,
        year: parsed.data.year,
        baseCharge: asMoney(parsed.data.baseCharge),
      },
      update: {
        baseCharge: asMoney(parsed.data.baseCharge),
      },
    });
    invalidateSpaceChargePlan(parsed.data.spaceId, parsed.data.year);
    revalidatePath(`/spaces/${parsed.data.spaceId}`);
    revalidatePath(`/spaces/${parsed.data.spaceId}/settings`);
    return { ok: true, id: plan.id };
  } catch {
    return { ok: false, error: "ذخیره پلن شارژ ناموفق بود." };
  }
}

/**
 * Change monthly base for one month only, or from that month through year-end.
 * Keeps ranges disjoint by splitting/truncating existing overrides.
 */
export async function applyChargeBaseOverride(
  input: ApplyChargeBaseOverrideInput,
): Promise<BuildingActionResult> {
  const parsed = applyChargeBaseOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();
  const access = await assertBuilding(parsed.data.spaceId, session.userId, {
    needOwner: true,
  });
  if (!access.ok) return access;

  const { spaceId, year, month, mode } = parsed.data;
  const baseCharge = asMoney(parsed.data.baseCharge);

  const plan = await prisma.chargePlan.findUnique({
    where: { spaceId_year: { spaceId, year } },
    select: { id: true },
  });
  if (!plan) {
    return {
      ok: false,
      error: "ابتدا پلن شارژ این سال را در تنظیمات تعریف کنید.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.chargeBaseOverride.findMany({
        where: { spaceId, year },
        orderBy: [{ fromMonth: "asc" }, { toMonth: "asc" }],
      });

      if (mode === "single") {
        for (const o of existing) {
          if (o.fromMonth === month && o.toMonth === month) {
            await tx.chargeBaseOverride.delete({ where: { id: o.id } });
            continue;
          }
          if (o.fromMonth <= month && o.toMonth >= month) {
            await tx.chargeBaseOverride.delete({ where: { id: o.id } });
            if (o.fromMonth < month) {
              await tx.chargeBaseOverride.create({
                data: {
                  spaceId,
                  year,
                  fromMonth: o.fromMonth,
                  toMonth: month - 1,
                  baseCharge: o.baseCharge,
                  createdById: o.createdById,
                },
              });
            }
            if (o.toMonth > month) {
              await tx.chargeBaseOverride.create({
                data: {
                  spaceId,
                  year,
                  fromMonth: month + 1,
                  toMonth: o.toMonth,
                  baseCharge: o.baseCharge,
                  createdById: o.createdById,
                },
              });
            }
          }
        }
        await tx.chargeBaseOverride.create({
          data: {
            spaceId,
            year,
            fromMonth: month,
            toMonth: month,
            baseCharge,
            createdById: session.userId,
          },
        });
        return;
      }

      // forward: month..12
      for (const o of existing) {
        if (o.fromMonth >= month) {
          await tx.chargeBaseOverride.delete({ where: { id: o.id } });
          continue;
        }
        if (o.toMonth >= month) {
          await tx.chargeBaseOverride.update({
            where: { id: o.id },
            data: { toMonth: month - 1 },
          });
        }
      }
      await tx.chargeBaseOverride.create({
        data: {
          spaceId,
          year,
          fromMonth: month,
          toMonth: 12,
          baseCharge,
          createdById: session.userId,
        },
      });
    });

    invalidateSpaceChargePlan(spaceId, year);
    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath(`/spaces/${spaceId}/settings`);
    revalidatePath(`/spaces/${spaceId}/resident`);
    return { ok: true };
  } catch {
    return { ok: false, error: "ذخیره تغییر مبلغ شارژ ناموفق بود." };
  }
}

export async function upsertChargePayment(
  input: UpsertChargePaymentInput,
): Promise<BuildingActionResult> {
  const parsed = upsertChargePaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();
  const access = await assertBuilding(parsed.data.spaceId, session.userId, {
    needMutate: true,
  });
  if (!access.ok) return access;

  const unit = await prisma.unit.findFirst({
    where: {
      id: parsed.data.unitId,
      spaceId: parsed.data.spaceId,
      isActive: true,
    },
  });
  if (!unit) {
    return { ok: false, error: "واحد فعال پیدا نشد." };
  }

  const plan = await prisma.chargePlan.findUnique({
    where: {
      spaceId_year: {
        spaceId: parsed.data.spaceId,
        year: parsed.data.year,
      },
    },
  });
  if (!plan) {
    return {
      ok: false,
      error: "ابتدا پلن شارژ این سال را در تنظیمات تعریف کنید.",
    };
  }

  const date = parsed.data.date
    ? parseExpenseDateInput(parsed.data.date)
    : new Date();

  try {
    const amount = asMoney(parsed.data.amount);
    const row = await prisma.chargePayment.upsert({
      where: {
        unitId_year_month: {
          unitId: parsed.data.unitId,
          year: parsed.data.year,
          month: parsed.data.month,
        },
      },
      create: {
        unitId: parsed.data.unitId,
        year: parsed.data.year,
        month: parsed.data.month,
        amount,
        status: parsed.data.status,
        date,
        note: parsed.data.note?.trim() || null,
        createdById: session.userId,
      },
      update: {
        amount,
        status: parsed.data.status,
        date,
        note: parsed.data.note?.trim() || null,
      },
    });

    if (unit.linkedUserId) {
      const spaceCurrency = await prisma.space.findUnique({
        where: { id: parsed.data.spaceId },
        select: { currency: true },
      });
      const currency = (spaceCurrency?.currency ?? "TOMAN") as SpaceCurrency;
      after(() => {
        void notifyBuildingUsers({
          spaceId: parsed.data.spaceId,
          userIds: [unit.linkedUserId!],
          kind: "CHARGE_PAYMENT",
          title: `وصول شارژ ${monthLabelFa(parsed.data.month)}`,
          body: `${CHARGE_STATUS_LABELS[parsed.data.status]} · ${formatCurrency(amount, currency)}`,
          hrefTab: "payments",
          refId: row.id,
        });
      });
    }

    revalidatePath(`/spaces/${parsed.data.spaceId}`);
    revalidatePath(`/spaces/${parsed.data.spaceId}/resident`);
    return { ok: true, id: row.id };
  } catch {
    return { ok: false, error: "ثبت وصول ناموفق بود." };
  }
}

/** Remove a charge payment row for a unit×year×month (proofs cascade). */
export async function deleteChargePayment(input: {
  spaceId: string;
  unitId: string;
  year: number;
  month: number;
}): Promise<BuildingActionResult> {
  const spaceId = input.spaceId?.trim();
  const unitId = input.unitId?.trim();
  const year = Math.trunc(input.year);
  const month = Math.trunc(input.month);
  if (
    !spaceId ||
    !unitId ||
    year < 1390 ||
    year > 1500 ||
    month < 1 ||
    month > 12
  ) {
    return { ok: false, error: "داده نامعتبر است." };
  }

  const session = await requireUser();
  const access = await assertBuilding(spaceId, session.userId, {
    needMutate: true,
  });
  if (!access.ok) return access;

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, spaceId },
    select: { id: true },
  });
  if (!unit) return { ok: false, error: "واحد پیدا نشد." };

  try {
    const existing = await prisma.chargePayment.findUnique({
      where: { unitId_year_month: { unitId, year, month } },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, error: "وصولی برای این ماه ثبت نشده است." };
    }

    await prisma.chargePayment.delete({
      where: { id: existing.id },
    });

    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath(`/spaces/${spaceId}/resident`);
    return { ok: true, id: existing.id };
  } catch {
    return { ok: false, error: "حذف وصول ناموفق بود." };
  }
}

export type BuildingUnitRow = {
  id: string;
  name: string;
  area: number | null;
  /** Optional unit contact phone / mobile. */
  phone: string | null;
  multiplier: number;
  isActive: boolean;
  inviteToken: string;
  linkedUserId: string | null;
  linkedUserName: string | null;
  linkedAt: string | null;
};

export async function listUnitsForSettings(
  spaceId: string,
): Promise<BuildingUnitRow[]> {
  const session = await requireUser();
  const access = await assertBuilding(spaceId, session.userId);
  if (!access.ok) return [];

  const y = await resolvePlanYear(spaceId);
  const bundle = await loadBuildingChargeData(spaceId, y);
  return mapUnitRows(bundle);
}

export async function getChargePlanForYear(
  spaceId: string,
  year: number,
): Promise<ChargePlanDTO | null> {
  const session = await requireUser();
  const access = await assertBuilding(spaceId, session.userId);
  if (!access.ok) return null;

  const plan = await prisma.chargePlan.findUnique({
    where: { spaceId_year: { spaceId, year } },
  });
  if (!plan) return null;
  return { id: plan.id, year: plan.year, baseCharge: plan.baseCharge };
}

function newInviteToken(): string {
  return randomBytes(18).toString("hex");
}

export type ClaimUnitResult =
  | { ok: true; spaceId: string; unitId: string }
  | { ok: false; error: string };

/**
 * Claim a unit via unique inviteToken. Possession of the link is authorization.
 * Adds/ensures SpaceMember VIEWER and sets Unit.linkedUserId.
 */
export async function claimUnit(token: string): Promise<ClaimUnitResult> {
  const session = await requireUser();
  const trimmed = token.trim();
  if (!trimmed) {
    return { ok: false, error: "لینک دعوت نامعتبر است." };
  }

  const unit = await prisma.unit.findUnique({
    where: { inviteToken: trimmed },
    select: {
      id: true,
      spaceId: true,
      isActive: true,
      linkedUserId: true,
      space: { select: { type: true, archivedAt: true } },
    },
  });

  if (!unit || unit.space.archivedAt) {
    return { ok: false, error: "لینک دعوت پیدا نشد یا منقضی شده است." };
  }
  if (!getTemplate(unit.space.type).features.buildingCharges) {
    return { ok: false, error: "این لینک برای قالب ساختمان نیست." };
  }
  if (!unit.isActive) {
    return { ok: false, error: "این واحد غیرفعال است. با مدیر تماس بگیرید." };
  }
  if (unit.linkedUserId && unit.linkedUserId !== session.userId) {
    return {
      ok: false,
      error:
        "این واحد قبلاً توسط شخص دیگری متصل شده است. لطفاً به مدیر ساختمان اطلاع دهید.",
    };
  }

  // One unit per user per space
  const other = await prisma.unit.findFirst({
    where: {
      spaceId: unit.spaceId,
      linkedUserId: session.userId,
      NOT: { id: unit.id },
    },
    select: { id: true, name: true },
  });
  if (other) {
    return {
      ok: false,
      error: `شما قبلاً به واحد «${other.name}» در این ساختمان متصل هستید.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.unit.update({
        where: { id: unit.id },
        data: {
          linkedUserId: session.userId,
          linkedAt: unit.linkedUserId === session.userId ? undefined : new Date(),
        },
      });

      const existing = await tx.spaceMember.findUnique({
        where: {
          spaceId_userId: {
            spaceId: unit.spaceId,
            userId: session.userId,
          },
        },
      });
      if (!existing) {
        await tx.spaceMember.create({
          data: {
            spaceId: unit.spaceId,
            userId: session.userId,
            role: "VIEWER",
          },
        });
      }
      // Do not downgrade OWNER/EDITOR to VIEWER if already a manager.
    });
  } catch {
    return { ok: false, error: "اتصال به واحد ناموفق بود." };
  }

  // Safe outside transaction: invite page may call claim during render;
  // revalidatePath must not turn a successful claim into a false error.
  try {
    invalidateSpaceUnits(unit.spaceId);
    revalidatePath(`/spaces/${unit.spaceId}`);
    revalidatePath(`/spaces/${unit.spaceId}/settings`);
    revalidatePath(`/spaces/${unit.spaceId}/resident`);
  } catch {
    // ignore — redirect / next navigation refreshes anyway
  }

  return { ok: true, spaceId: unit.spaceId, unitId: unit.id };
}

export async function unlinkUnitResident(
  spaceId: string,
  unitId: string,
): Promise<BuildingActionResult> {
  const session = await requireUser();
  const access = await assertBuilding(spaceId, session.userId, {
    needOwner: true,
  });
  if (!access.ok) return access;

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, spaceId },
    select: { id: true, linkedUserId: true },
  });
  if (!unit) return { ok: false, error: "واحد پیدا نشد." };

  await prisma.unit.update({
    where: { id: unit.id },
    data: { linkedUserId: null, linkedAt: null },
  });
  invalidateSpaceUnits(spaceId);
  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath(`/spaces/${spaceId}/settings`);
  return { ok: true, id: unit.id };
}

export async function regenerateUnitInviteToken(
  spaceId: string,
  unitId: string,
): Promise<BuildingActionResult & { inviteToken?: string }> {
  const session = await requireUser();
  const access = await assertBuilding(spaceId, session.userId, {
    needOwner: true,
  });
  if (!access.ok) return access;

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, spaceId },
    select: { id: true },
  });
  if (!unit) return { ok: false, error: "واحد پیدا نشد." };

  const inviteToken = newInviteToken();
  await prisma.unit.update({
    where: { id: unit.id },
    data: { inviteToken },
  });
  invalidateSpaceUnits(spaceId);
  revalidatePath(`/spaces/${spaceId}/settings`);
  return { ok: true, id: unit.id, inviteToken };
}

export type ResidentPortalDTO = {
  spaceId: string;
  spaceName: string;
  currency: "TOMAN" | "RIAL" | "USD" | "AED" | "EUR";
  year: number;
  throughMonth: number;
  unit: {
    id: string;
    name: string;
    monthlyCharge: number;
    arrears: number;
    collected: number;
  };
  payments: ChargePaymentDTO[];
  expenses: {
    id: string;
    title: string;
    totalAmount: number;
    date: string;
    category: string;
    categoryLabel: string | null;
  }[];
  /** Active unit-linked IOUs (read-only; separate from monthly charges). */
  debts: {
    id: string;
    type: "LENT" | "BORROWED";
    counterparty: string;
    initialAmount: number;
    remaining: number;
    note: string | null;
    dueDate: string | null;
  }[];
};

/** Resident (VIEWER linked to a unit) read-only portal data. */
export async function getResidentPortalData(
  spaceId: string,
): Promise<ResidentPortalDTO | null> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) return null;

  const space = membership.space;
  const features = getTemplate(space.type).features;
  if (!features.buildingCharges) {
    return null;
  }

  const unit = await prisma.unit.findFirst({
    where: { spaceId, linkedUserId: session.userId, isActive: true },
    select: {
      id: true,
      name: true,
      multiplier: true,
    },
  });
  if (!unit) return null;

  const year = space.defaultPlanYear ?? tehranCivilYear();
  const throughMonth = tehranCivilMonth();
  const bounds = jalaliYearBounds(year);

  const [
    plan,
    overrides,
    payments,
    expenses,
    activeUnits,
    categoryScopes,
    unitDebts,
  ] = await Promise.all([
    prisma.chargePlan.findUnique({
      where: { spaceId_year: { spaceId, year } },
    }),
    getCachedChargeBaseOverrides(spaceId, year),
    prisma.chargePayment.findMany({
      where: { unitId: unit.id, year },
      orderBy: [{ month: "desc" }],
    }),
    prisma.expense.findMany({
      where: {
        spaceId,
        transactionType: "EXPENSE",
        date: { gte: bounds.start, lte: bounds.end },
      },
      select: {
        id: true,
        title: true,
        totalAmount: true,
        date: true,
        category: true,
        categoryLabel: true,
        unitParticipations: { select: { unitId: true } },
      },
      orderBy: { date: "desc" },
      take: 120,
    }),
    prisma.unit.findMany({
      where: { spaceId, isActive: true },
      select: { id: true },
    }),
    prisma.buildingCategoryScope.findMany({
      where: { spaceId },
      select: {
        category: true,
        mode: true,
        unitRule: true,
        units: { select: { unitId: true } },
      },
    }),
    features.debts
      ? prisma.debt.findMany({
          where: {
            spaceId,
            unitId: unit.id,
            status: "ACTIVE",
          },
          select: {
            id: true,
            type: true,
            counterparty: true,
            initialAmount: true,
            note: true,
            dueDate: true,
            payments: { select: { amount: true } },
          },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
  ]);

  const basesByMonth = buildBasesByMonth(plan?.baseCharge ?? 0, overrides);
  const currentBase = effectiveBaseForMonth(
    basesByMonth,
    Math.max(1, throughMonth || 1),
  );
  const monthlyCharge = unitMonthlyCharge(currentBase, unit.multiplier);
  const slices: PaymentSlice[] = payments.map((p) => ({
    month: p.month,
    amount: p.amount,
    status: p.status as ChargeStatusValue,
  }));
  const arrears = unitArrears({
    basesByMonth,
    multiplier: unit.multiplier,
    throughMonth,
    payments: slices,
  });
  const collected = unitCollected({
    basesByMonth,
    multiplier: unit.multiplier,
    payments: slices,
  });

  const activeUnitIds = activeUnits.map((u) => u.id);
  const scopeByCategory = new Map(
    categoryScopes.map((s) => [
      s.category as ExpenseCategory,
      {
        category: s.category as ExpenseCategory,
        mode: s.mode,
        unitRule: s.unitRule,
        unitIds: s.units.map((u) => u.unitId),
      },
    ]),
  );

  const visibleExpenses = expenses
    .filter((e) =>
      unitSeesExpense({
        unitId: unit.id,
        snapshotIncludedUnitIds:
          e.unitParticipations.length > 0
            ? e.unitParticipations.map((p) => p.unitId)
            : null,
        scope: scopeByCategory.get(e.category as ExpenseCategory),
        activeUnitIds,
      }),
    )
    .slice(0, 80);

  return {
    spaceId: space.id,
    spaceName: space.name,
    currency: space.currency,
    year,
    throughMonth,
    unit: {
      id: unit.id,
      name: unit.name,
      monthlyCharge,
      arrears,
      collected,
    },
    payments: payments.map(toPaymentDTO),
    expenses: visibleExpenses.map((e) => ({
      id: e.id,
      title: e.title,
      totalAmount: e.totalAmount,
      date: e.date.toISOString(),
      category: e.category,
      categoryLabel: e.categoryLabel,
    })),
    debts: unitDebts
      .map((d) => {
        const paid = d.payments.reduce((s, p) => s + p.amount, 0);
        const remaining = Math.max(0, d.initialAmount - paid);
        return {
          id: d.id,
          type: d.type as "LENT" | "BORROWED",
          counterparty: d.counterparty,
          initialAmount: d.initialAmount,
          remaining,
          note: d.note,
          dueDate: d.dueDate
            ? d.dueDate.toISOString().slice(0, 10)
            : null,
        };
      })
      .filter((d) => d.remaining > 0),
  };
}

export type BuildingSuggestionDTO = {
  id: string;
  title: string;
  body: string;
  status: SuggestionStatusValue;
  managerNote: string | null;
  createdAt: string;
  updatedAt: string;
  unitId: string;
  unitName: string;
  authorName: string | null;
};

function toSuggestionDTO(row: {
  id: string;
  title: string;
  body: string;
  status: string;
  managerNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  unitId: string;
  unit: { name: string };
  author: { name: string | null };
}): BuildingSuggestionDTO {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    status: row.status as SuggestionStatusValue,
    managerNote: row.managerNote,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    unitId: row.unitId,
    unitName: row.unit.name,
    authorName: row.author.name,
  };
}

const suggestionSelect = {
  id: true,
  title: true,
  body: true,
  status: true,
  managerNote: true,
  createdAt: true,
  updatedAt: true,
  unitId: true,
  unit: { select: { name: true } },
  author: { select: { name: true } },
} as const;

/** Resident: create a suggestion from their claimed unit. */
export async function createBuildingSuggestion(
  input: CreateBuildingSuggestionInput,
): Promise<BuildingActionResult> {
  const parsed = createBuildingSuggestionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();

  const { spaceId, title, body } = parsed.data;
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "دسترسی ندارید." };
  }

  const building = await assertBuilding(spaceId, session.userId);
  if (!building.ok) return building;

  const unit = await prisma.unit.findFirst({
    where: { spaceId, linkedUserId: session.userId, isActive: true },
    select: { id: true },
  });
  if (!unit) {
    return { ok: false, error: "واحدی به حساب شما وصل نیست." };
  }

  try {
    const row = await prisma.buildingSuggestion.create({
      data: {
        spaceId,
        unitId: unit.id,
        authorId: session.userId,
        title,
        body,
      },
    });
    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath(`/spaces/${spaceId}/resident`);
    return { ok: true, id: row.id };
  } catch {
    return { ok: false, error: "ثبت پیشنهاد ناموفق بود." };
  }
}

/** Manager inbox — OWNER/EDITOR. */
export async function listBuildingSuggestions(
  spaceId: string,
): Promise<BuildingSuggestionDTO[]> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership || !canMutateMoney(membership.role)) return [];

  const building = await assertBuilding(spaceId, session.userId);
  if (!building.ok) return [];

  const rows = await prisma.buildingSuggestion.findMany({
    where: { spaceId },
    select: suggestionSelect,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(toSuggestionDTO);
}

/** Resident: own suggestions for their unit. */
export async function listMyBuildingSuggestions(
  spaceId: string,
): Promise<BuildingSuggestionDTO[]> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) return [];

  const building = await assertBuilding(spaceId, session.userId);
  if (!building.ok) return [];

  const unit = await prisma.unit.findFirst({
    where: { spaceId, linkedUserId: session.userId, isActive: true },
    select: { id: true },
  });
  if (!unit) return [];

  const rows = await prisma.buildingSuggestion.findMany({
    where: { spaceId, unitId: unit.id, authorId: session.userId },
    select: suggestionSelect,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(toSuggestionDTO);
}

/** Manager updates status (+ optional note). */
export async function updateBuildingSuggestionStatus(
  input: UpdateBuildingSuggestionStatusInput,
): Promise<BuildingActionResult> {
  const parsed = updateBuildingSuggestionStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();

  const { spaceId, suggestionId, status, managerNote } = parsed.data;
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership || !canMutateMoney(membership.role)) {
    return { ok: false, error: "فقط مدیر می‌تواند وضعیت را تغییر دهد." };
  }

  const building = await assertBuilding(spaceId, session.userId, {
    needMutate: true,
  });
  if (!building.ok) return building;

  const existing = await prisma.buildingSuggestion.findFirst({
    where: { id: suggestionId, spaceId },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "پیشنهاد پیدا نشد." };
  }

  try {
    await prisma.buildingSuggestion.update({
      where: { id: suggestionId },
      data: {
        status,
        managerNote:
          managerNote === undefined
            ? undefined
            : managerNote?.trim() || null,
      },
    });
    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath(`/spaces/${spaceId}/resident`);
    return { ok: true, id: suggestionId };
  } catch {
    return { ok: false, error: "به‌روزرسانی وضعیت ناموفق بود." };
  }
}

export type BuildingAnnouncementDTO = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  authorName: string | null;
};

function toAnnouncementDTO(row: {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  author: { name: string | null };
}): BuildingAnnouncementDTO {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    pinned: row.pinned,
    archived: Boolean(row.archivedAt),
    createdAt: row.createdAt.toISOString(),
    authorName: row.author.name,
  };
}

const announcementSelect = {
  id: true,
  title: true,
  body: true,
  pinned: true,
  archivedAt: true,
  createdAt: true,
  author: { select: { name: true } },
} as const;

/** Manager posts an announcement for all residents. */
export async function createBuildingAnnouncement(
  input: CreateBuildingAnnouncementInput,
): Promise<BuildingActionResult> {
  const parsed = createBuildingAnnouncementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();

  const { spaceId, title, body, pinned } = parsed.data;
  const access = await assertBuilding(spaceId, session.userId, {
    needMutate: true,
  });
  if (!access.ok) return access;

  try {
    const row = await prisma.buildingAnnouncement.create({
      data: {
        spaceId,
        authorId: session.userId,
        title,
        body,
        pinned: pinned ?? false,
      },
    });

    const linked = await prisma.unit.findMany({
      where: { spaceId, isActive: true, linkedUserId: { not: null } },
      select: { linkedUserId: true },
    });
    const userIds = [
      ...new Set(
        linked
          .map((u) => u.linkedUserId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    after(() => {
      void notifyBuildingUsers({
        spaceId,
        userIds,
        kind: "ANNOUNCEMENT",
        title,
        body: body.length > 160 ? `${body.slice(0, 157)}…` : body,
        hrefTab: "announcements",
        refId: row.id,
      });
    });

    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath(`/spaces/${spaceId}/board`);
    revalidatePath(`/spaces/${spaceId}/resident`);
    return { ok: true, id: row.id };
  } catch {
    return { ok: false, error: "ثبت اعلان ناموفق بود." };
  }
}

/**
 * Manager: all announcements (incl. archived).
 * Resident / member: active only.
 */
export async function listBuildingAnnouncements(
  spaceId: string,
  opts: { includeArchived?: boolean } = {},
): Promise<BuildingAnnouncementDTO[]> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) return [];

  const building = await assertBuilding(spaceId, session.userId);
  if (!building.ok) return [];

  const isManager = canMutateMoney(membership.role);
  const includeArchived = Boolean(opts.includeArchived && isManager);

  const rows = await prisma.buildingAnnouncement.findMany({
    where: {
      spaceId,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    select: announcementSelect,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 80,
  });
  return rows.map(toAnnouncementDTO);
}

/** Manager: pin / archive / edit. */
export async function updateBuildingAnnouncement(
  input: UpdateBuildingAnnouncementInput,
): Promise<BuildingActionResult> {
  const parsed = updateBuildingAnnouncementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();

  const { spaceId, announcementId, title, body, pinned, archive } =
    parsed.data;
  const access = await assertBuilding(spaceId, session.userId, {
    needMutate: true,
  });
  if (!access.ok) return access;

  const existing = await prisma.buildingAnnouncement.findFirst({
    where: { id: announcementId, spaceId },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "اعلان پیدا نشد." };
  }

  try {
    await prisma.buildingAnnouncement.update({
      where: { id: announcementId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(body !== undefined ? { body } : {}),
        ...(pinned !== undefined ? { pinned } : {}),
        ...(archive === true
          ? { archivedAt: new Date() }
          : archive === false
            ? { archivedAt: null }
            : {}),
      },
    });
    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath(`/spaces/${spaceId}/resident`);
    return { ok: true, id: announcementId };
  } catch {
    return { ok: false, error: "به‌روزرسانی اعلان ناموفق بود." };
  }
}

// ─── Phase 27: in-app notifications (resident inbox) ────────────────────────

export type BuildingNotificationKindValue =
  | "ANNOUNCEMENT"
  | "CHARGE_PAYMENT"
  | "PAYMENT_PROOF";

export type BuildingNotificationDTO = {
  id: string;
  kind: BuildingNotificationKindValue;
  title: string;
  body: string;
  hrefTab: string | null;
  refId: string | null;
  read: boolean;
  createdAt: string;
};

async function notifyBuildingUsers(input: {
  spaceId: string;
  userIds: string[];
  kind: BuildingNotificationKindValue;
  title: string;
  body: string;
  hrefTab?: string;
  refId?: string;
}): Promise<void> {
  const userIds = [...new Set(input.userIds.filter(Boolean))];
  if (userIds.length === 0) return;
  await prisma.buildingNotification.createMany({
    data: userIds.map((userId) => ({
      spaceId: input.spaceId,
      userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      hrefTab: input.hrefTab ?? null,
      refId: input.refId ?? null,
    })),
  });
}

function toNotificationDTO(row: {
  id: string;
  kind: BuildingNotificationKindValue;
  title: string;
  body: string;
  hrefTab: string | null;
  refId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): BuildingNotificationDTO {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    hrefTab: row.hrefTab,
    refId: row.refId,
    read: Boolean(row.readAt),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Resident inbox for the current user in a building space. */
export async function listMyBuildingNotifications(
  spaceId: string,
): Promise<BuildingNotificationDTO[]> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) return [];
  const building = await assertBuilding(spaceId, session.userId);
  if (!building.ok) return [];

  const rows = await prisma.buildingNotification.findMany({
    where: { spaceId, userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return rows.map(toNotificationDTO);
}

export async function countUnreadBuildingNotifications(
  spaceId: string,
): Promise<number> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) return 0;
  return prisma.buildingNotification.count({
    where: { spaceId, userId: session.userId, readAt: null },
  });
}

export async function markBuildingNotificationRead(
  spaceId: string,
  notificationId: string,
): Promise<BuildingActionResult> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "به این فضا دسترسی ندارید." };
  }

  const row = await prisma.buildingNotification.findFirst({
    where: { id: notificationId, spaceId, userId: session.userId },
    select: { id: true, readAt: true },
  });
  if (!row) return { ok: false, error: "اعلان پیدا نشد." };
  if (!row.readAt) {
    await prisma.buildingNotification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }
  revalidatePath(`/spaces/${spaceId}/resident`);
  return { ok: true, id: notificationId };
}

export async function markAllBuildingNotificationsRead(
  spaceId: string,
): Promise<BuildingActionResult> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return { ok: false, error: "به این فضا دسترسی ندارید." };
  }

  await prisma.buildingNotification.updateMany({
    where: { spaceId, userId: session.userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath(`/spaces/${spaceId}/resident`);
  return { ok: true };
}

// ─── Phase 28: charge payment proofs ────────────────────────────────────────

const PROOF_AMT_PREFIX = /^\[amt:(\d+)\]\s?/;

function encodeProofNote(
  proposedAmount: number,
  note: string | null | undefined,
): string | null {
  const parts = [
    proposedAmount > 0 ? `[amt:${proposedAmount}]` : null,
    note?.trim() || null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function parseProofProposedAmount(note: string | null): number | null {
  if (!note) return null;
  const m = note.match(PROOF_AMT_PREFIX);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function stripProofAmtPrefix(note: string | null): string | null {
  if (!note) return null;
  const stripped = note.replace(PROOF_AMT_PREFIX, "").trim();
  return stripped.length > 0 ? stripped : null;
}

export type ChargeProofStatusValue = "PENDING" | "APPROVED" | "REJECTED";

export type ChargePaymentProofDTO = {
  id: string;
  paymentId: string;
  unitId: string;
  unitName: string;
  year: number;
  month: number;
  amount: number;
  mimeType: string;
  byteSize: number;
  note: string | null;
  status: ChargeProofStatusValue;
  uploadedByName: string | null;
  createdAt: string;
  reviewNote: string | null;
};

export type ChargeProofUploadIntentResult =
  | {
      ok: true;
      proofId: string;
      paymentId: string;
      uploadUrl: string;
      storageKey: string;
    }
  | { ok: false; error: string };

export type ChargeProofDownloadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

async function notifyBuildingManagers(
  spaceId: string,
  payload: {
    kind: BuildingNotificationKindValue;
    title: string;
    body: string;
    hrefTab?: string;
    refId?: string;
  },
) {
  const managers = await prisma.spaceMember.findMany({
    where: {
      spaceId,
      role: { in: ["OWNER", "EDITOR"] },
    },
    select: { userId: true },
  });
  await notifyBuildingUsers({
    spaceId,
    userIds: managers.map((m) => m.userId),
    ...payload,
  });
}

/** Resident: start upload — upserts payment shell + creates PENDING proof + presign. */
export async function createChargeProofUploadIntent(
  input: CreateChargeProofUploadIntentInput,
): Promise<ChargeProofUploadIntentResult> {
  if (!isStorageConfigured()) {
    return {
      ok: false,
      error: "ذخیره‌سازی فایل پیکربندی نشده است (S3/R2).",
    };
  }

  const proofGate = await assertFeatureEnabled(
    "proof_uploads",
    "آپلود فیش فعلاً غیرفعال است.",
  );
  if (!proofGate.ok) return proofGate;

  const parsed = createChargeProofUploadIntentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();

  const { spaceId, unitId, year, month, mimeType, byteSize, amount, note } =
    parsed.data;
  const building = await assertBuilding(spaceId, session.userId);
  if (!building.ok) return building;

  const unit = await prisma.unit.findFirst({
    where: {
      id: unitId,
      spaceId,
      isActive: true,
      linkedUserId: session.userId,
    },
  });
  if (!unit) {
    return { ok: false, error: "واحد متصل به حساب شما پیدا نشد." };
  }

  const through =
    year === tehranCivilYear() ? tehranCivilMonth() : year < tehranCivilYear() ? 12 : 0;
  if (month > through && year >= tehranCivilYear()) {
    return { ok: false, error: "برای ماه آینده نمی‌توان رسید فرستاد." };
  }

  const [plan, overrides] = await Promise.all([
    prisma.chargePlan.findUnique({
      where: { spaceId_year: { spaceId, year } },
    }),
    getCachedChargeBaseOverrides(spaceId, year),
  ]);
  const monthBase = effectiveBaseForMonth(
    buildBasesByMonth(plan?.baseCharge ?? 0, overrides),
    month,
  );
  const monthly = unitMonthlyCharge(monthBase, unit.multiplier);
  const payAmount =
    amount != null && amount > 0
      ? asMoney(amount)
      : monthly > 0
        ? monthly
        : 0;

  try {
    // Shell payment only — DUE + amount 0 does not reduce arrears until manager APPROVE.
    const payment = await prisma.chargePayment.upsert({
      where: {
        unitId_year_month: { unitId, year, month },
      },
      create: {
        unitId,
        year,
        month,
        amount: 0,
        status: "DUE",
        date: new Date(),
        note: note?.trim() || "رسید در انتظار تایید مدیر",
        createdById: session.userId,
      },
      update: {},
    });

    const storageKey = chargeProofObjectKey({
      spaceId,
      paymentId: payment.id,
      mimeType,
    });
    const { uploadUrl } = await presignPutObject({
      key: storageKey,
      mimeType,
      byteSize,
    });

    const proof = await prisma.chargePaymentProof.create({
      data: {
        paymentId: payment.id,
        uploadedById: session.userId,
        storageKey,
        mimeType,
        byteSize,
        note: encodeProofNote(payAmount, note),
        status: "PENDING",
      },
    });

    return {
      ok: true,
      proofId: proof.id,
      paymentId: payment.id,
      uploadUrl,
      storageKey,
    };
  } catch {
    return { ok: false, error: "آماده‌سازی آپلود ناموفق بود." };
  }
}

/** Resident: after successful PUT to S3 — notify managers. */
export async function confirmChargeProofUpload(
  input: ConfirmChargeProofUploadInput,
): Promise<BuildingActionResult> {
  const parsed = confirmChargeProofUploadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();

  const { spaceId, proofId } = parsed.data;
  const proof = await prisma.chargePaymentProof.findFirst({
    where: {
      id: proofId,
      uploadedById: session.userId,
      payment: { unit: { spaceId } },
    },
    select: {
      id: true,
      payment: { select: { month: true, unit: { select: { name: true } } } },
    },
  });
  if (!proof) return { ok: false, error: "رسید پیدا نشد." };

  after(() => {
    void notifyBuildingManagers(spaceId, {
      kind: "PAYMENT_PROOF",
      title: `رسید واحد ${proof.payment.unit.name}`,
      body: `رسید شارژ ${monthLabelFa(proof.payment.month)} در انتظار بررسی است.`,
      hrefTab: "charges",
      refId: proof.id,
    });
  });

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath(`/spaces/${spaceId}/resident`);
  return { ok: true, id: proofId };
}

export async function listChargeProofsForManager(
  spaceId: string,
  year?: number,
): Promise<ChargePaymentProofDTO[]> {
  const session = await requireUser();
  const access = await assertBuilding(spaceId, session.userId, {
    needMutate: true,
  });
  if (!access.ok) return [];

  const y = year ?? tehranCivilYear();
  const rows = await prisma.chargePaymentProof.findMany({
    where: {
      payment: { year: y, unit: { spaceId } },
    },
    select: {
      id: true,
      paymentId: true,
      mimeType: true,
      byteSize: true,
      note: true,
      status: true,
      reviewNote: true,
      createdAt: true,
      uploadedBy: { select: { name: true, phone: true } },
      payment: {
        select: {
          unitId: true,
          year: true,
          month: true,
          amount: true,
          unit: { select: { name: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return rows.map((r) => ({
    id: r.id,
    paymentId: r.paymentId,
    unitId: r.payment.unitId,
    unitName: r.payment.unit.name,
    year: r.payment.year,
    month: r.payment.month,
    amount:
      parseProofProposedAmount(r.note) ??
      (r.payment.amount > 0 ? r.payment.amount : 0),
    mimeType: r.mimeType,
    byteSize: r.byteSize,
    note: stripProofAmtPrefix(r.note),
    status: r.status,
    uploadedByName: r.uploadedBy.name?.trim() || r.uploadedBy.phone,
    createdAt: r.createdAt.toISOString(),
    reviewNote: r.reviewNote,
  }));
}

export async function listMyChargeProofs(
  spaceId: string,
): Promise<ChargePaymentProofDTO[]> {
  const session = await requireUser();
  const building = await assertBuilding(spaceId, session.userId);
  if (!building.ok) return [];

  const rows = await prisma.chargePaymentProof.findMany({
    where: {
      uploadedById: session.userId,
      payment: { unit: { spaceId } },
    },
    select: {
      id: true,
      paymentId: true,
      mimeType: true,
      byteSize: true,
      note: true,
      status: true,
      reviewNote: true,
      createdAt: true,
      uploadedBy: { select: { name: true, phone: true } },
      payment: {
        select: {
          unitId: true,
          year: true,
          month: true,
          amount: true,
          unit: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return rows.map((r) => ({
    id: r.id,
    paymentId: r.paymentId,
    unitId: r.payment.unitId,
    unitName: r.payment.unit.name,
    year: r.payment.year,
    month: r.payment.month,
    amount:
      parseProofProposedAmount(r.note) ??
      (r.payment.amount > 0 ? r.payment.amount : 0),
    mimeType: r.mimeType,
    byteSize: r.byteSize,
    note: stripProofAmtPrefix(r.note),
    status: r.status,
    uploadedByName: r.uploadedBy.name?.trim() || r.uploadedBy.phone,
    createdAt: r.createdAt.toISOString(),
    reviewNote: r.reviewNote,
  }));
}

export async function reviewChargeProof(
  input: ReviewChargeProofInput,
): Promise<BuildingActionResult> {
  const parsed = reviewChargeProofSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();

  const { spaceId, proofId, status, reviewNote, amount, paymentStatus } =
    parsed.data;
  const access = await assertBuilding(spaceId, session.userId, {
    needMutate: true,
  });
  if (!access.ok) return access;

  const proof = await prisma.chargePaymentProof.findFirst({
    where: { id: proofId, payment: { unit: { spaceId } } },
    select: {
      id: true,
      paymentId: true,
      uploadedById: true,
      note: true,
      payment: {
        select: {
          month: true,
          amount: true,
          status: true,
          unit: { select: { name: true } },
        },
      },
    },
  });
  if (!proof) return { ok: false, error: "رسید پیدا نشد." };

  const proposed =
    amount != null
      ? asMoney(amount)
      : (parseProofProposedAmount(proof.note) ?? proof.payment.amount);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.chargePaymentProof.update({
        where: { id: proofId },
        data: {
          status,
          reviewedById: session.userId,
          reviewedAt: new Date(),
          reviewNote: reviewNote?.trim() || null,
        },
      });
      if (status === "APPROVED") {
        const credit = proposed > 0 ? proposed : proof.payment.amount;
        const nextStatus =
          paymentStatus ??
          (credit > 0 ? "PAID" : "DUE");
        await tx.chargePayment.update({
          where: { id: proof.paymentId },
          data: {
            amount: credit,
            status: nextStatus,
          },
        });
      } else if (
        proof.payment.status === "DUE" &&
        proof.payment.amount === 0
      ) {
        // Reject pending shell — leave unpaid DUE, do not invent PARTIAL credit.
        await tx.chargePayment.update({
          where: { id: proof.paymentId },
          data: {
            amount: 0,
            status: "DUE",
            note: "رسید رد شد",
          },
        });
      }
    });

    after(() => {
      void notifyBuildingUsers({
        spaceId,
        userIds: [proof.uploadedById],
        kind: "PAYMENT_PROOF",
        title:
          status === "APPROVED"
            ? `رسید واحد ${proof.payment.unit.name} تایید شد`
            : `رسید واحد ${proof.payment.unit.name} رد شد`,
        body:
          reviewNote?.trim() ||
          (status === "APPROVED"
            ? `شارژ ${monthLabelFa(proof.payment.month)} تایید شد.`
            : `شارژ ${monthLabelFa(proof.payment.month)} رد شد.`),
        hrefTab: "payments",
        refId: proofId,
      });
    });

    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath(`/spaces/${spaceId}/resident`);
    return { ok: true, id: proofId };
  } catch {
    return { ok: false, error: "بررسی رسید ناموفق بود." };
  }
}

export async function getChargeProofDownloadUrl(
  spaceId: string,
  proofId: string,
): Promise<ChargeProofDownloadResult> {
  if (!isStorageConfigured()) {
    return { ok: false, error: "ذخیره‌سازی فایل پیکربندی نشده است." };
  }
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) return { ok: false, error: "دسترسی ندارید." };

  const proof = await prisma.chargePaymentProof.findFirst({
    where: { id: proofId, payment: { unit: { spaceId } } },
    select: { storageKey: true, uploadedById: true },
  });
  if (!proof) return { ok: false, error: "رسید پیدا نشد." };

  const isManager = canMutateMoney(membership.role);
  if (!isManager && proof.uploadedById !== session.userId) {
    return { ok: false, error: "دسترسی ندارید." };
  }

  try {
    const url = await presignGetObject(proof.storageKey);
    return { ok: true, url };
  } catch {
    return { ok: false, error: "لینک دانلود ساخته نشد." };
  }
}
