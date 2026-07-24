-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExpenseCategory" ADD VALUE 'BUILDING_BILLS';
ALTER TYPE "ExpenseCategory" ADD VALUE 'BUILDING_ELEVATOR';
ALTER TYPE "ExpenseCategory" ADD VALUE 'BUILDING_CLEANING';
ALTER TYPE "ExpenseCategory" ADD VALUE 'BUILDING_MAINTENANCE';
ALTER TYPE "ExpenseCategory" ADD VALUE 'BUILDING_GARDENING';
ALTER TYPE "ExpenseCategory" ADD VALUE 'BUILDING_SALARY';
