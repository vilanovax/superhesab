"use client";

import { Button } from "@/components/ui/button";

type BuildingExportButtonsProps = {
  spaceId: string;
  year: number;
  canExport: boolean;
};

export function BuildingExportButtons({
  spaceId,
  year,
  canExport,
}: BuildingExportButtonsProps) {
  if (!canExport) return null;
  const base = `/api/spaces/${spaceId}/export/building?year=${year}`;
  return (
    <div className="flex gap-1.5">
      <Button asChild variant="outline" size="sm" className="h-9 flex-1 rounded-xl text-caption">
        <a href={`${base}&format=xlsx`} download>
          Excel
        </a>
      </Button>
      <Button asChild variant="outline" size="sm" className="h-9 flex-1 rounded-xl text-caption">
        <a href={`${base}&format=pdf`} download>
          PDF
        </a>
      </Button>
    </div>
  );
}
