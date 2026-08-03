import { prisma } from "@/lib/db/prisma";
import type { SpaceType } from "@/types";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type AdminDashboardStats = {
  usersTotal: number;
  usersReal: number;
  usersVirtual: number;
  usersDisabled: number;
  usersRegistered7d: number;
  usersRegistered30d: number;
  usersActive30d: number;
  spacesTotal: number;
  spacesActive: number;
  spacesArchived: number;
  spacesByType: { type: SpaceType; label: string; count: number }[];
  expensesTotal: number;
  settlementsTotal: number;
  partnerWaitingInvite: number;
};

const TYPE_LABELS: Record<SpaceType, string> = {
  TRIP: "سفر",
  PARTNER: "مشترک",
  PERSONAL: "خانه (قدیم)",
  FAMILY: "خانه",
  BUILDING: "ساختمان",
  FUND: "صندوق",
};

export async function loadAdminDashboardStats(): Promise<AdminDashboardStats> {
  const since7 = daysAgo(7);
  const since30 = daysAgo(30);

  const [
    usersTotal,
    usersReal,
    usersVirtual,
    usersDisabled,
    usersRegistered7d,
    usersRegistered30d,
    usersActive30d,
    spacesTotal,
    spacesActive,
    spacesArchived,
    typeGroups,
    expensesTotal,
    settlementsTotal,
    partnerSpaces,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isVirtual: false } }),
    prisma.user.count({ where: { isVirtual: true } }),
    prisma.user.count({ where: { disabledAt: { not: null } } }),
    prisma.user.count({
      where: { isVirtual: false, createdAt: { gte: since7 } },
    }),
    prisma.user.count({
      where: { isVirtual: false, createdAt: { gte: since30 } },
    }),
    prisma.user.count({
      where: {
        isVirtual: false,
        disabledAt: null,
        lastSeenAt: { gte: since30 },
      },
    }),
    prisma.space.count(),
    prisma.space.count({ where: { archivedAt: null } }),
    prisma.space.count({ where: { archivedAt: { not: null } } }),
    prisma.space.groupBy({
      by: ["type"],
      _count: { _all: true },
      where: { archivedAt: null },
    }),
    prisma.expense.count(),
    prisma.settlement.count(),
    prisma.space.findMany({
      where: { type: "PARTNER", archivedAt: null },
      select: { id: true, _count: { select: { members: true } } },
    }),
  ]);

  const partnerWaitingInvite = partnerSpaces.filter(
    (s) => s._count.members < 2,
  ).length;

  const spacesByType = typeGroups
    .map((g) => ({
      type: g.type,
      label: TYPE_LABELS[g.type] ?? g.type,
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    usersTotal,
    usersReal,
    usersVirtual,
    usersDisabled,
    usersRegistered7d,
    usersRegistered30d,
    usersActive30d,
    spacesTotal,
    spacesActive,
    spacesArchived,
    spacesByType,
    expensesTotal,
    settlementsTotal,
    partnerWaitingInvite,
  };
}
