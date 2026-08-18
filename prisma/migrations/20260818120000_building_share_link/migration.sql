-- CreateTable
CREATE TABLE "BuildingShareLink" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT,
    "includeExpensesSummary" BOOLEAN NOT NULL DEFAULT true,
    "includeExpensesList" BOOLEAN NOT NULL DEFAULT false,
    "includeChargesSummary" BOOLEAN NOT NULL DEFAULT true,
    "includeChargesUnits" BOOLEAN NOT NULL DEFAULT false,
    "includeAnnouncements" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingShareFollow" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildingShareFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuildingShareLink_token_key" ON "BuildingShareLink"("token");

-- CreateIndex
CREATE INDEX "BuildingShareLink_spaceId_idx" ON "BuildingShareLink"("spaceId");

-- CreateIndex
CREATE INDEX "BuildingShareLink_spaceId_revokedAt_idx" ON "BuildingShareLink"("spaceId", "revokedAt");

-- CreateIndex
CREATE INDEX "BuildingShareLink_token_idx" ON "BuildingShareLink"("token");

-- CreateIndex
CREATE INDEX "BuildingShareLink_createdById_idx" ON "BuildingShareLink"("createdById");

-- CreateIndex
CREATE INDEX "BuildingShareFollow_userId_idx" ON "BuildingShareFollow"("userId");

-- CreateIndex
CREATE INDEX "BuildingShareFollow_linkId_idx" ON "BuildingShareFollow"("linkId");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingShareFollow_linkId_userId_key" ON "BuildingShareFollow"("linkId", "userId");

-- AddForeignKey
ALTER TABLE "BuildingShareLink" ADD CONSTRAINT "BuildingShareLink_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingShareLink" ADD CONSTRAINT "BuildingShareLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingShareFollow" ADD CONSTRAINT "BuildingShareFollow_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "BuildingShareLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingShareFollow" ADD CONSTRAINT "BuildingShareFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
