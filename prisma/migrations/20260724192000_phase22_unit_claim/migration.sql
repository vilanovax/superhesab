-- Phase 22: unit claim tokens + linked resident
ALTER TABLE "Unit" ADD COLUMN "inviteToken" TEXT;
ALTER TABLE "Unit" ADD COLUMN "linkedUserId" TEXT;
ALTER TABLE "Unit" ADD COLUMN "linkedAt" TIMESTAMP(3);

-- Backfill unique tokens for existing units
UPDATE "Unit"
SET "inviteToken" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "inviteToken" IS NULL;

ALTER TABLE "Unit" ALTER COLUMN "inviteToken" SET NOT NULL;

CREATE UNIQUE INDEX "Unit_inviteToken_key" ON "Unit"("inviteToken");
CREATE INDEX "Unit_linkedUserId_idx" ON "Unit"("linkedUserId");
CREATE INDEX "Unit_inviteToken_idx" ON "Unit"("inviteToken");

-- Partial uniqueness: only one linked user per space (NULLs allowed multiple times in PG unique)
CREATE UNIQUE INDEX "Unit_spaceId_linkedUserId_key" ON "Unit"("spaceId", "linkedUserId");

ALTER TABLE "Unit" ADD CONSTRAINT "Unit_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
