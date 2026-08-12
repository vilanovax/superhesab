-- BUILDING: category → unit participation (transparency snapshot)

CREATE TYPE "BuildingCategoryScopeMode" AS ENUM ('ALL', 'FIXED', 'HYBRID');
CREATE TYPE "BuildingCategoryUnitRule" AS ENUM ('INCLUDE', 'EXCLUDE');

CREATE TABLE "BuildingCategoryScope" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "mode" "BuildingCategoryScopeMode" NOT NULL DEFAULT 'ALL',
    "unitRule" "BuildingCategoryUnitRule" NOT NULL DEFAULT 'EXCLUDE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingCategoryScope_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuildingCategoryScopeUnit" (
    "id" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,

    CONSTRAINT "BuildingCategoryScopeUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpenseUnitParticipation" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,

    CONSTRAINT "ExpenseUnitParticipation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BuildingCategoryScope_spaceId_category_key" ON "BuildingCategoryScope"("spaceId", "category");
CREATE INDEX "BuildingCategoryScope_spaceId_idx" ON "BuildingCategoryScope"("spaceId");
CREATE INDEX "BuildingCategoryScope_category_idx" ON "BuildingCategoryScope"("category");

CREATE UNIQUE INDEX "BuildingCategoryScopeUnit_scopeId_unitId_key" ON "BuildingCategoryScopeUnit"("scopeId", "unitId");
CREATE INDEX "BuildingCategoryScopeUnit_unitId_idx" ON "BuildingCategoryScopeUnit"("unitId");
CREATE INDEX "BuildingCategoryScopeUnit_scopeId_idx" ON "BuildingCategoryScopeUnit"("scopeId");

CREATE UNIQUE INDEX "ExpenseUnitParticipation_expenseId_unitId_key" ON "ExpenseUnitParticipation"("expenseId", "unitId");
CREATE INDEX "ExpenseUnitParticipation_unitId_idx" ON "ExpenseUnitParticipation"("unitId");
CREATE INDEX "ExpenseUnitParticipation_expenseId_idx" ON "ExpenseUnitParticipation"("expenseId");

ALTER TABLE "BuildingCategoryScope" ADD CONSTRAINT "BuildingCategoryScope_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuildingCategoryScopeUnit" ADD CONSTRAINT "BuildingCategoryScopeUnit_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "BuildingCategoryScope"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuildingCategoryScopeUnit" ADD CONSTRAINT "BuildingCategoryScopeUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseUnitParticipation" ADD CONSTRAINT "ExpenseUnitParticipation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseUnitParticipation" ADD CONSTRAINT "ExpenseUnitParticipation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
