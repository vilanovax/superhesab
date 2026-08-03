"use client";

import { cn } from "@/lib/utils";

type ReportExportButtonsProps = {
  spaceId: string;
  /** Query string without leading `?` (e.g. year=1405&month=4). */
  query?: string;
  /**
   * compact — small links beside tabs (default for trip/partner toolbar)
   * row — full-width pair under a panel header (report tabs)
   */
  variant?: "compact" | "row";
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

  if (variant === "row") {
    return (
      <div className={cn("mb-3 flex gap-1.5", className)}>
        <a
          href={`${base}?format=xlsx${qs}`}
          download
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card text-caption font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
        >
          <FileIcon className="size-3.5" />
          Excel
        </a>
        <a
          href={`${base}?format=pdf${qs}`}
          download
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card text-caption font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
        >
          <FileIcon className="size-3.5" />
          PDF
        </a>
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
        className="inline-flex h-8 items-center justify-center rounded-lg px-2 text-[11px] font-semibold tabular-nums text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
      >
        Excel
      </a>
      <span className="h-3 w-px bg-border/70" aria-hidden />
      <a
        href={`${base}?format=pdf${qs}`}
        download
        title="خروجی PDF"
        className="inline-flex h-8 items-center justify-center rounded-lg px-2 text-[11px] font-semibold tabular-nums text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
      >
        PDF
      </a>
    </div>
  );
}
