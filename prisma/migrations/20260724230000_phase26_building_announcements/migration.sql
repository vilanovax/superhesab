-- Phase 26: building announcement board (manager → residents)
CREATE TABLE "BuildingAnnouncement" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BuildingAnnouncement_spaceId_idx" ON "BuildingAnnouncement"("spaceId");
CREATE INDEX "BuildingAnnouncement_spaceId_archivedAt_idx" ON "BuildingAnnouncement"("spaceId", "archivedAt");
CREATE INDEX "BuildingAnnouncement_spaceId_pinned_idx" ON "BuildingAnnouncement"("spaceId", "pinned");
CREATE INDEX "BuildingAnnouncement_authorId_idx" ON "BuildingAnnouncement"("authorId");
CREATE INDEX "BuildingAnnouncement_createdAt_idx" ON "BuildingAnnouncement"("createdAt");

ALTER TABLE "BuildingAnnouncement" ADD CONSTRAINT "BuildingAnnouncement_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuildingAnnouncement" ADD CONSTRAINT "BuildingAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
