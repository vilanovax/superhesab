-- AlterTable
ALTER TABLE "User" ADD COLUMN "isVirtual" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "User_isVirtual_idx" ON "User"("isVirtual");
