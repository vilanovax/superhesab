"use client";

import { cn } from "@/lib/utils";

type BuildingExportButtonsProps = {
  spaceId: string;
  year: number;
  canExport: boolean;
  className?: string;
};

/**
 * Compact Excel/PDF for building charge year — sits beside view toggles,
 * not as a full-width row that splits tabs from KPIs.
 */
export function BuildingExportButtons({
  spaceId,
  year,
  canExport,
  className,
}: BuildingExportButtonsProps) {
  if (!canExport) return null;
  const base = `/api/spaces/${spaceId}/export/building?year=${year}`;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-xl border border-border/50 bg-card p-0.5 shadow-sm",
        className,
      )}
      role="group"
      aria-label="خروجی شارژ"
    >
      <a
        href={`${base}&format=xlsx`}
        download
        title="خروجی Excel"
        className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground active:scale-[0.98]"
      >
        Excel
      </a>
      <span className="h-3 w-px bg-border/70" aria-hidden />
      <a
        href={`${base}&format=pdf`}
        download
        title="خروجی PDF"
        className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground active:scale-[0.98]"
      >
        PDF
      </a>
    </div>
  );
}
