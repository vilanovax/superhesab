"use server";

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
import { parseExpenseDateInput } from "@/lib/format";
import { asMoney } from "@/lib/money";
import { canMutateMoney } from "@/lib/rbac";
import { getTemplate } from "@/lib/templates/registry";
import {
  createUnitSchema,
  updateUnitSchema,
  upsertChargePaymentSchema,
  upsertChargePlanSchema,
  type CreateUnitInput,
  type UpdateUnitInput,
  type UpsertChargePaymentInput,
  type UpsertChargePlanInput,
} from "@/lib/validations/building";

export type BuildingActionResult =
  | { ok: true; id?: string }
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
    return { ok: true, id: unit.id };
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

export async function listUnitsForSettings(spaceId: string): Promise<
  {
    id: string;
    name: string;
    area: number | null;
    multiplier: number;
    isActive: boolean;
  }[]
> {
  const session = await requireUser();
  const access = await assertBuilding(spaceId, session.userId);
  if (!access.ok) return [];

  return prisma.unit.findMany({
    where: { spaceId },
    select: {
      id: true,
      name: true,
      area: true,
      multiplier: true,
      isActive: true,
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
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
