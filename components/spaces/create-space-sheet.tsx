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
      aria-label="دفتر جدید"
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
          دفتر جدید
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
    <div className="flex max-h-[min(88dvh,640px)] flex-col">
      <div className="surface-hero relative shrink-0 overflow-hidden px-5 pb-4 pt-2 md:pt-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-10 -top-12 size-36 rounded-full bg-on-hero/12 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -start-8 bottom-[-1rem] size-28 rounded-full bg-highlight/20 blur-2xl"
        />
        <div className="relative space-y-1 text-start">
          <p className="text-micro font-medium tracking-[0.14em] text-on-hero/45">
            SUPERHESAB
          </p>
          <h2 className="text-xl font-bold tracking-tight text-on-hero">
            دفتر جدید
          </h2>
          <p className="max-w-[16rem] text-caption leading-relaxed text-on-hero/72">
            نام بگذار، قالب را انتخاب کن، بساز.
          </p>
        </div>
      </div>
      <div className="surface-sheet-canvas flex min-h-0 flex-1 flex-col px-5 pt-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
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
            <DialogTitle>دفتر جدید</DialogTitle>
            <DialogDescription>
              یک دفتر برای خانه، سفر، مشترک یا ساختمان
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
      <DrawerContent className="mt-0! max-h-[min(88dvh,640px)] gap-0 overflow-hidden border-border/50 bg-background p-0">
        <DrawerHeader className="sr-only">
          <DrawerTitle>دفتر جدید</DrawerTitle>
          <DrawerDescription>
            انتخاب قالب و ساخت دفتر حساب‌وکتاب
          </DrawerDescription>
        </DrawerHeader>
        <SheetBody error={error} initialType={initialType} />
      </DrawerContent>
    </Drawer>
  );
}
