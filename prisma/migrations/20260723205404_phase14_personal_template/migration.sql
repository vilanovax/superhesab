-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('EXPENSE', 'INCOME');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExpenseCategory" ADD VALUE 'SALARY';
ALTER TYPE "ExpenseCategory" ADD VALUE 'TRANSFER';
ALTER TYPE "ExpenseCategory" ADD VALUE 'OTHER_INCOME';

-- AlterEnum
ALTER TYPE "SpaceType" ADD VALUE 'PERSONAL';

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "transactionType" "TransactionType" NOT NULL DEFAULT 'EXPENSE';

-- AlterTable
ALTER TABLE "Space" ADD COLUMN     "monthlyBudget" INTEGER;

-- CreateIndex
CREATE INDEX "Expense_transactionType_idx" ON "Expense"("transactionType");

-- CreateIndex
CREATE INDEX "Expense_spaceId_date_transactionType_idx" ON "Expense"("spaceId", "date", "transactionType");
