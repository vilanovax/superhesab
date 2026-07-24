"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SpaceCurrency } from "@/lib/format";

export type AppTheme = "light" | "dark" | "system";

/** Brand accent packs — teal is the default Travel Ledger look. */
export type AppAccent = "teal" | "ocean" | "olive" | "slate";

export const ACCENT_OPTIONS: {
  value: AppAccent;
  label: string;
  hint: string;
  /** Swatch for the picker (light primary) */
  swatch: string;
}[] = [
  { value: "teal", label: "فیروزه‌ای", hint: "پیش‌فرض", swatch: "#0f5c57" },
  { value: "ocean", label: "آبی دریا", hint: "خنک", swatch: "#1a5f8a" },
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
      accent: "teal",
      preferredCurrency: "TOMAN",
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
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

export function applyDocumentAccent(accent: AppAccent) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.accent = accent;
}
