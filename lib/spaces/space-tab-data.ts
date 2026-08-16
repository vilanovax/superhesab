import type { ExpenseCategory } from "@/lib/categorizer";
import type { TemplateFeatures } from "@/lib/templates/registry";

export type SpaceTabId =
  | "expenses"
  | "charges"
  | "units"
  | "report"
  | "debts"
  | "funds"
  | "balances";

/** Default tab for a template when `?tab=` is absent / invalid. */
export function resolveDefaultTab(
  features: TemplateFeatures,
  tabParam?: string,
): SpaceTabId {
  const allowed = new Set<string>();
  if (features.fundRotating) {
    /** Fund shell uses expenses as the dashboard surface id. */
    allowed.add("expenses");
  } else if (features.incomeExpense && !features.settlements) {
    allowed.add("expenses");
    allowed.add("report");
    if (features.buildingCharges) {
      allowed.add("charges");
      allowed.add("units");
    }
    if (features.debts) allowed.add("debts");
    if (features.savingsPot || features.internalLoans) allowed.add("funds");
  } else {
    allowed.add("expenses");
    if (features.settlements) allowed.add("balances");
  }

  if (tabParam && allowed.has(tabParam)) {
    return tabParam as SpaceTabId;
  }

  if (features.buildingCharges && !features.settlements) return "charges";
  return "expenses";
}

export type DeferredTabPayload = {
  personalReportData: import("@/lib/reports").CategoryExpenseRow[];
  reportExpenseLines: import("@/lib/reports").ReportExpenseLine[];
  debts: import("@/app/actions/debt").DebtDTO[];
  savingsPots: import("@/app/actions/savingsPot").SavingsPotDTO[];
  internalLoans: import("@/app/actions/internalLoan").InternalLoanDTO[];
  chargeProofs: import("@/app/actions/building").ChargePaymentProofDTO[];
  categoryBudgets: Partial<Record<ExpenseCategory, number>>;
  /** BUILDING tab-aware: first ledger page when expenses tab is fetched. */
  expenses: import("@/components/expenses/expense-list").ExpenseListItem[];
  expensesHasMore: boolean;
  /** BUILDING tab-aware: charge bundle when charges/units tab is fetched. */
  buildingDashboard: import("@/app/actions/building").BuildingDashboardDTO | null;
  buildingCalendar: import("@/app/actions/building").AnnualChargeCalendarDTO | null;
  buildingUnits: import("@/app/actions/building").BuildingUnitRow[];
};

export const EMPTY_DEFERRED_TAB: DeferredTabPayload = {
  personalReportData: [],
  reportExpenseLines: [],
  debts: [],
  savingsPots: [],
  internalLoans: [],
  chargeProofs: [],
  categoryBudgets: {},
  expenses: [],
  expensesHasMore: false,
  buildingDashboard: null,
  buildingCalendar: null,
  buildingUnits: [],
};
