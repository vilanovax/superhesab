import "server-only";

import { listSpaceDebts } from "@/app/actions/debt";
import {
  getBuildingManagerView,
  listChargeProofsForManager,
} from "@/app/actions/building";
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
import { jalaliYearBounds } from "@/lib/jalali";
import { queryExpenseLedgerPage } from "@/lib/spaces/expense-ledger";
import type { TemplateFeatures } from "@/lib/templates/registry";
import type { SpaceRole } from "@/types";
import {
  EMPTY_DEFERRED_TAB,
  type DeferredTabPayload,
  type SpaceTabId,
} from "@/lib/spaces/space-tab-data";

export type LoadDeferredTabArgs = {
  spaceId: string;
  tab: SpaceTabId;
  role: SpaceRole;
  planYear: number;
  reportRange: { start: Date; end: Date } | null;
  hiddenCategories: ExpenseCategory[];
  features: TemplateFeatures;
  viewerUserId?: string;
  /**
   * When false, skip charge proofs on the charges tab (client loads after paint).
   * Default true for client tab switches.
   */
  includeChargeProofs?: boolean;
  /**
   * When true, the outer space-page body already loaded the expenses ledger —
   * skip the duplicate queryExpenseLedgerPage.
   */
  skipExpenses?: boolean;
  /**
   * When true, the outer loader already ran getBuildingManagerView —
   * only fetch charge proofs (if requested), not the full view again.
   */
  skipBuildingView?: boolean;
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
    includeChargeProofs = true,
    skipExpenses = false,
    skipBuildingView = false,
  } = args;

  const out: DeferredTabPayload = { ...EMPTY_DEFERRED_TAB };
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

  /** Any template with an expenses tab — not only incomeExpense shells. */
  if (tab === "expenses" && !skipExpenses) {
    tasks.push(
      (async () => {
        const bounds = features.buildingCharges
          ? jalaliYearBounds(planYear)
          : null;
        const page = await queryExpenseLedgerPage({
          spaceId,
          hiddenCategories,
          dateFrom: bounds?.start,
          dateTo: bounds?.end,
          viewerUserId: args.viewerUserId,
        });
        out.expenses = page.expenses;
        out.expensesHasMore = page.hasMore;
      })(),
    );
  }

  if (
    (tab === "charges" || tab === "units") &&
    features.buildingCharges
  ) {
    const needProofs =
      tab === "charges" && includeChargeProofs && canManage;

    if (skipBuildingView) {
      if (needProofs) {
        tasks.push(
          (async () => {
            out.chargeProofs = await listChargeProofsForManager(
              spaceId,
              planYear,
            );
          })(),
        );
      }
    } else {
      tasks.push(
        (async () => {
          const [view, proofs] = await Promise.all([
            getBuildingManagerView(spaceId, planYear),
            needProofs
              ? listChargeProofsForManager(spaceId, planYear)
              : Promise.resolve(null),
          ]);
          if (!view) return;
          out.buildingDashboard = view.dashboard;
          out.buildingUnits = view.units;
          if (tab === "charges") {
            out.buildingCalendar = view.calendar;
            if (proofs) out.chargeProofs = proofs;
          }
        })(),
      );
    }
  }

  await Promise.all(tasks);
  return out;
}
