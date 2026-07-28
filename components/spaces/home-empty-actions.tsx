"use client";

import { useState } from "react";
import { CreateSpaceSheet } from "@/components/spaces/create-space-sheet";
import { cn } from "@/lib/utils";
import type { SpaceType } from "@/types";

const QUICK: { type: SpaceType; label: string; primary?: boolean }[] = [
  { type: "TRIP", label: "سفر", primary: true },
  { type: "PARTNER", label: "مشترک" },
  { type: "FAMILY", label: "خانه" },
  { type: "FUND", label: "صندوق" },
  { type: "BUILDING", label: "ساختمان" },
];

/**
 * Compact template chips for the home empty state — opens create-space sheet.
 */
export function HomeEmptyActions({ error }: { error?: string }) {
  const [open, setOpen] = useState(false);
  const [initialType, setInitialType] = useState<SpaceType>("TRIP");

  function openWith(type: SpaceType) {
    setInitialType(type);
    setOpen(true);
  }

  return (
    <>
      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={() => openWith("TRIP")}
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-body-sm font-semibold text-primary-foreground shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.7)] transition-transform active:scale-[0.98]"
        >
          ساخت سفر
        </button>
        <div className="grid grid-cols-2 gap-2">
          {QUICK.filter((q) => !q.primary).map((q) => (
            <button
              key={q.type}
              type="button"
              onClick={() => openWith(q.type)}
              className={cn(
                "h-11 rounded-2xl border border-border/60 bg-card text-body-sm font-semibold text-foreground transition-[transform,background-color,border-color] active:scale-[0.98] hover:border-primary/30",
                q.type === "FAMILY" && "col-span-2",
              )}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>
      <CreateSpaceSheet
        error={error}
        open={open}
        onOpenChange={setOpen}
        initialType={initialType}
        hideTrigger
      />
    </>
  );
}
