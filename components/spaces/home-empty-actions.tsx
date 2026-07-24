"use client";

import { useState } from "react";
import { CreateSpaceSheet } from "@/components/spaces/create-space-sheet";
import { Button } from "@/components/ui/button";

type SpaceKind = "TRIP" | "PARTNER" | "PERSONAL" | "FAMILY";

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
      <div className="flex w-full flex-col gap-2">
        <Button
          type="button"
          className="h-12 w-full rounded-xl text-body-sm font-semibold"
          onClick={() => openWith("TRIP")}
        >
          ساخت سفر
        </Button>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 rounded-xl border-border/70 bg-card text-body-sm font-semibold"
            onClick={() => openWith("PARTNER")}
          >
            حساب مشترک
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 rounded-xl border-border/70 bg-card text-body-sm font-semibold"
            onClick={() => openWith("FAMILY")}
          >
            خانواده
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 rounded-xl border-border/70 bg-card text-body-sm font-semibold"
            onClick={() => openWith("PERSONAL")}
          >
            حساب شخصی
          </Button>
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
