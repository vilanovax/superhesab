"use client";

import { useEffect } from "react";
import {
  applyDocumentAccent,
  applyDocumentTheme,
  useAppSettingsStore,
} from "@/lib/stores/settings-store";

/**
 * Applies persisted theme + accent to <html data-theme data-accent>.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppSettingsStore((s) => s.theme);
  const accent = useAppSettingsStore((s) => s.accent) ?? "teal";

  useEffect(() => {
    applyDocumentTheme(theme);
    applyDocumentAccent(accent);

    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyDocumentTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, accent]);

  return children;
}
