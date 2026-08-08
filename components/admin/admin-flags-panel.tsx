"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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

function groupFor(key: string): string {
  if (key.startsWith("space_type_")) return "قالب‌ها";
  if (key.includes("backup") || key.includes("proof") || key.includes("storage"))
    return "زیرساخت";
  return "عمومی";
}

export function AdminFlagsPanel({ flags }: { flags: AdminFlagRow[] }) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = useMemo(() => {
    const map = new Map<string, AdminFlagRow[]>();
    for (const flag of flags) {
      const g = groupFor(flag.key);
      const list = map.get(g) ?? [];
      list.push(flag);
      map.set(g, list);
    }
    return Array.from(map.entries());
  }, [flags]);

  const onCount = flags.filter((f) => f.enabled).length;

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
      <p className="px-0.5 text-[11px] tabular-nums text-muted-foreground">
        {new Intl.NumberFormat("fa-IR").format(onCount)} /{" "}
        {new Intl.NumberFormat("fa-IR").format(flags.length)} روشن
      </p>

      {error ? (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}

      {groups.map(([group, rows]) => (
        <section key={group} className="space-y-1.5">
          <h2 className="px-0.5 text-[11px] font-bold text-muted-foreground">
            {group}
          </h2>
          <ul className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
            {rows.map((flag, i) => {
              const busy = pending && pendingKey === flag.key;
              return (
                <li
                  key={flag.key}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5",
                    i > 0 && "border-t border-border/40",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-caption font-semibold text-foreground">
                      {flag.label}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {flag.description}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground/80">
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
                      "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                      flag.enabled ? "bg-primary" : "bg-muted",
                      busy && "opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 size-6 rounded-full bg-card shadow transition-transform",
                        flag.enabled ? "start-5" : "start-0.5",
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
