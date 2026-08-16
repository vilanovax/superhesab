import type {
  AnnualChargeCalendarDTO,
  BuildingDashboardDTO,
  BuildingUnitRow,
  ChargePaymentProofDTO,
} from "@/app/actions/building";
import type { DebtDTO } from "@/app/actions/debt";
import type { InternalLoanDTO } from "@/app/actions/internalLoan";
import type { SavingsPotDTO } from "@/app/actions/savingsPot";
import type { InviteMemberRow } from "@/components/spaces/invite-members-button";
import type { FamilyMonthExpenseRow } from "@/components/spaces/family-report-panel";
import type { FundMemberOption } from "@/components/spaces/savings-pot-panel";
import type { BalanceMember } from "@/components/SpaceBalances";
import type { ExpenseListItem } from "@/components/expenses/expense-list";
import type { ExpenseCategory } from "@/lib/categorizer";
import type { SimplifiedSettlement } from "@/lib/debtSimplification";
import type { SpaceCurrency } from "@/lib/format";
import type { CategoryExpenseRow, ReportExpenseLine } from "@/lib/reports";
import type { SpaceTabId } from "@/lib/spaces/space-tab-data";
import type { SpaceRole, SpaceType } from "@/types";

export type SpaceTabsProps = {
  spaceId: string;
  spaceName: string;
  currentUserId: string;
  currentUserRole: SpaceRole;
  expenses: ExpenseListItem[];
  /** True when more ledger rows exist beyond the first page. */
  expensesHasMore?: boolean;
  members: BalanceMember[];
  inviteMembers: InviteMemberRow[];
  balances: Record<string, number>;
  suggestions: SimplifiedSettlement[];
  currency?: SpaceCurrency;
  roundUpToThousand?: boolean;
  spaceType?: SpaceType;
  canMutate?: boolean;
  personalReportData?: CategoryExpenseRow[];
  reportExpenseLines?: ReportExpenseLine[];
  familyMonthExpenses?: FamilyMonthExpenseRow[];
  monthlyBudget?: number | null;
  debts?: DebtDTO[];
  savingsPots?: SavingsPotDTO[];
  internalLoans?: InternalLoanDTO[];
  fundMembers?: FundMemberOption[];
  currentFundMemberId?: string | null;
  categoryBudgets?: Partial<Record<ExpenseCategory, number>>;
  buildingDashboard?: BuildingDashboardDTO | null;
  buildingCalendar?: AnnualChargeCalendarDTO | null;
  buildingUnits?: BuildingUnitRow[];
  chargeProofs?: ChargePaymentProofDTO[];
  isOwner?: boolean;
  reportPeriodLabel?: string;
  reportEmptyTitle?: string;
  reportEmptyHint?: string;
  reportTotalLabel?: string;
  reportPlanYear?: number;
  reportMonth?: number | null;
  initialTab?: string;
  loadedTabs?: SpaceTabId[];
  tabLoadContext?: {
    planYear?: number;
    reportMonth?: number | null;
  };
};
