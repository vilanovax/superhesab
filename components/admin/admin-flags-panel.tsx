"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setFeatureFlagEnabled } from "@/app/actions/admin";
import { formatAdminDateTime } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

export type AdminFlagRow = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  updatedAt: Date | string;
  updatedByName: string | null;
};

export function AdminFlagsPanel({ flags }: { flags: AdminFlagRow[] }) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(flag: AdminFlagRow) {
    setError(null);
    setPendingKey(flag.key);
    startTransition(async () => {
      const result = await setFeatureFlagEnabled({
        key: flag.key,
        enabled: !flag.enabled,
      });
      setPendingKey(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-caption text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {flags.map((flag) => {
          const busy = pending && pendingKey === flag.key;
          return (
            <li
              key={flag.key}
              className="rounded-2xl border border-border/50 bg-card px-3.5 py-3.5 shadow-sm transition-[border-color] duration-150 hover:border-border"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-foreground">
                    {flag.label}
                  </p>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    {flag.description}
                  </p>
                  <p className="mt-1.5 text-micro text-muted-foreground">
                    <span dir="ltr" className="font-mono">
                      {flag.key}
                    </span>
                    {flag.updatedByName ? (
                      <>
                        <span className="mx-1 opacity-40">·</span>
                        {flag.updatedByName}
                        <span className="mx-1 opacity-40">·</span>
                        {formatAdminDateTime(flag.updatedAt)}
                      </>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggle(flag)}
                  role="switch"
                  aria-checked={flag.enabled}
                  aria-label={`${flag.label}: ${flag.enabled ? "روشن — برای خاموش کردن بزنید" : "خاموش — برای روشن کردن بزنید"}`}
                  aria-busy={busy}
                  className={cn(
                    "relative mt-0.5 h-8 w-14 shrink-0 rounded-full transition-colors",
                    flag.enabled ? "bg-primary" : "bg-muted",
                    busy && "opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 size-6 rounded-full bg-card shadow transition-transform",
                      flag.enabled ? "start-7" : "start-1",
                    )}
                  />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
