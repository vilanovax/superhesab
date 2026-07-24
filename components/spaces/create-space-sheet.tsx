"use client";

import { useEffect, useState } from "react";
import type * as React from "react";
import { CreateSpaceForm } from "@/components/spaces/create-space-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import type { SpaceType } from "@/types";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CreateTrigger({
  layout = "inline",
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "variant"> & {
  layout?: "inline" | "fab";
}) {
  const isFab = layout === "fab";
  return (
    <Button
      type="button"
      className={cn(
        isFab
          ? "h-12 w-full gap-2 rounded-2xl text-sm font-semibold shadow-fab"
          : "h-10 shrink-0 gap-1.5 rounded-xl bg-card px-3.5 text-sm font-semibold text-primary shadow-none hover:bg-card/90",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-md",
          isFab ? "size-6 bg-on-hero/15" : "size-5",
        )}
      >
        <PlusIcon className="size-4" />
      </span>
      فضای جدید
    </Button>
  );
}

function SheetBody({
  error,
  initialType,
}: {
  error?: string;
  initialType?: SpaceType;
}) {
  return (
    <>
      <div className="surface-hero shrink-0 px-5 pb-4 pt-2 md:pt-5">
        <div className="space-y-1 text-start">
          <h2 className="text-xl font-bold text-on-hero">فضای جدید</h2>
          <p className="text-sm text-on-hero/75">
            سفر، مشترک، خانواده یا شخصی
          </p>
        </div>
      </div>
      <div className="surface-sheet-canvas overflow-y-auto overscroll-contain px-5 py-5 pb-10">
        <CreateSpaceForm
          key={initialType ?? "default"}
          error={error}
          compact
          initialType={initialType}
        />
      </div>
    </>
  );
}

export function CreateSpaceSheet({
  error,
  layout = "inline",
  open: openProp,
  onOpenChange,
  initialType,
  hideTrigger = false,
}: {
  error?: string;
  layout?: "inline" | "fab";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialType?: SpaceType;
  hideTrigger?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(Boolean(error));
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const isDesktop = useIsDesktop();

  if (isDesktop === null) {
    if (hideTrigger) return null;
    return (
      <CreateTrigger
        layout={layout}
        className="pointer-events-none opacity-0"
        tabIndex={-1}
      />
    );
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {!hideTrigger ? (
          <DialogTrigger asChild>
            <CreateTrigger layout={layout} />
          </DialogTrigger>
        ) : null}
        <DialogContent className="gap-0 overflow-hidden border-border/60 p-0 sm:max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>فضای جدید</DialogTitle>
            <DialogDescription>
              یک دفتر مشترک برای سفر، دورهمی یا دونفره
            </DialogDescription>
          </DialogHeader>
          <SheetBody error={error} initialType={initialType} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} repositionInputs={false}>
      {!hideTrigger ? (
        <DrawerTrigger asChild>
          <CreateTrigger layout={layout} />
        </DrawerTrigger>
      ) : null}
      <DrawerContent className="mt-0! max-h-[92dvh] gap-0 overflow-hidden border-border/50 bg-background p-0">
        <DrawerHeader className="sr-only">
          <DrawerTitle>فضای جدید</DrawerTitle>
          <DrawerDescription>
            یک دفتر مشترک برای سفر، دورهمی یا دونفره
          </DrawerDescription>
        </DrawerHeader>
        <SheetBody error={error} initialType={initialType} />
      </DrawerContent>
    </Drawer>
  );
}
