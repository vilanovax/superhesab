"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SpaceCurrency } from "@/lib/format";

export type AppTheme = "light" | "dark" | "system";

type AppSettingsState = {
  theme: AppTheme;
  preferredCurrency: SpaceCurrency;
  setTheme: (theme: AppTheme) => void;
  setPreferredCurrency: (currency: SpaceCurrency) => void;
};

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      theme: "light",
      preferredCurrency: "TOMAN",
      setTheme: (theme) => set({ theme }),
      setPreferredCurrency: (preferredCurrency) => set({ preferredCurrency }),
    }),
    { name: "superhesab-app-settings" },
  ),
);

export function resolveTheme(theme: AppTheme): "light" | "dark" {
  if (theme === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

export function applyDocumentTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
}
