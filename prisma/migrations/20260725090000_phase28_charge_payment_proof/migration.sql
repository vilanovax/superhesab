-- Phase 28: charge payment proofs + PAYMENT_PROOF notification kind
CREATE TYPE "ChargeProofStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TYPE "BuildingNotificationKind" ADD VALUE IF NOT EXISTS 'PAYMENT_PROOF';

CREATE TABLE "ChargePaymentProof" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "note" TEXT,
    "status" "ChargeProofStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargePaymentProof_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChargePaymentProof_paymentId_idx" ON "ChargePaymentProof"("paymentId");
CREATE INDEX "ChargePaymentProof_uploadedById_idx" ON "ChargePaymentProof"("uploadedById");
CREATE INDEX "ChargePaymentProof_status_idx" ON "ChargePaymentProof"("status");
CREATE INDEX "ChargePaymentProof_createdAt_idx" ON "ChargePaymentProof"("createdAt");

ALTER TABLE "ChargePaymentProof" ADD CONSTRAINT "ChargePaymentProof_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "ChargePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChargePaymentProof" ADD CONSTRAINT "ChargePaymentProof_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChargePaymentProof" ADD CONSTRAINT "ChargePaymentProof_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
