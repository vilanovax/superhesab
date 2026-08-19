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

type InviteMembersDesktopProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
};

/** Desktop-only shell — same hero + sheet canvas as expense dialogs. */
export function InviteMembersDesktop({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
}: InviteMembersDesktopProps) {
  const showDesc = description.trim().length > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden border-border/60 bg-background p-0 shadow-dialog sm:max-w-md">
        <div className="surface-hero relative shrink-0 overflow-hidden px-5 pb-3.5 pt-2">
          <DialogHeader className="relative space-y-0 text-start">
            <DialogTitle className="text-pretty text-lg font-bold text-on-hero">
              {title}
            </DialogTitle>
            {showDesc ? (
              <DialogDescription className="mt-0.5 text-caption text-on-hero/70">
                {description}
              </DialogDescription>
            ) : (
              <DialogDescription className="sr-only">{title}</DialogDescription>
            )}
          </DialogHeader>
        </div>
        <div className="surface-sheet-canvas min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
