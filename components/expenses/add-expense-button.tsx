"use client";

import { useEffect, useState } from "react";
import type * as React from "react";
import { ExpenseForm, type ExpenseMember } from "@/components/ExpenseForm";
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
import type { SpaceCurrency } from "@/lib/format";

type AddExpenseButtonProps = {
  spaceId: string;
  currentUserId: string;
  members: ExpenseMember[];
  currency?: SpaceCurrency;
};

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

function Fab(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn(
        "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 h-12 min-h-12 -translate-x-1/2 gap-1.5 rounded-2xl px-5 text-sm font-semibold",
        "bg-primary text-primary-foreground shadow-[0_10px_24px_-10px_rgba(15,92,87,0.55)]",
        "transition-transform duration-150 ease-out hover:scale-[1.02] active:scale-[0.97]",
        props.className,
      )}
    >
      <span className="flex size-6 items-center justify-center rounded-md bg-white/15 text-base leading-none">
        +
      </span>
      ثبت هزینه
    </Button>
  );
}

function ExpenseSheetBody({
  description,
  children,
  variant,
}: {
  description: string;
  children: React.ReactNode;
  variant: "drawer" | "dialog";
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        // Drawer: fill the fixed-height sheet. Dialog: grow within max-h.
        variant === "drawer" ? "h-full" : "max-h-[inherit] flex-1",
      )}
    >
      <div className="surface-hero relative shrink-0 overflow-hidden px-5 pb-4 pt-2">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-e-8 -top-10 size-28 rounded-full bg-white/15 blur-2xl"
        />
        {variant === "drawer" ? (
          <DrawerHeader className="relative space-y-1 p-0 text-start">
            <DrawerTitle className="text-xl font-bold text-white">
              ثبت هزینه جدید
            </DrawerTitle>
            <DrawerDescription className="text-sm text-white/75">
              {description}
            </DrawerDescription>
          </DrawerHeader>
        ) : (
          <DialogHeader className="relative space-y-1 text-start">
            <DialogTitle className="text-xl font-bold text-white">
              ثبت هزینه جدید
            </DialogTitle>
            <DialogDescription className="text-sm text-white/75">
              {description}
            </DialogDescription>
          </DialogHeader>
        )}
      </div>

      {/* Explicit remaining height so Vaul flex collapse can't hide the form */}
      <div
        className={cn(
          "overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,#eef5f4_0%,#f7fafb_100%)] px-4 py-4 pb-8",
          variant === "drawer"
            ? "h-[calc(92dvh-5.5rem)] min-h-[60dvh] shrink-0"
            : "min-h-0 flex-1",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function AddExpenseButton({
  spaceId,
  currentUserId,
  members,
  currency = "TOMAN",
}: AddExpenseButtonProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const description = "مبلغ، پرداخت‌کننده و نحوه تسهیم را مشخص کنید.";

  const form = (
    <ExpenseForm
      spaceId={spaceId}
      currentUserId={currentUserId}
      members={members}
      currency={currency}
      onSuccess={() => setOpen(false)}
    />
  );

  // Avoid SSR/hydration mismatch: wait until media query is known
  if (isDesktop === null) {
    return <Fab className="pointer-events-none opacity-0" tabIndex={-1} />;
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Fab className={cn(open && "pointer-events-none opacity-0")} />
        </DialogTrigger>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden border-border/60 bg-background p-0 shadow-[0_24px_60px_-20px_rgba(15,92,87,0.45)] sm:max-w-md">
          <ExpenseSheetBody description={description} variant="dialog">
            {form}
          </ExpenseSheetBody>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} repositionInputs={false}>
      <DrawerTrigger asChild>
        <Fab className={cn(open && "pointer-events-none opacity-0")} />
      </DrawerTrigger>
      <DrawerContent className="mt-0! h-[92dvh] max-h-[92dvh] gap-0 overflow-hidden border-border/50 bg-background p-0">
        <ExpenseSheetBody description={description} variant="drawer">
          {form}
        </ExpenseSheetBody>
      </DrawerContent>
    </Drawer>
  );
}
