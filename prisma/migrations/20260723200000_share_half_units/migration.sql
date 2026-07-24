-- Convert whole-unit shares to half-units (1× → 2, 2× → 4)
-- so UI can step by 0.5× while amounts stay integer-only.

UPDATE "SpaceMember" SET "defaultShare" = "defaultShare" * 2;
UPDATE "ExpenseSplit" SET "share" = "share" * 2;

ALTER TABLE "SpaceMember" ALTER COLUMN "defaultShare" SET DEFAULT 2;
ALTER TABLE "ExpenseSplit" ALTER COLUMN "share" SET DEFAULT 2;
