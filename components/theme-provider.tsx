"use client";

import { useEffect } from "react";
import {
  applyDocumentTheme,
  useAppSettingsStore,
} from "@/lib/stores/settings-store";

/**
 * Applies persisted theme to <html data-theme="...">.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppSettingsStore((s) => s.theme);

  useEffect(() => {
    applyDocumentTheme(theme);

    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyDocumentTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return children;
}
