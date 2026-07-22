-- AlterTable: phone-first auth (MVP mock OTP)
DROP INDEX IF EXISTS "User_email_idx";
DROP INDEX IF EXISTS "User_email_key";

ALTER TABLE "User" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;

-- Dev DB has no users yet; safe default if any rows exist
UPDATE "User" SET "phone" = 'legacy-' || "id" WHERE "phone" IS NULL;
ALTER TABLE "User" ALTER COLUMN "phone" SET NOT NULL;

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE INDEX "User_phone_idx" ON "User"("phone");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
