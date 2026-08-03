-- CreateEnum
CREATE TYPE "ExpenseSplitMode" AS ENUM ('EQUAL', 'EXACT', 'PERCENT');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "splitMode" "ExpenseSplitMode" NOT NULL DEFAULT 'EQUAL';

-- AlterTable
ALTER TABLE "ExpenseSplit" ADD COLUMN     "percent" INTEGER;

-- CreateIndex
CREATE INDEX "Expense_splitMode_idx" ON "Expense"("splitMode");
