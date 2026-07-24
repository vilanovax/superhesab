"use client";

import { useEffect } from "react";
import type { SpaceType } from "@/types";
import { getTemplateDataset } from "@/lib/templates/registry";

/**
 * Applies html[data-template] so portaled drawers/dialogs inherit
 * Trip/Partner theme tokens. Clears on leave so /app stays product default.
 */
export function SpaceTheme({ type }: { type: SpaceType }) {
  const template = getTemplateDataset(type);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.template = template;
    return () => {
      if (root.dataset.template === template) {
        delete root.dataset.template;
      }
    };
  }, [template]);

  return null;
}
