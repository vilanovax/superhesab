import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  BACKUP_APP,
  BACKUP_VERSION,
  type BackupFileV2,
  type BackupScope,
  type BackupSpacePayload,
} from "@/lib/backup/types";

function iso(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString();
}

function isoReq(d: Date): string {
  return d.toISOString();
}

const spaceBackupInclude = {
  members: {
    include: {
      user: {
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          isVirtual: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  expenses: {
    include: {
      splits: true,
    },
    orderBy: { date: "asc" as const },
  },
  settlements: { orderBy: { createdAt: "asc" as const } },
  checklist: { orderBy: { createdAt: "asc" as const } },
  note: true,
  debts: {
    include: { payments: { orderBy: { date: "asc" as const } } },
    orderBy: { createdAt: "asc" as const },
  },
  categoryBudgets: true,
  recurringRules: {
    include: {
      occurrences: true,
    },
  },
  units: { orderBy: { createdAt: "asc" as const } },
  chargePlans: { orderBy: { year: "asc" as const } },
  buildingSuggestions: { orderBy: { createdAt: "asc" as const } },
  buildingAnnouncements: { orderBy: { createdAt: "asc" as const } },
  buildingContacts: { orderBy: { sortOrder: "asc" as const } },
  savingsPots: {
    include: {
      transactions: { orderBy: { date: "asc" as const } },
    },
  },
  internalLoans: {
    include: {
      payments: { orderBy: { date: "asc" as const } },
    },
  },
  fundPlan: true,
  fundTurns: { orderBy: { periodIndex: "asc" as const } },
  fundPayments: { orderBy: { periodIndex: "asc" as const } },
} as const;

type SpaceLoaded = Awaited<
  ReturnType<
    typeof prisma.space.findMany<{ include: typeof spaceBackupInclude }>
  >
>[number];

async function loadChargePaymentsForSpace(spaceId: string) {
  const units = await prisma.unit.findMany({
    where: { spaceId },
    select: { id: true },
  });
  const unitIds = units.map((u) => u.id);
  if (unitIds.length === 0) return [];

  return prisma.chargePayment.findMany({
    where: { unitId: { in: unitIds } },
    include: {
      proofs: {
        select: {
          mimeType: true,
          byteSize: true,
          note: true,
          status: true,
          reviewNote: true,
        },
      },
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
}

export function serializeSpace(
  space: SpaceLoaded,
  chargePayments: Awaited<ReturnType<typeof loadChargePaymentsForSpace>>,
): BackupSpacePayload {
  return {
    originalSpaceId: space.id,
    name: space.name,
    type: space.type,
    currency: space.currency,
    roundUpToThousand: space.roundUpToThousand,
    monthlyBudget: space.monthlyBudget,
    defaultPlanYear: space.defaultPlanYear,
    archivedAt: iso(space.archivedAt),
    members: space.members.map((m) => ({
      originalMemberId: m.id,
      originalUserId: m.userId,
      role: m.role,
      defaultShare: m.defaultShare,
      user: {
        originalUserId: m.user.id,
        phone: m.user.phone,
        name: m.user.name,
        email: m.user.email,
        isVirtual: m.user.isVirtual,
      },
    })),
    expenses: space.expenses.map((e) => ({
      originalId: e.id,
      title: e.title,
      totalAmount: e.totalAmount,
      paidByOriginalUserId: e.paidById,
      createdByOriginalUserId: e.createdById,
      transactionType: e.transactionType,
      category: e.category,
      categoryLabel: e.categoryLabel,
      isCategoryLocked: e.isCategoryLocked,
      date: isoReq(e.date),
      splitMode: e.splitMode,
      splits: e.splits.map((s) => ({
        originalUserId: s.userId,
        owedAmount: s.owedAmount,
        share: s.share,
        percent: s.percent,
      })),
    })),
    settlements: space.settlements.map((s) => ({
      fromOriginalUserId: s.fromUserId,
      toOriginalUserId: s.toUserId,
      amount: s.amount,
      status: s.status,
      createdAt: isoReq(s.createdAt),
    })),
    checklist: space.checklist.map((c) => ({
      title: c.title,
      isCompleted: c.isCompleted,
      createdAt: isoReq(c.createdAt),
    })),
    spaceNote: space.note
      ? {
          body: space.note.body,
          updatedAt: isoReq(space.note.updatedAt),
        }
      : null,
    debts: space.debts.map((d) => ({
      originalId: d.id,
      type: d.type,
      counterparty: d.counterparty,
      initialAmount: d.initialAmount,
      dueDate: iso(d.dueDate),
      status: d.status,
      createdByOriginalUserId: d.createdById,
      createdAt: isoReq(d.createdAt),
      payments: d.payments.map((p) => ({
        amount: p.amount,
        date: isoReq(p.date),
        note: p.note,
        createdByOriginalUserId: p.createdById,
      })),
    })),
    categoryBudgets: space.categoryBudgets.map((b) => ({
      category: b.category,
      amount: b.amount,
    })),
    recurringRules: space.recurringRules.map((r) => ({
      originalId: r.id,
      title: r.title,
      amount: r.amount,
      transactionType: r.transactionType,
      category: r.category,
      dayOfMonth: r.dayOfMonth,
      active: r.active,
      createdByOriginalUserId: r.createdById,
      occurrences: r.occurrences.map((o) => ({
        monthKey: o.monthKey,
        originalExpenseId: o.expenseId,
      })),
    })),
    units: space.units.map((u) => ({
      originalId: u.id,
      name: u.name,
      area: u.area,
      phone: u.phone,
      multiplier: u.multiplier,
      isActive: u.isActive,
      linkedOriginalUserId: u.linkedUserId,
    })),
    chargePlans: space.chargePlans.map((p) => ({
      year: p.year,
      baseCharge: p.baseCharge,
    })),
    chargePayments: chargePayments.map((p) => ({
      originalUnitId: p.unitId,
      year: p.year,
      month: p.month,
      amount: p.amount,
      status: p.status,
      date: isoReq(p.date),
      note: p.note,
      createdByOriginalUserId: p.createdById,
      proofs: p.proofs.map((pr) => ({
        mimeType: pr.mimeType,
        byteSize: pr.byteSize,
        note: pr.note,
        status: pr.status,
        reviewNote: pr.reviewNote,
      })),
    })),
    buildingSuggestions: space.buildingSuggestions.map((s) => ({
      originalUnitId: s.unitId,
      authorOriginalUserId: s.authorId,
      title: s.title,
      body: s.body,
      status: s.status,
      managerNote: s.managerNote,
      createdAt: isoReq(s.createdAt),
    })),
    buildingAnnouncements: space.buildingAnnouncements.map((a) => ({
      authorOriginalUserId: a.authorId,
      title: a.title,
      body: a.body,
      pinned: a.pinned,
      archivedAt: iso(a.archivedAt),
      createdAt: isoReq(a.createdAt),
    })),
    buildingContacts: space.buildingContacts.map((c) => ({
      title: c.title,
      phone: c.phone,
      category: c.category,
      note: c.note,
      sortOrder: c.sortOrder,
      pinned: c.pinned,
      visibleToResidents: c.visibleToResidents,
    })),
    savingsPots: space.savingsPots.map((pot) => ({
      originalId: pot.id,
      title: pot.title,
      targetAmount: pot.targetAmount,
      deadline: iso(pot.deadline),
      status: pot.status,
      transactions: pot.transactions.map((t) => ({
        originalMemberId: t.memberId,
        amount: t.amount,
        type: t.type,
        note: t.note,
        date: isoReq(t.date),
      })),
    })),
    internalLoans: space.internalLoans.map((loan) => ({
      fromOriginalMemberId: loan.fromMemberId,
      toOriginalMemberId: loan.toMemberId,
      initialAmount: loan.initialAmount,
      dueDate: iso(loan.dueDate),
      status: loan.status,
      note: loan.note,
      payments: loan.payments.map((p) => ({
        amount: p.amount,
        date: isoReq(p.date),
        note: p.note,
      })),
    })),
    fundPlan: space.fundPlan
      ? {
          shareAmount: space.fundPlan.shareAmount,
          periodCount: space.fundPlan.periodCount,
        }
      : null,
    fundTurns: space.fundTurns.map((t) => ({
      periodIndex: t.periodIndex,
      winnerOriginalMemberId: t.winnerMemberId,
      status: t.status,
      note: t.note,
    })),
    fundPayments: space.fundPayments.map((p) => ({
      periodIndex: p.periodIndex,
      originalMemberId: p.memberId,
      amount: p.amount,
      date: isoReq(p.date),
      note: p.note,
      createdByOriginalUserId: p.createdById,
    })),
  };
}

export async function buildBackupForOwnedSpaces(input: {
  userId: string;
  scope: BackupScope;
  spaceId?: string;
}): Promise<BackupFileV2> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { id: true, phone: true, name: true, email: true },
  });

  const ownedMemberships = await prisma.spaceMember.findMany({
    where: {
      userId: input.userId,
      role: "OWNER",
      ...(input.spaceId ? { spaceId: input.spaceId } : {}),
    },
    select: { spaceId: true },
    orderBy: { createdAt: "asc" },
  });

  const spaceIds = ownedMemberships.map((m) => m.spaceId);
  if (spaceIds.length === 0) {
    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      app: BACKUP_APP,
      scope: input.scope,
      user,
      spaces: [],
    };
  }

  const spaces = await prisma.space.findMany({
    where: { id: { in: spaceIds } },
    include: spaceBackupInclude,
    orderBy: { createdAt: "asc" },
  });

  const payloads: BackupSpacePayload[] = [];
  for (const space of spaces) {
    const payments = await loadChargePaymentsForSpace(space.id);
    payloads.push(serializeSpace(space, payments));
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: BACKUP_APP,
    scope: input.scope,
    user,
    spaces: payloads,
  };
}

async function serializeSpacesByIds(
  spaceIds: string[],
): Promise<BackupSpacePayload[]> {
  if (spaceIds.length === 0) return [];
  const spaces = await prisma.space.findMany({
    where: { id: { in: spaceIds } },
    include: spaceBackupInclude,
    orderBy: { createdAt: "asc" },
  });
  const payloads: BackupSpacePayload[] = [];
  for (const space of spaces) {
    const payments = await loadChargePaymentsForSpace(space.id);
    payloads.push(serializeSpace(space, payments));
  }
  return payloads;
}

async function loadPlatformUserDirectory(userIds?: string[]) {
  const users = await prisma.user.findMany({
    where: userIds ? { id: { in: userIds } } : undefined,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      phone: true,
      name: true,
      email: true,
      isVirtual: true,
      platformRole: true,
      disabledAt: true,
      createdAt: true,
    },
  });
  return users.map((u) => ({
    originalUserId: u.id,
    phone: u.phone,
    name: u.name,
    email: u.email,
    isVirtual: u.isVirtual,
    platformRole: u.platformRole as "USER" | "ADMIN",
    disabledAt: iso(u.disabledAt),
    createdAt: isoReq(u.createdAt),
  }));
}

/** Full platform snapshot for admin — all users (no passwords) + all spaces. */
export async function buildPlatformBackup(adminUserId: string): Promise<BackupFileV2> {
  const admin = await prisma.user.findUniqueOrThrow({
    where: { id: adminUserId },
    select: { id: true, phone: true, name: true, email: true },
  });

  const spaceRows = await prisma.space.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  const [users, spaces] = await Promise.all([
    loadPlatformUserDirectory(),
    serializeSpacesByIds(spaceRows.map((s) => s.id)),
  ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: BACKUP_APP,
    scope: "platform",
    user: admin,
    users,
    spaces,
  };
}

/** All spaces owned by a user (admin selective export). */
export async function buildBackupForUserOwnedSpaces(input: {
  adminUserId: string;
  targetUserId: string;
}): Promise<BackupFileV2> {
  const [admin, target] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: input.adminUserId },
      select: { id: true, phone: true, name: true, email: true },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: input.targetUserId },
      select: { id: true },
    }),
  ]);

  const owned = await prisma.spaceMember.findMany({
    where: { userId: target.id, role: "OWNER" },
    select: { spaceId: true },
    orderBy: { createdAt: "asc" },
  });

  const [users, spaces] = await Promise.all([
    loadPlatformUserDirectory([target.id]),
    serializeSpacesByIds(owned.map((m) => m.spaceId)),
  ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: BACKUP_APP,
    scope: "user",
    user: admin,
    users,
    spaces,
  };
}

/** Explicit space id list (admin selective export). */
export async function buildBackupForSpaceIds(input: {
  adminUserId: string;
  spaceIds: string[];
}): Promise<BackupFileV2> {
  const admin = await prisma.user.findUniqueOrThrow({
    where: { id: input.adminUserId },
    select: { id: true, phone: true, name: true, email: true },
  });

  const uniqueIds = [...new Set(input.spaceIds.filter(Boolean))];
  const spaces = await serializeSpacesByIds(uniqueIds);

  const memberUserIds = new Set<string>();
  for (const space of spaces) {
    for (const m of space.members) {
      memberUserIds.add(m.originalUserId);
    }
  }

  const users = await loadPlatformUserDirectory([...memberUserIds]);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: BACKUP_APP,
    scope: "platform",
    user: admin,
    users,
    spaces,
  };
}
