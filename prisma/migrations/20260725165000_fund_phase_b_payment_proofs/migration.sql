-- CreateEnum
CREATE TYPE "FundProofStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "FundPaymentProof" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "periodIndex" INTEGER NOT NULL,
    "memberId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "note" TEXT,
    "status" "FundProofStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundPaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FundPaymentProof_spaceId_periodIndex_idx" ON "FundPaymentProof"("spaceId", "periodIndex");

-- CreateIndex
CREATE INDEX "FundPaymentProof_spaceId_status_idx" ON "FundPaymentProof"("spaceId", "status");

-- CreateIndex
CREATE INDEX "FundPaymentProof_memberId_idx" ON "FundPaymentProof"("memberId");

-- CreateIndex
CREATE INDEX "FundPaymentProof_uploadedById_idx" ON "FundPaymentProof"("uploadedById");

-- CreateIndex
CREATE INDEX "FundPaymentProof_createdAt_idx" ON "FundPaymentProof"("createdAt");

-- AddForeignKey
ALTER TABLE "FundPaymentProof" ADD CONSTRAINT "FundPaymentProof_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundPaymentProof" ADD CONSTRAINT "FundPaymentProof_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "SpaceMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundPaymentProof" ADD CONSTRAINT "FundPaymentProof_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundPaymentProof" ADD CONSTRAINT "FundPaymentProof_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
