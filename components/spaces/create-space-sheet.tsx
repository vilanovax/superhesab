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
      size={isFab ? "icon" : "default"}
      aria-label="فضای جدید"
      className={cn(
        isFab
          ? [
              "size-14 min-h-14 rounded-full shadow-fab",
              "bg-primary text-primary-foreground",
              "transition-transform duration-150 ease-out hover:scale-105 active:scale-95",
              "ring-4 ring-background/80",
            ]
          : "h-10 min-h-10 shrink-0 gap-1.5 rounded-xl bg-card px-3.5 text-sm font-semibold text-primary shadow-none hover:bg-card/90",
        className,
      )}
      {...props}
    >
      {isFab ? (
        <PlusIcon className="size-6" />
      ) : (
        <>
          <span className="flex size-5 items-center justify-center">
            <PlusIcon className="size-4" />
          </span>
          فضای جدید
        </>
      )}
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
    <div className="flex max-h-[min(82dvh,560px)] flex-col">
      <div className="surface-hero relative shrink-0 overflow-hidden px-5 pb-3.5 pt-1.5 md:pt-3">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-8 -top-10 size-32 rounded-full bg-on-hero/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -start-10 bottom-0 size-24 rounded-full bg-on-hero/5 blur-xl"
        />
        <div className="relative space-y-0.5 text-start">
          <h2 className="text-lg font-bold tracking-tight text-on-hero">
            فضای جدید
          </h2>
          <p className="text-caption text-on-hero/70">
            نام بگذار، قالب را بزن، بساز
          </p>
        </div>
      </div>
      <div className="surface-sheet-canvas min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3.5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <CreateSpaceForm
          key={initialType ?? "default"}
          error={error}
          compact
          initialType={initialType}
        />
      </div>
    </div>
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
      <DrawerContent className="mt-0! max-h-[min(82dvh,560px)] gap-0 overflow-hidden border-border/50 bg-background p-0">
        <DrawerHeader className="sr-only">
          <DrawerTitle>فضای جدید</DrawerTitle>
          <DrawerDescription>
            انتخاب قالب و ساخت فضای حساب‌وکتاب
          </DrawerDescription>
        </DrawerHeader>
        <SheetBody error={error} initialType={initialType} />
      </DrawerContent>
    </Drawer>
  );
}
