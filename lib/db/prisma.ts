import { PrismaClient } from "@/lib/generated/prisma/client";
import { ExpenseCategory, SpaceType } from "@/lib/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Dev fingerprint — when Turbopack re-evaluates this module after
 * `prisma generate`, we always drop the cached client so DMMF/enums
 * (e.g. BUILDING_GARDENING) cannot go stale under HMR.
 */
const SCHEMA_FINGERPRINT = [
  Object.keys(SpaceType).sort().join(","),
  Object.keys(ExpenseCategory).sort().join(","),
  "expense.categoryLabel",
  "debt.module.v1",
  "personal.depth.v1",
  "building.template.v1",
  "space.archivedAt.v1",
  "space.defaultPlanYear.v2",
  "unit.claim.v1",
  "building.suggestions.v1",
  "building.announcements.v1",
  "building.calendar.v1",
  "building.notifications.v1",
  "building.paymentProof.v1",
].join("|");

void SCHEMA_FINGERPRINT;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const isDev = process.env.NODE_ENV !== "production";

if (isDev && globalForPrisma.prisma) {
  // Module re-eval (HMR / generate): discard stale singleton before export.
  void globalForPrisma.prisma.$disconnect().catch(() => undefined);
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (isDev) {
  globalForPrisma.prisma = prisma;
} else {
  globalForPrisma.prisma ??= prisma;
}
