"use client";

import { useEffect } from "react";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

/**
 * Global lightweight toast host (phase 23 fast-close error/success).
 */
export function AppToast() {
  const toast = useUiStore((s) => s.toast);
  const clearToast = useUiStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => clearToast(), 2400);
    return () => window.clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;

  const isError = toast.tone === "error";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4"
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <p
        className={cn(
          "animate-fade-up rounded-full border px-4 py-2 text-label font-medium shadow-sm",
          isError
            ? "border-destructive/25 bg-destructive-soft text-destructive"
            : "border-success/20 bg-success-soft text-success",
        )}
      >
        {toast.message}
      </p>
    </div>
  );
}
