"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ExpenseEditDesktopProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  denseEdit: boolean;
  children: ReactNode;
};

export function ExpenseEditDesktop({
  open,
  onOpenChange,
  description,
  denseEdit,
  children,
}: ExpenseEditDesktopProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden overscroll-contain border-border/60 bg-background p-0 sm:max-w-md">
        <div
          className={cn(
            "surface-hero shrink-0 px-4",
            denseEdit ? "pb-2.5 pt-4" : "px-5 pb-4 pt-5",
          )}
        >
          <DialogHeader className="space-y-0 text-start">
            <DialogTitle
              className={cn(
                "font-bold text-on-hero",
                denseEdit ? "text-body" : "text-xl",
              )}
            >
              ویرایش هزینه
            </DialogTitle>
            <DialogDescription
              className={cn(
                "text-on-hero/70",
                denseEdit
                  ? "mt-0.5 text-[11px]"
                  : "mt-1 text-sm text-on-hero/75",
              )}
            >
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div
          className={cn(
            "surface-sheet-canvas min-h-0 flex-1 px-4",
            denseEdit
              ? "flex flex-col overflow-hidden py-2.5"
              : "overflow-y-auto overscroll-contain py-4 pb-8",
          )}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
