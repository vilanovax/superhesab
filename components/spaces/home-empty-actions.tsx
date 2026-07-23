"use client";

import { useState } from "react";
import { CreateSpaceSheet } from "@/components/spaces/create-space-sheet";
import { Button } from "@/components/ui/button";

type SpaceKind = "TRIP" | "PARTNER";

/**
 * CTA pair for the home empty state — opens create-space sheet with preset type.
 */
export function HomeEmptyActions({ error }: { error?: string }) {
  const [open, setOpen] = useState(false);
  const [initialType, setInitialType] = useState<SpaceKind>("TRIP");

  function openWith(type: SpaceKind) {
    setInitialType(type);
    setOpen(true);
  }

  return (
    <>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="h-12 flex-1 rounded-xl text-[13px] font-semibold"
          onClick={() => openWith("TRIP")}
        >
          ساخت سفر
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-1 rounded-xl border-border/70 bg-white text-[13px] font-semibold"
          onClick={() => openWith("PARTNER")}
        >
          ساخت حساب مشترک
        </Button>
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
