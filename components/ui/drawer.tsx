"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

const Drawer = ({
  shouldScaleBackground = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-ink/45 backdrop-blur-[3px]", className)}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, onOpenAutoFocus, tabIndex, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      tabIndex={tabIndex ?? -1}
      className={cn(
        // Cap to app column width (max-w-lg) so desktop sheets don't go edge-to-edge.
        "fixed inset-x-0 bottom-0 z-50 mx-auto mt-0 flex h-auto w-full max-w-lg max-h-[92dvh] flex-col rounded-t-2xl border border-border/60 bg-background outline-none",
        "shadow-drawer",
        className,
      )}
      {...props}
      onOpenAutoFocus={(event) => {
        onOpenAutoFocus?.(event);
        if (event.defaultPrevented) return;
        // Vaul leaves autofocus off so opening a sheet does not pop the
        // keyboard. Radix then aria-hides the page while the trigger button
        // still has focus, which Chrome blocks. Move focus to the sheet
        // itself (not the first field) before that hide runs.
        const node = event.currentTarget;
        if (node instanceof HTMLElement) {
          node.focus({ preventScroll: true });
        }
        const active = document.activeElement;
        if (
          active instanceof HTMLElement &&
          (!(node instanceof HTMLElement) || !node.contains(active))
        ) {
          active.blur();
        }
      }}
    >
      <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-primary/30" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

function DrawerHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-1.5 p-4 text-center", className)} {...props} />
  );
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
};
