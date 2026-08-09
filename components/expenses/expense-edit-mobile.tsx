"use client";

import type { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type ExpenseEditMobileProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  denseEdit: boolean;
  children: ReactNode;
};

export function ExpenseEditMobile({
  open,
  onOpenChange,
  description,
  denseEdit,
  children,
}: ExpenseEditMobileProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      repositionInputs={false}
    >
      <DrawerContent
        className={cn(
          "mt-0! gap-0 overflow-hidden overscroll-contain border-border/50 bg-background p-0",
          denseEdit ? "h-auto max-h-[min(88dvh,100%)]" : "h-auto max-h-[85dvh]",
        )}
      >
        <div
          className={cn(
            "surface-hero shrink-0 px-4 pt-1",
            denseEdit ? "pb-2.5" : "px-5 pb-4 pt-2",
          )}
        >
          <DrawerHeader className="space-y-0 p-0 text-start">
            <DrawerTitle
              className={cn(
                "font-bold text-on-hero",
                denseEdit ? "text-body-sm" : "text-xl",
              )}
            >
              ویرایش هزینه
            </DrawerTitle>
            <DrawerDescription
              className={cn(
                "text-on-hero/70",
                denseEdit
                  ? "mt-0.5 text-[11px]"
                  : "mt-1 text-sm text-on-hero/75",
              )}
            >
              {description}
            </DrawerDescription>
          </DrawerHeader>
        </div>
        <div
          className={cn(
            "surface-sheet-canvas px-4",
            denseEdit
              ? "flex min-h-0 flex-1 flex-col overflow-hidden py-2.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
              : "min-h-0 max-h-[calc(85dvh-5.5rem)] overflow-y-auto overscroll-contain py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]",
          )}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
