"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import {
  savingsNetBalance,
  savingsProgressPercent,
  savingsRemainingToTarget,
  type SavingsPotStatusValue,
  type SavingsTransactionTypeValue,
} from "@/lib/family-savings";
import { parseExpenseDateInput } from "@/lib/format";
import { asMoney } from "@/lib/money";
import { canMutateMoney } from "@/lib/rbac";
import { getTemplate } from "@/lib/templates/registry";
import {
  addSavingsTransactionSchema,
  createSavingsPotSchema,
  updateSavingsPotStatusSchema,
  type AddSavingsTransactionInput,
  type CreateSavingsPotInput,
  type UpdateSavingsPotStatusInput,
} from "@/lib/validations/family-savings";

export type SavingsActionResult =
  | { ok: true; potId: string }
  | { ok: false; error: string };

export type SavingsTransactionDTO = {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  type: SavingsTransactionTypeValue;
  date: string;
  note: string | null;
};

export type SavingsPotDTO = {
  id: string;
  spaceId: string;
  title: string;
  targetAmount: number;
  deadline: string | null;
  status: SavingsPotStatusValue;
  balance: number;
  remainingToTarget: number;
  progressPercent: number;
  transactions: SavingsTransactionDTO[];
};

async function assertSavingsEnabled(spaceId: string, userId: string) {
  const membership = await requireSpaceMember(spaceId, userId);
  if (!membership) {
    return { ok: false as const, error: "به این فضا دسترسی ندارید." };
  }

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { type: true },
  });
  if (!space) {
    return { ok: false as const, error: "فضا پیدا نشد." };
  }

  if (!getTemplate(space.type).features.savingsPot) {
    return {
      ok: false as const,
      error: "ماژول پس‌انداز در این قالب فعال نیست.",
    };
  }

  return { ok: true as const, membership };
}

function memberLabel(user: { name: string | null; phone: string }): string {
  return user.name?.trim() || user.phone || "عضو";
}

function toPotDTO(row: {
  id: string;
  spaceId: string;
  title: string;
  targetAmount: number;
  deadline: Date | null;
  status: SavingsPotStatusValue;
  transactions: {
    id: string;
    memberId: string;
    amount: number;
    type: SavingsTransactionTypeValue;
    date: Date;
    note: string | null;
    member: { user: { name: string | null; phone: string } };
  }[];
}): SavingsPotDTO {
  const balance = savingsNetBalance(row.transactions);
  return {
    id: row.id,
    spaceId: row.spaceId,
    title: row.title,
    targetAmount: row.targetAmount,
    deadline: row.deadline
      ? row.deadline.toISOString().slice(0, 10)
      : null,
    status: row.status,
    balance,
    remainingToTarget: savingsRemainingToTarget(row.targetAmount, balance),
    progressPercent: savingsProgressPercent(row.targetAmount, balance),
    transactions: row.transactions.map((t) => ({
      id: t.id,
      memberId: t.memberId,
      memberName: memberLabel(t.member.user),
      amount: t.amount,
      type: t.type,
      date: t.date.toISOString().slice(0, 10),
      note: t.note,
    })),
  };
}

const potInclude = {
  transactions: {
    include: {
      member: {
        include: {
          user: { select: { name: true, phone: true } },
        },
      },
    },
    orderBy: { date: "desc" as const },
  },
};

