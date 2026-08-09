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
  isFund: boolean;
  children: ReactNode;
};

/** Mobile-only shell — keeps vaul Drawer out of the desktop chunk. */
export function InviteMembersMobile({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  compactSheet,
  isFund,
  children,
}: InviteMembersMobileProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent
        className={cn(
          "overflow-hidden overscroll-contain border-border/60 bg-sheet",
          compactSheet && "max-h-[78dvh]",
        )}
      >
        <DrawerHeader
          className={cn(
            "shrink-0 text-start",
            compactSheet ? "pb-1.5 pt-1" : "pb-2",
            isFund && "space-y-0.5",
          )}
        >
          <DrawerTitle
            className={cn("text-pretty", isFund && "text-body font-bold")}
          >
            {title}
          </DrawerTitle>
          <DrawerDescription
            className={
              isFund
                ? "text-[11px] text-muted-foreground"
                : compactSheet
                  ? "text-caption"
                  : undefined
            }
          >
            {description}
          </DrawerDescription>
        </DrawerHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4",
            compactSheet ? "pb-6" : "pb-8",
          )}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
