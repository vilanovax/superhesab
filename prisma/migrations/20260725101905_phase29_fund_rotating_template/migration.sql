-- CreateEnum
CREATE TYPE "FundTurnStatus" AS ENUM ('OPEN', 'ASSIGNED');

-- AlterEnum
ALTER TYPE "SpaceType" ADD VALUE 'FUND';

-- CreateTable
CREATE TABLE "FundPlan" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "shareAmount" INTEGER NOT NULL,
    "periodCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundTurn" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "periodIndex" INTEGER NOT NULL,
    "winnerMemberId" TEXT,
    "status" "FundTurnStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundPayment" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "periodIndex" INTEGER NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FundPlan_spaceId_key" ON "FundPlan"("spaceId");

-- CreateIndex
CREATE INDEX "FundPlan_spaceId_idx" ON "FundPlan"("spaceId");

-- CreateIndex
CREATE INDEX "FundTurn_spaceId_idx" ON "FundTurn"("spaceId");

-- CreateIndex
CREATE INDEX "FundTurn_winnerMemberId_idx" ON "FundTurn"("winnerMemberId");

-- CreateIndex
CREATE INDEX "FundTurn_status_idx" ON "FundTurn"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FundTurn_spaceId_periodIndex_key" ON "FundTurn"("spaceId", "periodIndex");

-- CreateIndex
CREATE INDEX "FundPayment_spaceId_periodIndex_idx" ON "FundPayment"("spaceId", "periodIndex");

-- CreateIndex
CREATE INDEX "FundPayment_memberId_idx" ON "FundPayment"("memberId");

-- CreateIndex
CREATE INDEX "FundPayment_createdById_idx" ON "FundPayment"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "FundPayment_spaceId_periodIndex_memberId_key" ON "FundPayment"("spaceId", "periodIndex", "memberId");

-- AddForeignKey
ALTER TABLE "FundPlan" ADD CONSTRAINT "FundPlan_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundTurn" ADD CONSTRAINT "FundTurn_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundTurn" ADD CONSTRAINT "FundTurn_winnerMemberId_fkey" FOREIGN KEY ("winnerMemberId") REFERENCES "SpaceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundPayment" ADD CONSTRAINT "FundPayment_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundPayment" ADD CONSTRAINT "FundPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "SpaceMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundPayment" ADD CONSTRAINT "FundPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
