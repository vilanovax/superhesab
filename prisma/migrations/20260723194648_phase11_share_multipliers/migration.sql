-- AlterTable
ALTER TABLE "ExpenseSplit" ADD COLUMN     "share" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "SpaceMember" ADD COLUMN     "defaultShare" INTEGER NOT NULL DEFAULT 1;
