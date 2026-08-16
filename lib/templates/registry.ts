/**
 * Template registry — UI/policy packs keyed by Space.type.
 * Core money flows stay in lib/ + app/actions; templates only compose them.
 * Visual deltas live in CSS via html[data-template] / [data-template].
 */

import type { SpaceType } from "@/types";

export type TemplateThemeId =
  | "trip"
  | "partner"
  | "personal"
  | "family"
  | "building"
  | "fund";

export type TemplateFeatures = {
  checklist: boolean;
  settlements: boolean;
  invites: boolean;
  /** Income vs expense ledger (خانه / BUILDING common costs). */
  incomeExpense: boolean;
  /** Space-level monthlyBudget settings UI. */
  budget: boolean;
  /** Single-player: max 1 member, 100% self-split, no invite UX. */
  solo: boolean;
  /** Show paid-by + EQUAL/EXACT member split controls. */
  manualSplits: boolean;
  /**
   * Shared household ledger without debt: 100% split to paidBy only;
   * never show balances/settlements (see FAMILY / خانه PRD).
   */
  householdLedger: boolean;
  /**
   * Lend/borrow module (Debt + DebtPayment) — isolated from Expense/Settlement.
   * Enabled on خانه (FAMILY); see debt-module-prd + home-ledger-merge-prd.
   */
  debts: boolean;
  /** Per-category monthly caps. */
  categoryBudgets: boolean;
  /** Monthly recurring rules → Expense on space open. */
  recurring: boolean;
  /**
   * Building charge module (Unit / ChargePlan / ChargePayment).
   * See building-template-prd.
   */
  buildingCharges: boolean;
  /**
   * FAMILY/خانه: shared savings goals (SavingsPot) — isolated from Expense.
   * See family-savings-loan-prd.
   */
  savingsPot?: boolean;
  /**
   * FAMILY/خانه: lend between SpaceMembers (InternalLoan) — isolated from Debt/Settlement.
   * See family-savings-loan-prd.
   */
  internalLoans?: boolean;
  /**
   * FUND: rotating savings / ROSCA (FundPlan / FundTurn / FundPayment).
   * See fund-template-prd.
   */
  fundRotating?: boolean;
  /**
   * خانه: per-category SHARED/PRIVATE (SpaceCategoryPolicy).
   * See home-category-privacy-prd.
   */
  categoryPrivacy?: boolean;
};

export type TemplateDefinition = {
  type: SpaceType;
  label: string;
  /** CSS data-template value — thin brand pack, not a parallel UI. */
  theme: TemplateThemeId;
  defaultInviteRole: "EDITOR" | "VIEWER";
  /** Soft product cap for invites (خانه = 8). Null = no hard cap. */
  maxMembers: number | null;
  features: TemplateFeatures;
};

/**
 * Product merge: PERSONAL is absorbed into FAMILY («خانه»).
 * Enum value kept for backups; runtime prefers FAMILY.
 * See docs/home-ledger-merge-prd.md.
 */
export function canonicalizeSpaceType(type: SpaceType): SpaceType {
  return type === "PERSONAL" ? "FAMILY" : type;
}

const baseExtras = {
  householdLedger: false as const,
  debts: false as const,
  categoryBudgets: false as const,
  recurring: false as const,
  buildingCharges: false as const,
  savingsPot: false as const,
  internalLoans: false as const,
  fundRotating: false as const,
  categoryPrivacy: false as const,
};

/** Shared feature pack for خانه (FAMILY) and legacy PERSONAL. */
const homeFeatures: TemplateFeatures = {
  checklist: true,
  settlements: false,
  invites: true,
  incomeExpense: true,
  budget: true,
  solo: false,
  manualSplits: false,
  householdLedger: true,
  debts: true,
  categoryBudgets: true,
  recurring: true,
  buildingCharges: false,
  savingsPot: true,
  internalLoans: true,
  fundRotating: false,
  categoryPrivacy: true,
};

export const templates: Record<SpaceType, TemplateDefinition> = {
  TRIP: {
    type: "TRIP",
    label: "سفر و دورهمی",
    theme: "trip",
    defaultInviteRole: "EDITOR",
    maxMembers: null,
    features: {
      checklist: true,
      settlements: true,
      invites: true,
      incomeExpense: false,
      budget: false,
      solo: false,
      manualSplits: true,
      ...baseExtras,
    },
  },
  PARTNER: {
    type: "PARTNER",
    label: "حساب مشترک",
    theme: "partner",
    defaultInviteRole: "EDITOR",
    maxMembers: 2,
    features: {
      checklist: true,
      settlements: true,
      invites: true,
      incomeExpense: false,
      budget: false,
      solo: false,
      manualSplits: false,
      ...baseExtras,
    },
  },
  /**
   * @deprecated Merged into FAMILY (خانه). Remains for Record completeness /
   * old payloads; getTemplate remaps via canonicalizeSpaceType.
   */
  PERSONAL: {
    type: "PERSONAL",
    label: "خانه",
    theme: "family",
    defaultInviteRole: "EDITOR",
    maxMembers: 8,
    features: homeFeatures,
  },
  FAMILY: {
    type: "FAMILY",
    label: "خانه",
    theme: "family",
    defaultInviteRole: "EDITOR",
    maxMembers: 8,
    features: homeFeatures,
  },
  BUILDING: {
    type: "BUILDING",
    label: "ساختمان",
    theme: "building",
    defaultInviteRole: "EDITOR",
    maxMembers: null,
    features: {
      checklist: true,
      settlements: false,
      invites: true,
      incomeExpense: true,
      budget: true,
      solo: false,
      manualSplits: false,
      householdLedger: false,
      debts: false,
      categoryBudgets: false,
      recurring: false,
      buildingCharges: true,
      savingsPot: false,
      internalLoans: false,
      fundRotating: false,
    },
  },
  FUND: {
    type: "FUND",
    label: "صندوق نوبتی",
    theme: "fund",
    defaultInviteRole: "EDITOR",
    maxMembers: 40,
    features: {
      checklist: true,
      settlements: false,
      invites: true,
      incomeExpense: false,
      budget: false,
      solo: false,
      manualSplits: false,
      householdLedger: false,
      debts: false,
      categoryBudgets: false,
      recurring: false,
      buildingCharges: false,
      savingsPot: false,
      internalLoans: false,
      fundRotating: true,
    },
  },
};

export function getTemplate(type: SpaceType): TemplateDefinition {
  return templates[canonicalizeSpaceType(type)];
}

/** Attribute value for data-template / html dataset. */
export function getTemplateDataset(type: SpaceType): TemplateThemeId {
  return getTemplate(type).theme;
}
