-- Phase 24: resident suggestion box (B2B2C)
CREATE TYPE "SuggestionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'REJECTED');

CREATE TABLE "BuildingSuggestion" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'OPEN',
    "managerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BuildingSuggestion_spaceId_idx" ON "BuildingSuggestion"("spaceId");
CREATE INDEX "BuildingSuggestion_spaceId_status_idx" ON "BuildingSuggestion"("spaceId", "status");
CREATE INDEX "BuildingSuggestion_unitId_idx" ON "BuildingSuggestion"("unitId");
CREATE INDEX "BuildingSuggestion_authorId_idx" ON "BuildingSuggestion"("authorId");
CREATE INDEX "BuildingSuggestion_createdAt_idx" ON "BuildingSuggestion"("createdAt");

ALTER TABLE "BuildingSuggestion" ADD CONSTRAINT "BuildingSuggestion_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuildingSuggestion" ADD CONSTRAINT "BuildingSuggestion_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuildingSuggestion" ADD CONSTRAINT "BuildingSuggestion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
