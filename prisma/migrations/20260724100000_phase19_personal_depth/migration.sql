-- Personal depth: category budgets + recurring rules/occurrences
CREATE TABLE "CategoryBudget" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryBudget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringRule" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "transactionType" "TransactionType" NOT NULL DEFAULT 'EXPENSE',
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "dayOfMonth" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringOccurrence" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringOccurrence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategoryBudget_spaceId_category_key" ON "CategoryBudget"("spaceId", "category");
CREATE INDEX "CategoryBudget_spaceId_idx" ON "CategoryBudget"("spaceId");

CREATE INDEX "RecurringRule_spaceId_idx" ON "RecurringRule"("spaceId");
CREATE INDEX "RecurringRule_spaceId_active_idx" ON "RecurringRule"("spaceId", "active");
CREATE INDEX "RecurringRule_createdById_idx" ON "RecurringRule"("createdById");

CREATE UNIQUE INDEX "RecurringOccurrence_expenseId_key" ON "RecurringOccurrence"("expenseId");
CREATE UNIQUE INDEX "RecurringOccurrence_ruleId_monthKey_key" ON "RecurringOccurrence"("ruleId", "monthKey");
CREATE INDEX "RecurringOccurrence_ruleId_idx" ON "RecurringOccurrence"("ruleId");
CREATE INDEX "RecurringOccurrence_monthKey_idx" ON "RecurringOccurrence"("monthKey");

ALTER TABLE "CategoryBudget" ADD CONSTRAINT "CategoryBudget_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringOccurrence" ADD CONSTRAINT "RecurringOccurrence_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RecurringRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringOccurrence" ADD CONSTRAINT "RecurringOccurrence_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
