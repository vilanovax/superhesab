-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('USER_DISABLE', 'USER_ENABLE', 'USER_RENAME', 'USER_ROLE_GRANT', 'USER_ROLE_REVOKE', 'BACKUP_EXPORT_PLATFORM', 'BACKUP_EXPORT_USER', 'BACKUP_EXPORT_SPACES', 'BACKUP_DRY_RUN', 'BACKUP_RESTORE');

-- CreateTable
CREATE TABLE "AdminAuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AdminAuditAction" NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditEvent_actorId_idx" ON "AdminAuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AdminAuditEvent_action_idx" ON "AdminAuditEvent"("action");

-- CreateIndex
CREATE INDEX "AdminAuditEvent_createdAt_idx" ON "AdminAuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditEvent_targetType_targetId_idx" ON "AdminAuditEvent"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "AdminAuditEvent" ADD CONSTRAINT "AdminAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
