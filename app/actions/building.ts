"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import {
  tehranCivilMonth,
  tehranCivilYear,
  unitArrears,
  unitCollected,
  unitMonthlyCharge,
  type ChargeStatusValue,
  type PaymentSlice,
} from "@/lib/building";
import { jalaliYearBounds } from "@/lib/jalali";
import { parseExpenseDateInput } from "@/lib/format";
import { asMoney } from "@/lib/money";
import { canMutateMoney } from "@/lib/rbac";
import { getTemplate } from "@/lib/templates/registry";
import {
  createUnitSchema,
  updateUnitSchema,
  upsertChargePaymentSchema,
  upsertChargePlanSchema,
  createBuildingSuggestionSchema,
  updateBuildingSuggestionStatusSchema,
  createBuildingAnnouncementSchema,
  updateBuildingAnnouncementSchema,
  type CreateUnitInput,
  type UpdateUnitInput,
  type UpsertChargePaymentInput,
  type UpsertChargePlanInput,
  type CreateBuildingSuggestionInput,
  type UpdateBuildingSuggestionStatusInput,
  type CreateBuildingAnnouncementInput,
  type UpdateBuildingAnnouncementInput,
} from "@/lib/validations/building";
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
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { type: true },
  });
  if (!space || !getTemplate(space.type).features.buildingCharges) {
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

  const spaceMeta = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { defaultPlanYear: true },
  });

  const now = new Date();
  const currentJalali = tehranCivilYear(now);
  const y =
    year && year >= 1390 && year <= 1500
      ? year
      : spaceMeta?.defaultPlanYear &&
          spaceMeta.defaultPlanYear >= 1390 &&
          spaceMeta.defaultPlanYear <= 1500
        ? spaceMeta.defaultPlanYear
        : currentJalali;
  const throughMonth =
    y === currentJalali
      ? tehranCivilMonth(now)
      : y < currentJalali
        ? 12
        : 0;

  const [plan, units, payments] = await Promise.all([
    prisma.chargePlan.findUnique({
      where: { spaceId_year: { spaceId, year: y } },
    }),
    prisma.unit.findMany({
      where: { spaceId },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.chargePayment.findMany({
      where: {
        year: y,
        unit: { spaceId },
      },
      orderBy: [{ month: "asc" }, { unitId: "asc" }],
    }),
  ]);

  const baseCharge = plan?.baseCharge ?? 0;
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
    const monthlyCharge = unitMonthlyCharge(baseCharge, u.multiplier);
    const arrears = plan
      ? unitArrears({
          baseCharge,
          multiplier: u.multiplier,
          throughMonth,
          payments: slices,
        })
      : 0;
    const collected = plan
      ? unitCollected({
          baseCharge,
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
    (s, u) => s + u.monthlyCharge * Math.max(0, throughMonth),
    0,
  );
  const collectedYtd = active.reduce((s, u) => s + u.collected, 0);
  const arrearsTotal = active.reduce((s, u) => s + u.arrears, 0);
  const debtors = active
    .filter((u) => u.arrears > 0)
    .sort((a, b) => b.arrears - a.arrears);

  return {
    year: y,
    throughMonth,
    plan: plan
      ? { id: plan.id, year: plan.year, baseCharge: plan.baseCharge }
      : null,
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

export type AnnualCalendarUnit = {
  id: string;
  name: string;
  monthlyCharge: number;
};

export type AnnualChargeCalendarDTO = {
  spaceId: string;
  year: number;
  /** Months 1..throughMonth are "due if missing"; later months are future. */
  throughMonth: number;
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

  const spaceMeta = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { defaultPlanYear: true },
  });

  const now = new Date();
  const currentJalali = tehranCivilYear(now);
  const y =
    year && year >= 1390 && year <= 1500
      ? year
      : spaceMeta?.defaultPlanYear &&
          spaceMeta.defaultPlanYear >= 1390 &&
          spaceMeta.defaultPlanYear <= 1500
        ? spaceMeta.defaultPlanYear
        : currentJalali;
  const throughMonth =
    y === currentJalali
      ? tehranCivilMonth(now)
      : y < currentJalali
        ? 12
        : 0;

  const [plan, units, payments] = await Promise.all([
    prisma.chargePlan.findUnique({
      where: { spaceId_year: { spaceId, year: y } },
      select: { baseCharge: true },
    }),
    prisma.unit.findMany({
      where: { spaceId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, multiplier: true },
    }),
    prisma.chargePayment.findMany({
      where: {
        year: y,
        unit: { spaceId, isActive: true },
      },
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

  const baseCharge = plan?.baseCharge ?? 0;
  const byUnitMonth: AnnualChargeCalendarDTO["byUnitMonth"] = {};
  for (const u of units) {
    byUnitMonth[u.id] = {};
  }
  for (const p of payments) {
    const bucket = byUnitMonth[p.unitId] ?? (byUnitMonth[p.unitId] = {});
    bucket[p.month] = toPaymentDTO(p);
  }

  return {
    spaceId,
    year: y,
    throughMonth,
    units: units.map((u) => ({
      id: u.id,
      name: u.name,
      monthlyCharge: unitMonthlyCharge(baseCharge, u.multiplier),
    })),
    byUnitMonth,
  };
}

export async function createUnit(
  input: CreateUnitInput,
): Promise<BuildingActionResult> {
  const session = await requireUser();
  const parsed = createUnitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
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
        multiplier: parsed.data.multiplier ?? 1000,
        isActive: true,
      },
    });
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
  const session = await requireUser();
  const parsed = updateUnitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const access = await assertBuilding(parsed.data.spaceId, session.userId, {
    needOwner: true,
  });
  if (!access.ok) return access;

  const updated = await prisma.unit.updateMany({
    where: { id: parsed.data.unitId, spaceId: parsed.data.spaceId },
    data: {
      name: parsed.data.name,
      area: parsed.data.area ?? null,
      multiplier: parsed.data.multiplier,
      isActive: parsed.data.isActive,
    },
  });
  if (updated.count === 0) {
    return { ok: false, error: "واحد پیدا نشد." };
  }
  revalidatePath(`/spaces/${parsed.data.spaceId}`);
  revalidatePath(`/spaces/${parsed.data.spaceId}/settings`);
  return { ok: true, id: parsed.data.unitId };
}

export async function upsertChargePlan(
  input: UpsertChargePlanInput,
): Promise<BuildingActionResult> {
  const session = await requireUser();
  const parsed = upsertChargePlanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
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
    revalidatePath(`/spaces/${parsed.data.spaceId}`);
    revalidatePath(`/spaces/${parsed.data.spaceId}/settings`);
    return { ok: true, id: plan.id };
  } catch {
    return { ok: false, error: "ذخیره پلن شارژ ناموفق بود." };
  }
}

export async function upsertChargePayment(
  input: UpsertChargePaymentInput,
): Promise<BuildingActionResult> {
  const session = await requireUser();
  const parsed = upsertChargePaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
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
        amount: asMoney(parsed.data.amount),
        status: parsed.data.status,
        date,
        note: parsed.data.note?.trim() || null,
        createdById: session.userId,
      },
      update: {
        amount: asMoney(parsed.data.amount),
        status: parsed.data.status,
        date,
        note: parsed.data.note?.trim() || null,
      },
    });
    revalidatePath(`/spaces/${parsed.data.spaceId}`);
    return { ok: true, id: row.id };
  } catch {
    return { ok: false, error: "ثبت وصول ناموفق بود." };
  }
}

