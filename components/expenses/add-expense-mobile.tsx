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

type AddExpenseMobileProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  title: string;
  description: string;
  compact?: boolean;
  children: ReactNode;
};

/** Mobile FAB sheet — vaul Drawer only (not bundled for desktop). */
export function AddExpenseMobile({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  compact = false,
  children,
}: AddExpenseMobileProps) {
  const showDesc = description.trim().length > 0;
  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="mt-0! h-auto max-h-[85dvh] gap-0 overflow-hidden border-border/50 bg-background p-0">
        <div
          className={cn(
            "flex min-h-0 flex-col",
            compact ? "max-h-[min(88dvh,100%)]" : "max-h-[85dvh]",
          )}
        >
          <div
            className={cn(
              "surface-hero relative shrink-0 overflow-hidden px-4 pt-1",
              compact ? "pb-2.5" : "px-5 pb-3.5 pt-2",
            )}
          >
            <DrawerHeader className="relative space-y-0 p-0 text-start">
              <DrawerTitle
                className={cn(
                  "font-bold text-on-hero",
                  compact ? "text-body" : "text-lg",
                )}
              >
                {title}
              </DrawerTitle>
              {showDesc ? (
                <DrawerDescription className="mt-0.5 text-caption text-on-hero/75">
                  {description}
                </DrawerDescription>
              ) : (
                <DrawerDescription className="sr-only">
                  {title}
                </DrawerDescription>
              )}
            </DrawerHeader>
          </div>
          <div
            className={cn(
              "surface-sheet-canvas flex min-h-0 flex-1 flex-col px-4",
              compact
                ? "overflow-hidden py-3"
                : "min-h-0 max-h-[calc(85dvh-4.5rem)] overflow-y-auto overscroll-contain py-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))]",
            )}
          >
            {children}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}