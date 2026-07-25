/** Backup schema v2 — see docs/backup-prd.md */

export const BACKUP_VERSION = 2 as const;
export const BACKUP_APP = "SuperHesab" as const;

export type BackupScope = "account" | "space";

export type BackupPerson = {
  originalUserId: string;
  phone: string;
  name: string | null;
  email: string | null;
  isVirtual: boolean;
};

export type BackupMember = {
  originalMemberId: string;
  originalUserId: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  defaultShare: number;
  user: BackupPerson;
};

export type BackupExpenseSplit = {
  originalUserId: string;
  owedAmount: number;
};

export type BackupExpense = {
  originalId: string;
  title: string;
  totalAmount: number;
  paidByOriginalUserId: string;
  createdByOriginalUserId: string | null;
  transactionType: "EXPENSE" | "INCOME";
  category: string;
  categoryLabel: string | null;
  isCategoryLocked: boolean;
  date: string;
  splits: BackupExpenseSplit[];
};

export type BackupSettlement = {
  fromOriginalUserId: string;
  toOriginalUserId: string;
  amount: number;
  status: "PENDING" | "COMPLETED";
  createdAt: string;
};

export type BackupChecklistItem = {
  title: string;
  isCompleted: boolean;
  createdAt: string;
};

export type BackupDebtPayment = {
  amount: number;
  date: string;
  note: string | null;
  createdByOriginalUserId: string;
};

export type BackupDebt = {
  originalId: string;
  type: "LENT" | "BORROWED";
  counterparty: string;
  initialAmount: number;
  dueDate: string | null;
  status: "ACTIVE" | "SETTLED";
  createdByOriginalUserId: string;
  createdAt: string;
  payments: BackupDebtPayment[];
};

export type BackupCategoryBudget = {
  category: string;
  amount: number;
};

export type BackupRecurringRule = {
  originalId: string;
  title: string;
  amount: number;
  transactionType: "EXPENSE" | "INCOME";
  category: string;
  dayOfMonth: number;
  active: boolean;
  createdByOriginalUserId: string;
  /** monthKey → original expense id (for occurrence rebuild) */
  occurrences: { monthKey: string; originalExpenseId: string }[];
};

export type BackupUnit = {
  originalId: string;
  name: string;
  area: number | null;
  multiplier: number;
  isActive: boolean;
  linkedOriginalUserId: string | null;
};

export type BackupChargePlan = {
  year: number;
  baseCharge: number;
};

export type BackupChargePayment = {
  originalUnitId: string;
  year: number;
  month: number;
  amount: number;
  status: "DUE" | "PARTIAL" | "PAID" | "WAIVED";
  date: string;
  note: string | null;
  createdByOriginalUserId: string;
  /** Metadata only — file bytes not restored */
  proofs: {
    mimeType: string;
    byteSize: number;
    note: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED";
    reviewNote: string | null;
  }[];
};

export type BackupBuildingSuggestion = {
  originalUnitId: string;
  authorOriginalUserId: string;
  title: string;
  body: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "REJECTED";
  managerNote: string | null;
  createdAt: string;
};

export type BackupBuildingAnnouncement = {
  authorOriginalUserId: string;
  title: string;
  body: string;
  pinned: boolean;
  archivedAt: string | null;
  createdAt: string;
};

export type BackupSavingsPot = {
  originalId: string;
  title: string;
  targetAmount: number;
  deadline: string | null;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  transactions: {
    originalMemberId: string;
    amount: number;
    type: "DEPOSIT" | "WITHDRAWAL";
    note: string | null;
    date: string;
  }[];
};

export type BackupInternalLoan = {
  fromOriginalMemberId: string;
  toOriginalMemberId: string;
  initialAmount: number;
  dueDate: string | null;
  status: "ACTIVE" | "SETTLED";
  note: string | null;
  payments: { amount: number; date: string; note: string | null }[];
};

export type BackupFundPlan = {
  shareAmount: number;
  periodCount: number;
};

export type BackupFundTurn = {
  periodIndex: number;
  winnerOriginalMemberId: string | null;
  status: "OPEN" | "ASSIGNED";
  note: string | null;
};

export type BackupFundPayment = {
  periodIndex: number;
  originalMemberId: string;
  amount: number;
  date: string;
  note: string | null;
  createdByOriginalUserId: string;
};

export type BackupSpacePayload = {
  originalSpaceId: string;
  name: string;
  type: string;
  currency: string;
  roundUpToThousand: boolean;
  monthlyBudget: number | null;
  defaultPlanYear: number | null;
  archivedAt: string | null;
  members: BackupMember[];
  expenses: BackupExpense[];
  settlements: BackupSettlement[];
  checklist: BackupChecklistItem[];
  debts: BackupDebt[];
  categoryBudgets: BackupCategoryBudget[];
  recurringRules: BackupRecurringRule[];
  units: BackupUnit[];
  chargePlans: BackupChargePlan[];
  chargePayments: BackupChargePayment[];
  buildingSuggestions: BackupBuildingSuggestion[];
  buildingAnnouncements: BackupBuildingAnnouncement[];
  savingsPots: BackupSavingsPot[];
  internalLoans: BackupInternalLoan[];
  fundPlan: BackupFundPlan | null;
  fundTurns: BackupFundTurn[];
  fundPayments: BackupFundPayment[];
};

export type BackupFileV2 = {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  app: typeof BACKUP_APP;
  scope: BackupScope;
  user: {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
  };
  spaces: BackupSpacePayload[];
};

export type RestoreSpaceResult = {
  spaceId: string;
  name: string;
  type: string;
  warnings: string[];
};
