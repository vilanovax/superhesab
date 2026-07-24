import { PrismaClient } from "@/lib/generated/prisma/client";
import { ExpenseCategory, SpaceType } from "@/lib/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  /** Busts stale PrismaClient after `prisma generate` / schema changes under HMR. */
  prismaSchemaSignature: string | undefined;
};

/**
 * Changes when generated enums or additive fields change —
 * invalidates the cached client in dev (field adds don't touch SpaceType alone).
 */
const SCHEMA_SIGNATURE = [
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
].join("|");

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaSignature !== SCHEMA_SIGNATURE
) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaSignature = SCHEMA_SIGNATURE;
}
