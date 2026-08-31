-- CreateTable
CREATE TABLE "ChargeBaseOverride" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "fromMonth" INTEGER NOT NULL,
    "toMonth" INTEGER NOT NULL,
    "baseCharge" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargeBaseOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChargeBaseOverride_spaceId_year_idx" ON "ChargeBaseOverride"("spaceId", "year");

-- CreateIndex
CREATE INDEX "ChargeBaseOverride_createdById_idx" ON "ChargeBaseOverride"("createdById");

-- AddForeignKey
ALTER TABLE "ChargeBaseOverride" ADD CONSTRAINT "ChargeBaseOverride_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeBaseOverride" ADD CONSTRAINT "ChargeBaseOverride_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
