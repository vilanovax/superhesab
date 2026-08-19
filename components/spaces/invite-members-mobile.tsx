"use client";

import type { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type InviteMembersMobileProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  title: string;
  description: string;
  compactSheet: boolean;
  children: ReactNode;
};

/** Mobile-only shell — same hero + sheet canvas as expense / debt drawers. */
export function InviteMembersMobile({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  compactSheet,
  children,
}: InviteMembersMobileProps) {
  const showDesc = description.trim().length > 0;
  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent
        className={cn(
          "mt-0! gap-0 overflow-hidden border-border/50 bg-background p-0",
          compactSheet
            ? "h-auto max-h-[min(88dvh,100%)]"
            : "h-auto max-h-[85dvh]",
        )}
      >
        <div
          className={cn(
            "surface-hero relative shrink-0 overflow-hidden px-4 pt-1",
            compactSheet ? "pb-2.5" : "px-5 pb-3.5 pt-2",
          )}
        >
          <DrawerHeader className="relative space-y-0 p-0 text-start">
            <DrawerTitle
              className={cn(
                "font-bold text-on-hero",
                compactSheet ? "text-body" : "text-lg",
              )}
            >
              {title}
            </DrawerTitle>
            {showDesc ? (
              <DrawerDescription className="mt-0.5 text-[11px] text-on-hero/70">
                {description}
              </DrawerDescription>
            ) : (
              <DrawerDescription className="sr-only">{title}</DrawerDescription>
            )}
          </DrawerHeader>
        </div>
        <div
          className={cn(
            "surface-sheet-canvas min-h-0 flex-1 overflow-y-auto overscroll-contain px-4",
            compactSheet
              ? "py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
              : "py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]",
          )}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
