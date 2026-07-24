-- Building template: Unit, ChargePlan, ChargePayment (phase 20)
ALTER TYPE "SpaceType" ADD VALUE 'BUILDING';

CREATE TYPE "ChargeStatus" AS ENUM ('DUE', 'PARTIAL', 'PAID', 'WAIVED');

CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" INTEGER,
    "multiplier" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChargePlan" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "baseCharge" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChargePayment" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'PAID',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargePayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Unit_spaceId_idx" ON "Unit"("spaceId");
CREATE INDEX "Unit_spaceId_isActive_idx" ON "Unit"("spaceId", "isActive");

CREATE UNIQUE INDEX "ChargePlan_spaceId_year_key" ON "ChargePlan"("spaceId", "year");
CREATE INDEX "ChargePlan_spaceId_idx" ON "ChargePlan"("spaceId");

CREATE UNIQUE INDEX "ChargePayment_unitId_year_month_key" ON "ChargePayment"("unitId", "year", "month");
CREATE INDEX "ChargePayment_unitId_idx" ON "ChargePayment"("unitId");
CREATE INDEX "ChargePayment_year_month_idx" ON "ChargePayment"("year", "month");
CREATE INDEX "ChargePayment_status_idx" ON "ChargePayment"("status");
CREATE INDEX "ChargePayment_createdById_idx" ON "ChargePayment"("createdById");

ALTER TABLE "Unit" ADD CONSTRAINT "Unit_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChargePlan" ADD CONSTRAINT "ChargePlan_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChargePayment" ADD CONSTRAINT "ChargePayment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChargePayment" ADD CONSTRAINT "ChargePayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
