-- Merge PERSONAL → FAMILY (home ledger). Enum PERSONAL kept for backup compat.
UPDATE "Space" SET "type" = 'FAMILY' WHERE "type" = 'PERSONAL';
