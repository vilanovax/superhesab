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
import { useUnsavedCloseGuard } from "@/components/ui/unsaved-close-guard";
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
  layout?: "inline" | "fab" | "compact";
}) {
  const isFab = layout === "fab";
  const isCompact = layout === "compact";
  return (
    <Button
      type="button"
      size={isFab ? "icon" : isCompact ? "sm" : "default"}
      aria-label="دفتر جدید"
      className={cn(
        isFab
          ? [
              "size-14 min-h-14 rounded-full shadow-fab",
              "bg-primary text-primary-foreground",
              "transition-transform duration-150 ease-out hover:scale-105 active:scale-95",
              "ring-4 ring-background/80",
            ]
          : isCompact
            ? [
                "h-10 min-h-10 gap-1 rounded-full border border-primary/20 bg-primary/8 px-3",
                "text-caption font-semibold text-primary shadow-none",
                "hover:bg-primary/14 hover:border-primary/30",
                "cursor-pointer transition-colors duration-150",
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
          <span className="flex size-4 items-center justify-center">
            <PlusIcon className={isCompact ? "size-3.5" : "size-4"} />
          </span>
          {isCompact ? "جدید" : "دفتر جدید"}
        </>
      )}
    </Button>
  );
}

function SheetBody({
  error,
  initialType,
  disabledTypes,
  onDirtyChange,
}: {
  error?: string;
  initialType?: SpaceType;
  disabledTypes?: SpaceType[];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  return (
    // Hug content height — avoid flex-1 stretch that leaves empty gray under the CTA.
    <div className="flex w-full flex-col overflow-hidden">
      <div className="surface-hero relative shrink-0 overflow-hidden px-5 py-2">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-10 -top-12 size-28 rounded-full bg-on-hero/12 blur-3xl"
        />
        <div className="relative text-start">
          <h2 className="text-pretty text-base font-bold tracking-tight text-on-hero md:text-lg">
            دفتر جدید
          </h2>
        </div>
      </div>
      <div className="surface-sheet-canvas flex flex-col px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5">
        <CreateSpaceForm
          key={initialType ?? "default"}
          error={error}
          compact
          initialType={initialType}
          disabledTypes={disabledTypes}
          onDirtyChange={onDirtyChange}
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
  disabledTypes,
}: {
  error?: string;
  layout?: "inline" | "fab" | "compact";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialType?: SpaceType;
  hideTrigger?: boolean;
  disabledTypes?: SpaceType[];
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(Boolean(error));
  const [formDirty, setFormDirty] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const applyOpen = onOpenChange ?? setUncontrolledOpen;
  const { requestOpenChange, discardConfirm } =
    useUnsavedCloseGuard(formDirty);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!open) setFormDirty(false);
  }, [open]);

  useEffect(() => {
    if (!formDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [formDirty]);

  function setOpen(next: boolean) {
    requestOpenChange(next, (value) => {
      applyOpen(value);
      if (!value) setFormDirty(false);
    });
  }

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
      <>
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
            <SheetBody
              error={error}
              initialType={initialType}
              disabledTypes={disabledTypes}
              onDirtyChange={setFormDirty}
            />
          </DialogContent>
        </Dialog>
        {discardConfirm}
      </>
    );
  }

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen} repositionInputs={false}>
        {!hideTrigger ? (
          <DrawerTrigger asChild>
            <CreateTrigger layout={layout} />
          </DrawerTrigger>
        ) : null}
        <DrawerContent className="mt-0! h-auto gap-0 overflow-hidden border-border/50 bg-background p-0">
          <DrawerHeader className="sr-only">
            <DrawerTitle>دفتر جدید</DrawerTitle>
            <DrawerDescription>
              انتخاب قالب و ساخت دفتر حساب‌وکتاب
            </DrawerDescription>
          </DrawerHeader>
          <SheetBody
            error={error}
            initialType={initialType}
            disabledTypes={disabledTypes}
            onDirtyChange={setFormDirty}
          />
        </DrawerContent>
      </Drawer>
      {discardConfirm}
    </>
  );
}
