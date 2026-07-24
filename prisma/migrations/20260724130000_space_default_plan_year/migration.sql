-- Prefer Jalali plan year per building space (e.g. 1404 / 1405)
ALTER TABLE "Space" ADD COLUMN IF NOT EXISTS "defaultPlanYear" INTEGER;
