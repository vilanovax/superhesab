-- Phase 27: in-app building notifications (announcement + charge payment)
CREATE TYPE "BuildingNotificationKind" AS ENUM ('ANNOUNCEMENT', 'CHARGE_PAYMENT');

CREATE TABLE "BuildingNotification" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "BuildingNotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hrefTab" TEXT,
    "refId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildingNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BuildingNotification_userId_readAt_idx" ON "BuildingNotification"("userId", "readAt");
CREATE INDEX "BuildingNotification_spaceId_userId_idx" ON "BuildingNotification"("spaceId", "userId");
CREATE INDEX "BuildingNotification_spaceId_kind_idx" ON "BuildingNotification"("spaceId", "kind");
CREATE INDEX "BuildingNotification_createdAt_idx" ON "BuildingNotification"("createdAt");

ALTER TABLE "BuildingNotification" ADD CONSTRAINT "BuildingNotification_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuildingNotification" ADD CONSTRAINT "BuildingNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
