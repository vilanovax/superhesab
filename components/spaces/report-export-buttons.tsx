"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ReportExportButtonsProps = {
  spaceId: string;
  /** Query string without leading `?` (e.g. year=1405&month=4). */
  query?: string;
  /**
   * compact — small Excel|PDF pair
   * row — full-width pair under a panel header
   * menu — single «خروجی» control with Excel/PDF links
   */
  variant?: "compact" | "row" | "menu";
  className?: string;
};

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

export function ReportExportButtons({
  spaceId,
  query = "",
  variant = "compact",
  className,
}: ReportExportButtonsProps) {
  const qs = query ? `&${query.replace(/^\?/, "")}` : "";
  const base = `/api/spaces/${spaceId}/export/report`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (variant === "row") {
    return (
      <div
        className={cn("mb-3 flex gap-1.5", className)}
        role="group"
        aria-label="خروجی گزارش"
      >
        <a
          href={`${base}?format=xlsx${qs}`}
          download
          aria-label="دانلود خروجی Excel"
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card text-caption font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
        >
          <FileIcon className="size-3.5" />
          Excel
        </a>
        <a
          href={`${base}?format=pdf${qs}`}
          download
          aria-label="دانلود خروجی PDF"
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card text-caption font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
        >
          <FileIcon className="size-3.5" />
          PDF
        </a>
      </div>
    );
  }

  if (variant === "menu") {
    return (
      <div ref={rootRef} className={cn("relative shrink-0", className)}>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-8 items-center gap-1 rounded-xl border border-border/50 bg-card px-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
        >
          <FileIcon className="size-3.5" />
          خروجی
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute end-0 top-[calc(100%+0.35rem)] z-30 min-w-[8.5rem] overflow-hidden rounded-xl border border-border/55 bg-card py-1 shadow-md"
          >
            <a
              role="menuitem"
              href={`${base}?format=xlsx${qs}`}
              download
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-caption font-semibold text-foreground transition-colors hover:bg-muted/60"
            >
              Excel
            </a>
            <a
              role="menuitem"
              href={`${base}?format=pdf${qs}`}
              download
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-caption font-semibold text-foreground transition-colors hover:bg-muted/60"
            >
              PDF
            </a>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-xl border border-border/50 bg-card/80 p-0.5",
        className,
      )}
      role="group"
      aria-label="خروجی گزارش"
    >
      <a
        href={`${base}?format=xlsx${qs}`}
        download
        title="خروجی Excel"
        aria-label="دانلود خروجی Excel"
        className="inline-flex h-8 items-center justify-center rounded-lg px-2 text-[11px] font-semibold tabular-nums text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
      >
        Excel
      </a>
      <span className="h-3 w-px bg-border/70" aria-hidden />
      <a
        href={`${base}?format=pdf${qs}`}
        download
        title="خروجی PDF"
        aria-label="دانلود خروجی PDF"
        className="inline-flex h-8 items-center justify-center rounded-lg px-2 text-[11px] font-semibold tabular-nums text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
      >
        PDF
      </a>
    </div>
  );
}
