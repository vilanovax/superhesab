-- Soft-archive spaces before permanent delete
ALTER TABLE "Space" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Space_archivedAt_idx" ON "Space"("archivedAt");
