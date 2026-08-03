import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getStorageBucket, isStorageConfigured } from "@/lib/storage/s3";

export type StorageUsageStats = {
  configured: boolean;
  bucket: string | null;
  charge: { count: number; bytes: number };
  fund: { count: number; bytes: number };
  total: { count: number; bytes: number };
  topSpaces: {
    spaceId: string;
    spaceName: string;
    spaceType: string;
    count: number;
    bytes: number;
  }[];
};

/** Aggregates from proof metadata (`byteSize`) — no ListObjects. */
export async function loadStorageUsageStats(): Promise<StorageUsageStats> {
  const configured = isStorageConfigured();
  let bucket: string | null = null;
  if (configured) {
    try {
      bucket = getStorageBucket();
    } catch {
      bucket = null;
    }
  }

  const [chargeAgg, fundAgg, chargeProofs, fundGroups] = await Promise.all([
    prisma.chargePaymentProof.aggregate({
      _count: { _all: true },
      _sum: { byteSize: true },
    }),
    prisma.fundPaymentProof.aggregate({
      _count: { _all: true },
      _sum: { byteSize: true },
    }),
    prisma.chargePaymentProof.findMany({
      select: {
        byteSize: true,
        payment: {
          select: {
            unit: { select: { spaceId: true } },
          },
        },
      },
    }),
    prisma.fundPaymentProof.groupBy({
      by: ["spaceId"],
      _count: { _all: true },
      _sum: { byteSize: true },
    }),
  ]);

  const merged = new Map<string, { count: number; bytes: number }>();

  for (const row of chargeProofs) {
    const spaceId = row.payment.unit.spaceId;
    const prev = merged.get(spaceId) ?? { count: 0, bytes: 0 };
    merged.set(spaceId, {
      count: prev.count + 1,
      bytes: prev.bytes + row.byteSize,
    });
  }

  for (const row of fundGroups) {
    const prev = merged.get(row.spaceId) ?? { count: 0, bytes: 0 };
    merged.set(row.spaceId, {
      count: prev.count + row._count._all,
      bytes: prev.bytes + (row._sum.byteSize ?? 0),
    });
  }

  const ranked = [...merged.entries()]
    .map(([spaceId, v]) => ({ spaceId, ...v }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 8);

  const spaces =
    ranked.length === 0
      ? []
      : await prisma.space.findMany({
          where: { id: { in: ranked.map((r) => r.spaceId) } },
          select: { id: true, name: true, type: true },
        });
  const spaceById = new Map(spaces.map((s) => [s.id, s]));

  const charge = {
    count: chargeAgg._count._all,
    bytes: chargeAgg._sum.byteSize ?? 0,
  };
  const fund = {
    count: fundAgg._count._all,
    bytes: fundAgg._sum.byteSize ?? 0,
  };

  return {
    configured,
    bucket,
    charge,
    fund,
    total: {
      count: charge.count + fund.count,
      bytes: charge.bytes + fund.bytes,
    },
    topSpaces: ranked.map((r) => {
      const space = spaceById.get(r.spaceId);
      return {
        spaceId: r.spaceId,
        spaceName: space?.name ?? "—",
        spaceType: space?.type ?? "?",
        count: r.count,
        bytes: r.bytes,
      };
    }),
  };
}
