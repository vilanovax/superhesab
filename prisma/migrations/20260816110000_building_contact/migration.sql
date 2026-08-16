-- CreateEnum
CREATE TYPE "BuildingContactCategory" AS ENUM ('EMERGENCY', 'FACILITIES', 'CONTRACTOR', 'ADMIN', 'OTHER');

-- CreateTable
CREATE TABLE "BuildingContact" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "category" "BuildingContactCategory" NOT NULL DEFAULT 'OTHER',
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "visibleToResidents" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuildingContact_spaceId_idx" ON "BuildingContact"("spaceId");

-- CreateIndex
CREATE INDEX "BuildingContact_spaceId_sortOrder_idx" ON "BuildingContact"("spaceId", "sortOrder");

-- CreateIndex
CREATE INDEX "BuildingContact_spaceId_pinned_idx" ON "BuildingContact"("spaceId", "pinned");

-- CreateIndex
CREATE INDEX "BuildingContact_spaceId_visibleToResidents_idx" ON "BuildingContact"("spaceId", "visibleToResidents");

-- AddForeignKey
ALTER TABLE "BuildingContact" ADD CONSTRAINT "BuildingContact_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
