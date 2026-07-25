"use client";

import { Button } from "@/components/ui/button";

type ReportExportButtonsProps = {
  spaceId: string;
  /** Query string without leading `?` (e.g. year=1405&month=4). */
  query?: string;
};

export function ReportExportButtons({
  spaceId,
  query = "",
}: ReportExportButtonsProps) {
  const qs = query ? `&${query.replace(/^\?/, "")}` : "";
  const base = `/api/spaces/${spaceId}/export/report`;
  return (
    <div className="mb-3 flex gap-1.5">
      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-9 flex-1 rounded-xl text-caption"
      >
        <a href={`${base}?format=xlsx${qs}`} download>
          Excel
        </a>
      </Button>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-9 flex-1 rounded-xl text-caption"
      >
        <a href={`${base}?format=pdf${qs}`} download>
          PDF
        </a>
      </Button>
    </div>
  );
}
