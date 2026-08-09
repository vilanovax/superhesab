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

/** Desktop-only shell — keeps Radix Dialog out of the mobile chunk. */
export function InviteMembersDesktop({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
}: InviteMembersDesktopProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto overscroll-contain border-border/70 bg-card/95 sm:max-w-md">
        <DialogHeader className="space-y-1 text-start">
          <DialogTitle className="text-pretty text-lg">{title}</DialogTitle>
          <DialogDescription className="text-caption">
            {description}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
