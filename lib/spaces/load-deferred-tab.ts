import "server-only";

import { listSpaceDebts } from "@/app/actions/debt";
import { listChargeProofsForManager } from "@/app/actions/building";
import { getChecklist } from "@/app/actions/checklist";
import { listInternalLoans } from "@/app/actions/internalLoan";
import { listSavingsPots } from "@/app/actions/savingsPot";
import type { ExpenseCategory } from "@/lib/categorizer";
import { prisma } from "@/lib/db/prisma";
import {
  getExpensesByCategory,
  getExpensesByCategoryInRange,
  getExpenseLinesForMonth,
  getExpenseLinesInRange,
} from "@/lib/reports-server";
import type { TemplateFeatures } from "@/lib/templates/registry";
import type { SpaceRole } from "@/types";
import type { DeferredTabPayload, SpaceTabId } from "@/lib/spaces/space-tab-data";

export type LoadDeferredTabArgs = {
  spaceId: string;
  tab: SpaceTabId;
  role: SpaceRole;
  planYear: number;
  reportRange: { start: Date; end: Date } | null;
  hiddenCategories: ExpenseCategory[];
  features: TemplateFeatures;
};

/** Heavy per-tab reads — used by the space page and by loadSpaceTabData. */
export async function loadDeferredTabData(
  args: LoadDeferredTabArgs,
): Promise<DeferredTabPayload> {
  const {
    spaceId,
    tab,
    features,
    role,
    planYear,
    reportRange,
    hiddenCategories,
  } = args;

  const out: DeferredTabPayload = {
    personalReportData: [],
    reportExpenseLines: [],
    debts: [],
    savingsPots: [],
    internalLoans: [],
    checklist: [],
    chargeProofs: [],
    categoryBudgets: {},
  };
  const canManage = role === "OWNER" || role === "EDITOR";
  const tasks: Promise<void>[] = [];

  if (tab === "report" && features.incomeExpense) {
    tasks.push(
      (async () => {
        const [byCat, lines, budgets] = await Promise.all([
          reportRange
            ? getExpensesByCategoryInRange(
                spaceId,
                reportRange.start,
                reportRange.end,
                null,
                hiddenCategories,
              )
            : getExpensesByCategory(
                spaceId,
                new Date(),
                null,
                hiddenCategories,
              ),
          reportRange
            ? getExpenseLinesInRange(
                spaceId,
                reportRange.start,
                reportRange.end,
                null,
                hiddenCategories,
              )
            : getExpenseLinesForMonth(
                spaceId,
                new Date(),
                null,
                hiddenCategories,
              ),
          features.categoryBudgets
            ? prisma.categoryBudget.findMany({
                where: { spaceId },
                select: { category: true, amount: true },
              })
            : Promise.resolve([] as { category: string; amount: number }[]),
        ]);
        out.personalReportData = byCat;
        out.reportExpenseLines = lines;
        out.categoryBudgets = Object.fromEntries(
          budgets.map((r) => [r.category as ExpenseCategory, r.amount]),
        );
      })(),
    );
  }

  if (tab === "debts" && features.debts) {
    tasks.push(
      (async () => {
        out.debts = await listSpaceDebts(spaceId);
      })(),
    );
  }

  if (tab === "funds" && (features.savingsPot || features.internalLoans)) {
    tasks.push(
      (async () => {
        const [pots, loans] = await Promise.all([
          features.savingsPot ? listSavingsPots(spaceId) : [],
          features.internalLoans ? listInternalLoans(spaceId) : [],
        ]);
        out.savingsPots = pots;
        out.internalLoans = loans;
      })(),
    );
  }

  if (tab === "checklist" && features.checklist) {
    tasks.push(
      (async () => {
        out.checklist = await getChecklist(spaceId);
      })(),
    );
  }

  if (tab === "charges" && features.buildingCharges && canManage) {
    tasks.push(
      (async () => {
        out.chargeProofs = await listChargeProofsForManager(spaceId, planYear);
      })(),
    );
  }

  await Promise.all(tasks);
  return out;
}
