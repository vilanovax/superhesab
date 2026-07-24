"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SpaceCurrency } from "@/lib/format";

export type AppTheme = "light" | "dark" | "system";

/** Brand accent packs — ocean is the default brand look. */
export type AppAccent = "ocean" | "teal" | "olive" | "slate";

export const DEFAULT_ACCENT: AppAccent = "ocean";

export const ACCENT_OPTIONS: {
  value: AppAccent;
  label: string;
  hint: string;
  /** Swatch for the picker (light primary) */
  swatch: string;
}[] = [
  { value: "ocean", label: "آبی دریا", hint: "پیش‌فرض", swatch: "#1a5f8a" },
  { value: "teal", label: "فیروزه‌ای", hint: "کلاسیک", swatch: "#0f5c57" },
  { value: "olive", label: "زیتونی", hint: "ملایم", swatch: "#4a5d2e" },
  { value: "slate", label: "خاکستری‌آبی", hint: "رسمی", swatch: "#3d4f66" },
];

type AppSettingsState = {
  theme: AppTheme;
  accent: AppAccent;
  preferredCurrency: SpaceCurrency;
  setTheme: (theme: AppTheme) => void;
  setAccent: (accent: AppAccent) => void;
  setPreferredCurrency: (currency: SpaceCurrency) => void;
};

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      theme: "light",
      accent: DEFAULT_ACCENT,
      preferredCurrency: "TOMAN",
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setPreferredCurrency: (preferredCurrency) => set({ preferredCurrency }),
    }),
    {
      name: "superhesab-app-settings",
      version: 2,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<AppSettingsState>;
        if (version < 2) {
          // Ship ocean as the new product default for installs still on legacy teal.
          if (!state.accent || state.accent === "teal") {
            return { ...state, accent: DEFAULT_ACCENT };
          }
        }
        return state;
      },
    },
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

export function applyDocumentAccent(accent: AppAccent) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.accent = accent;
}
