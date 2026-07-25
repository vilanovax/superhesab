-- CreateEnum
CREATE TYPE "SavingsPotStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SavingsTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "InternalLoanStatus" AS ENUM ('ACTIVE', 'SETTLED');

-- CreateTable
CREATE TABLE "SavingsPot" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetAmount" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3),
    "status" "SavingsPotStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsPot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsTransaction" (
    "id" TEXT NOT NULL,
    "potId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "SavingsTransactionType" NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalLoan" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "initialAmount" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "InternalLoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalLoanPayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalLoanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavingsPot_spaceId_idx" ON "SavingsPot"("spaceId");

-- CreateIndex
CREATE INDEX "SavingsPot_spaceId_status_idx" ON "SavingsPot"("spaceId", "status");

-- CreateIndex
CREATE INDEX "SavingsPot_deadline_idx" ON "SavingsPot"("deadline");

-- CreateIndex
CREATE INDEX "SavingsTransaction_potId_idx" ON "SavingsTransaction"("potId");

-- CreateIndex
CREATE INDEX "SavingsTransaction_memberId_idx" ON "SavingsTransaction"("memberId");

-- CreateIndex
CREATE INDEX "SavingsTransaction_date_idx" ON "SavingsTransaction"("date");

-- CreateIndex
CREATE INDEX "SavingsTransaction_potId_type_idx" ON "SavingsTransaction"("potId", "type");

-- CreateIndex
CREATE INDEX "InternalLoan_spaceId_idx" ON "InternalLoan"("spaceId");

-- CreateIndex
CREATE INDEX "InternalLoan_spaceId_status_idx" ON "InternalLoan"("spaceId", "status");

-- CreateIndex
CREATE INDEX "InternalLoan_fromMemberId_idx" ON "InternalLoan"("fromMemberId");

-- CreateIndex
CREATE INDEX "InternalLoan_toMemberId_idx" ON "InternalLoan"("toMemberId");

-- CreateIndex
CREATE INDEX "InternalLoan_dueDate_idx" ON "InternalLoan"("dueDate");

-- CreateIndex
CREATE INDEX "InternalLoanPayment_loanId_idx" ON "InternalLoanPayment"("loanId");

-- CreateIndex
CREATE INDEX "InternalLoanPayment_date_idx" ON "InternalLoanPayment"("date");

-- AddForeignKey
ALTER TABLE "SavingsPot" ADD CONSTRAINT "SavingsPot_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsTransaction" ADD CONSTRAINT "SavingsTransaction_potId_fkey" FOREIGN KEY ("potId") REFERENCES "SavingsPot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsTransaction" ADD CONSTRAINT "SavingsTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "SpaceMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalLoan" ADD CONSTRAINT "InternalLoan_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalLoan" ADD CONSTRAINT "InternalLoan_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "SpaceMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalLoan" ADD CONSTRAINT "InternalLoan_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "SpaceMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalLoanPayment" ADD CONSTRAINT "InternalLoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "InternalLoan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
