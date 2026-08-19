"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AddExpenseDesktopProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  title: string;
  description: string;
  compact?: boolean;
  children: ReactNode;
};

/** Desktop FAB sheet — Radix Dialog only (not bundled for mobile). */
export function AddExpenseDesktop({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  compact = false,
  children,
}: AddExpenseDesktopProps) {
  const showDesc = description.trim().length > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden border-border/60 bg-background p-0 shadow-dialog sm:max-w-md">
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            "max-h-[inherit]",
          )}
        >
          <div
            className={cn(
              "surface-hero relative shrink-0 overflow-hidden px-4 pt-1",
              compact ? "pb-2.5" : "px-5 pb-3.5 pt-2",
            )}
          >
            <DialogHeader className="relative space-y-0 text-start">
              <DialogTitle
                className={cn(
                  "font-bold text-on-hero",
                  compact ? "text-body" : "text-lg",
                )}
              >
                {title}
              </DialogTitle>
              {showDesc ? (
                <DialogDescription className="mt-0.5 text-caption text-on-hero/70">
                  {description}
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">
                  {title}
                </DialogDescription>
              )}
            </DialogHeader>
          </div>
          <div
            className={cn(
              "surface-sheet-canvas flex min-h-0 flex-1 flex-col px-4",
              compact
                ? "overflow-hidden py-3"
                : "min-h-0 overflow-y-auto overscroll-contain py-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))]",
            )}
          >
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
