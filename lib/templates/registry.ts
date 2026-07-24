/**
 * Template registry — UI/policy packs keyed by Space.type.
 * Core money flows stay in lib/ + app/actions; templates only compose them.
 * Visual deltas live in CSS via html[data-template] / [data-template].
 */

import type { SpaceType } from "@/types";

export type TemplateThemeId = "trip" | "partner" | "personal" | "family";

export type TemplateFeatures = {
  checklist: boolean;
  settlements: boolean;
  invites: boolean;
  /** Income vs expense ledger (PERSONAL / FAMILY). */
  incomeExpense: boolean;
  /** Space-level monthlyBudget settings UI. */
  budget: boolean;
  /** Single-player: max 1 member, 100% self-split, no invite UX. */
  solo: boolean;
  /** Show paid-by + EQUAL/EXACT member split controls. */
  manualSplits: boolean;
  /**
   * Shared household ledger without debt: 100% split to paidBy only;
   * never show balances/settlements (see FAMILY PRD).
   */
  householdLedger: boolean;
  /**
   * Personal lend/borrow module (Debt + DebtPayment) — isolated from Expense.
   * Phase 1: PERSONAL only (see debt-module-prd).
   */
  debts: boolean;
};

export type TemplateDefinition = {
  type: SpaceType;
  label: string;
  /** CSS data-template value — thin brand pack, not a parallel UI. */
  theme: TemplateThemeId;
  defaultInviteRole: "EDITOR" | "VIEWER";
  /** Soft product cap for invites (FAMILY = 8). Null = no hard cap. */
  maxMembers: number | null;
  features: TemplateFeatures;
};

const baseExtras = {
  householdLedger: false as const,
  debts: false as const,
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
      checklist: false,
      settlements: true,
      invites: true,
      incomeExpense: false,
      budget: false,
      solo: false,
      manualSplits: false,
      ...baseExtras,
    },
  },
  PERSONAL: {
    type: "PERSONAL",
    label: "حسابداری شخصی",
    theme: "personal",
    defaultInviteRole: "EDITOR",
    maxMembers: 1,
    features: {
      checklist: false,
      settlements: false,
      invites: false,
      incomeExpense: true,
      budget: true,
      solo: true,
      manualSplits: false,
      householdLedger: false,
      debts: true,
    },
  },
  FAMILY: {
    type: "FAMILY",
    label: "خانواده",
    theme: "family",
    defaultInviteRole: "EDITOR",
    maxMembers: 8,
    features: {
      checklist: false,
      settlements: false,
      invites: true,
      incomeExpense: true,
      budget: true,
      solo: false,
      manualSplits: false,
      householdLedger: true,
      debts: false,
    },
  },
};

export function getTemplate(type: SpaceType): TemplateDefinition {
  return templates[type];
}

/** Attribute value for data-template / html dataset. */
export function getTemplateDataset(type: SpaceType): TemplateThemeId {
  return getTemplate(type).theme;
}
