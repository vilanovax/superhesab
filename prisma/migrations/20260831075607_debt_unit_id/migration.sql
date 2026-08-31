-- AlterTable
ALTER TABLE "Debt" ADD COLUMN     "unitId" TEXT;

-- CreateIndex
CREATE INDEX "Debt_unitId_idx" ON "Debt"("unitId");

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
