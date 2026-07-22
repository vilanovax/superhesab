-- AlterTable
CREATE TYPE "SpaceCurrency" AS ENUM ('TOMAN', 'RIAL');

ALTER TABLE "Space" ADD COLUMN "currency" "SpaceCurrency" NOT NULL DEFAULT 'TOMAN';