export type BuildingUnitRow = {
  id: string;
  name: string;
  area: number | null;
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

  const rows = await prisma.unit.findMany({
    where: { spaceId },
    select: {
      id: true,
      name: true,
      area: true,
      multiplier: true,
      isActive: true,
      inviteToken: true,
      linkedUserId: true,
      linkedAt: true,
      linkedUser: { select: { name: true, phone: true } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    area: u.area,
    multiplier: u.multiplier,
    isActive: u.isActive,
    inviteToken: u.inviteToken,
    linkedUserId: u.linkedUserId,
    linkedUserName:
      u.linkedUser?.name?.trim() ||
      u.linkedUser?.phone ||
      null,
    linkedAt: u.linkedAt ? u.linkedAt.toISOString() : null,
  }));
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

    revalidatePath(`/spaces/${unit.spaceId}`);
    revalidatePath(`/spaces/${unit.spaceId}/settings`);
    revalidatePath(`/spaces/${unit.spaceId}/resident`);
    return { ok: true, spaceId: unit.spaceId, unitId: unit.id };
  } catch {
    return { ok: false, error: "اتصال به واحد ناموفق بود." };
  }
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
};

/** Resident (VIEWER linked to a unit) read-only portal data. */
export async function getResidentPortalData(
  spaceId: string,
): Promise<ResidentPortalDTO | null> {
  const session = await requireUser();
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) return null;

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: {
      id: true,
      name: true,
      type: true,
      currency: true,
      defaultPlanYear: true,
    },
  });
  if (!space || !getTemplate(space.type).features.buildingCharges) {
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
  const plan = await prisma.chargePlan.findUnique({
    where: { spaceId_year: { spaceId, year } },
  });
  const baseCharge = plan?.baseCharge ?? 0;
  const monthlyCharge = unitMonthlyCharge(baseCharge, unit.multiplier);

  const payments = await prisma.chargePayment.findMany({
    where: { unitId: unit.id, year },
    orderBy: [{ month: "desc" }],
  });
  const slices: PaymentSlice[] = payments.map((p) => ({
    month: p.month,
    amount: p.amount,
    status: p.status as ChargeStatusValue,
  }));
  const arrears = unitArrears({
    baseCharge,
    multiplier: unit.multiplier,
    throughMonth,
    payments: slices,
  });
  const collected = unitCollected({
    baseCharge,
    multiplier: unit.multiplier,
    payments: slices,
  });

  const bounds = jalaliYearBounds(year);

  const expenses = await prisma.expense.findMany({
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
    },
    orderBy: { date: "desc" },
    take: 80,
  });

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
    expenses: expenses.map((e) => ({
      id: e.id,
      title: e.title,
      totalAmount: e.totalAmount,
      date: e.date.toISOString(),
      category: e.category,
      categoryLabel: e.categoryLabel,
    })),
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
  const session = await requireUser();
  const parsed = createBuildingSuggestionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

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
  const session = await requireUser();
  const parsed = updateBuildingSuggestionStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

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
  const session = await requireUser();
  const parsed = createBuildingAnnouncementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

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
    revalidatePath(`/spaces/${spaceId}`);
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
  const session = await requireUser();
  const parsed = updateBuildingAnnouncementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

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
