-- Phase 2 home category privacy (additive)
CREATE TYPE "CategoryVisibility" AS ENUM ('SHARED', 'PRIVATE');

CREATE TABLE "SpaceCategoryPolicy" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "visibility" "CategoryVisibility" NOT NULL DEFAULT 'PRIVATE',
    "ownerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpaceCategoryPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SpaceCategoryPolicy_spaceId_category_key" ON "SpaceCategoryPolicy"("spaceId", "category");
CREATE INDEX "SpaceCategoryPolicy_spaceId_idx" ON "SpaceCategoryPolicy"("spaceId");
CREATE INDEX "SpaceCategoryPolicy_ownerUserId_idx" ON "SpaceCategoryPolicy"("ownerUserId");

ALTER TABLE "SpaceCategoryPolicy" ADD CONSTRAINT "SpaceCategoryPolicy_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpaceCategoryPolicy" ADD CONSTRAINT "SpaceCategoryPolicy_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