export async function listSavingsPots(
  spaceId: string,
): Promise<SavingsPotDTO[]> {
  const session = await requireUser();
  const access = await assertSavingsEnabled(spaceId, session.userId);
  if (!access.ok) return [];

  const rows = await prisma.savingsPot.findMany({
    where: { spaceId },
    include: potInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return rows.map((r) =>
    toPotDTO({
      ...r,
      status: r.status as SavingsPotStatusValue,
      transactions: r.transactions.map((t) => ({
        ...t,
        type: t.type as SavingsTransactionTypeValue,
      })),
    }),
  );
}

export async function createSavingsPot(
  input: CreateSavingsPotInput,
): Promise<SavingsActionResult> {
  const session = await requireUser();
  const parsed = createSavingsPotSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

  const data = parsed.data;
  const access = await assertSavingsEnabled(data.spaceId, session.userId);
  if (!access.ok) return access;
  if (!canMutateMoney(access.membership.role)) {
    return { ok: false, error: "نقش ناظر اجازه ساخت صندوق ندارد." };
  }

  try {
    const pot = await prisma.savingsPot.create({
      data: {
        spaceId: data.spaceId,
        title: data.title,
        targetAmount: asMoney(data.targetAmount),
        deadline: data.deadline
          ? parseExpenseDateInput(data.deadline)
          : null,
      },
    });
    revalidatePath(`/spaces/${data.spaceId}`);
    return { ok: true, potId: pot.id };
  } catch {
    return { ok: false, error: "ساخت صندوق ناموفق بود." };
  }
}

export async function addSavingsTransaction(
  input: AddSavingsTransactionInput,
): Promise<SavingsActionResult> {
  const session = await requireUser();
  const parsed = addSavingsTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

  const data = parsed.data;
  const access = await assertSavingsEnabled(data.spaceId, session.userId);
  if (!access.ok) return access;
  if (!canMutateMoney(access.membership.role)) {
    return { ok: false, error: "نقش ناظر اجازه ثبت تراکنش ندارد." };
  }

  const pot = await prisma.savingsPot.findFirst({
    where: { id: data.potId, spaceId: data.spaceId },
    include: {
      transactions: { select: { amount: true, type: true } },
    },
  });
  if (!pot) {
    return { ok: false, error: "صندوق پیدا نشد." };
  }
  if (pot.status === "ARCHIVED") {
    return { ok: false, error: "این صندوق آرشیو شده است." };
  }

  const member = await prisma.spaceMember.findFirst({
    where: { id: data.memberId, spaceId: data.spaceId },
  });
  if (!member) {
    return { ok: false, error: "عضو انتخاب‌شده در این فضا نیست." };
  }

  const amount = asMoney(data.amount);
  if (data.type === "WITHDRAWAL") {
    const balance = savingsNetBalance(
      pot.transactions.map((t) => ({
        amount: t.amount,
        type: t.type as SavingsTransactionTypeValue,
      })),
    );
    if (amount > balance) {
      return {
        ok: false,
        error: `برداشت از موجودی (${balance}) بیشتر است.`,
      };
    }
  }

  try {
    await prisma.savingsTransaction.create({
      data: {
        potId: pot.id,
        memberId: data.memberId,
        amount,
        type: data.type,
        date: parseExpenseDateInput(data.date),
        note: data.note?.trim() || null,
      },
    });

    const txs = [
      ...pot.transactions.map((t) => ({
        amount: t.amount,
        type: t.type as SavingsTransactionTypeValue,
      })),
      { amount, type: data.type },
    ];
    const nextBalance = savingsNetBalance(txs);
    if (
      pot.status === "ACTIVE" &&
      nextBalance >= pot.targetAmount &&
      data.type === "DEPOSIT"
    ) {
      await prisma.savingsPot.update({
        where: { id: pot.id },
        data: { status: "COMPLETED" },
      });
    }

    revalidatePath(`/spaces/${data.spaceId}`);
    return { ok: true, potId: pot.id };
  } catch {
    return { ok: false, error: "ثبت تراکنش ناموفق بود." };
  }
}

export async function updateSavingsPotStatus(
  input: UpdateSavingsPotStatusInput,
): Promise<SavingsActionResult> {
  const session = await requireUser();
  const parsed = updateSavingsPotStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }

  const data = parsed.data;
  const access = await assertSavingsEnabled(data.spaceId, session.userId);
  if (!access.ok) return access;
  if (!canMutateMoney(access.membership.role)) {
    return { ok: false, error: "نقش ناظر اجازه تغییر وضعیت ندارد." };
  }

  const pot = await prisma.savingsPot.findFirst({
    where: { id: data.potId, spaceId: data.spaceId },
  });
  if (!pot) {
    return { ok: false, error: "صندوق پیدا نشد." };
  }

  await prisma.savingsPot.update({
    where: { id: pot.id },
    data: { status: data.status },
  });
  revalidatePath(`/spaces/${data.spaceId}`);
  return { ok: true, potId: pot.id };
}
