/**
 * Template registry — UI/policy packs keyed by Space.type.
 * Core money flows stay in lib/ + app/actions; templates only compose them.
 */

import type { SpaceType } from "@/types";

export type TemplateDefinition = {
  type: SpaceType;
  label: string;
  defaultInviteRole: "EDITOR" | "VIEWER";
  features: {
    checklist: boolean;
  };
};

export const templates: Record<SpaceType, TemplateDefinition> = {
  TRIP: {
    type: "TRIP",
    label: "سفر و دورهمی",
    defaultInviteRole: "EDITOR",
    features: { checklist: true },
  },
  PARTNER: {
    type: "PARTNER",
    label: "حساب مشترک",
    defaultInviteRole: "EDITOR",
    features: { checklist: false },
  },
};

export function getTemplate(type: SpaceType): TemplateDefinition {
  return templates[type];
}
