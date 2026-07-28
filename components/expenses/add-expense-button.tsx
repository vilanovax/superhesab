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
import { useUiStore } from "@/lib/stores/ui-store";
import { getTemplate } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";
import type { SpaceCurrency } from "@/lib/format";
import type { ExpenseCategory } from "@/lib/categorizer";
import type { SpaceType } from "@/types";

type AddExpenseButtonProps = {
  spaceId: string;
  currentUserId: string;
  members: ExpenseMember[];
  currency?: SpaceCurrency;
  spaceType?: SpaceType;
  /** خانه: categories hidden from this viewer (others' private). */
  hiddenCategories?: ExpenseCategory[];
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

function Fab({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn(
        "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 h-12 min-h-12 -translate-x-1/2 gap-1.5 rounded-2xl px-5 text-sm font-semibold shadow-fab",
        "transition-transform duration-150 ease-out hover:scale-[1.02] active:scale-[0.97]",
        // Hero ink — always light on brand fill (independent of theme fg tokens).
        "bg-primary text-on-hero hover:bg-primary/90 hover:text-on-hero",
        props.className,
      )}
    >
      {children ?? (
        <>
          <span className="flex size-6 items-center justify-center rounded-md bg-on-hero/15 text-base leading-none text-on-hero">
            +
          </span>
          ثبت هزینه
        </>
      )}
    </Button>
  );
}

function ExpenseSheetBody({
  description,
  children,
  variant,
  title = "ثبت هزینه جدید",
  compact = false,
}: {
  description: string;
  children: React.ReactNode;
  variant: "drawer" | "dialog";
  title?: string;
  /** Content-sized sheet (building shared cost) — no tall empty footer. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        variant === "drawer"
          ? compact
            ? "max-h-[min(85dvh,100%)]"
            : "max-h-[85dvh]"
          : "max-h-[inherit] flex-1",
      )}
    >
      <div
        className={cn(
          "surface-hero relative shrink-0 overflow-hidden px-5 pt-1.5",
          compact ? "pb-2.5" : "pb-3.5 pt-2",
        )}
      >
        {variant === "drawer" ? (
          <DrawerHeader className="relative space-y-0.5 p-0 text-start">
            <DrawerTitle
              className={cn(
                "font-bold text-on-hero",
                compact ? "text-body" : "text-lg",
              )}
            >
              {title}
            </DrawerTitle>
            <DrawerDescription className="text-caption text-on-hero/70">
              {description}
            </DrawerDescription>
          </DrawerHeader>
        ) : (
          <DialogHeader className="relative space-y-0.5 text-start">
            <DialogTitle className="text-lg font-bold text-on-hero">
              {title}
            </DialogTitle>
            <DialogDescription className="text-body-sm text-on-hero/70">
              {description}
            </DialogDescription>
          </DialogHeader>
        )}
      </div>

      <div
        className={cn(
          "surface-sheet-canvas min-h-0 overflow-y-auto overscroll-contain px-4",
          compact
            ? "py-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))]"
            : "min-h-0 py-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))]",
          variant === "drawer" && !compact && "max-h-[calc(85dvh-4.5rem)]",
          variant === "dialog" && "min-h-0 flex-1",
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
  spaceType = "TRIP",
  hiddenCategories,
}: AddExpenseButtonProps) {
  const expenseFormOpen = useUiStore((s) => s.expenseFormOpen);
  const setExpenseFormOpen = useUiStore((s) => s.setExpenseFormOpen);
  const draftTransactionType = useUiStore((s) => s.draftTransactionType);
  const [localOpen, setLocalOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const features = getTemplate(spaceType).features;
  const isBuilding = features.buildingCharges;
  const description = isBuilding
    ? "هزینه مشاع ساختمان — از صندوق مشترک"
    : features.householdLedger
      ? "درآمد یا هزینه خانواده — بدون دنگ‌ودونگ"
      : features.incomeExpense
        ? "درآمد یا هزینه — سریع و بدون تسهیم"
        : spaceType === "PARTNER"
          ? "عنوان و مبلغ — تسهیم مساوی"
          : "عنوان، مبلغ و سهم‌ها";
  const sheetTitle = isBuilding
    ? "ثبت هزینه مشاع"
    : features.incomeExpense
      ? "ثبت تراکنش"
      : "ثبت هزینه جدید";
  const fabLabel = isBuilding
    ? "ثبت هزینه"
    : features.incomeExpense
      ? "ثبت تراکنش"
      : "ثبت هزینه";

  const open = expenseFormOpen || localOpen;
  function setOpen(next: boolean) {
    setLocalOpen(next);
    setExpenseFormOpen(next);
  }

  const form = (
    <ExpenseForm
      key={`${spaceType}-${draftTransactionType}-${open}`}
      spaceId={spaceId}
      currentUserId={currentUserId}
      members={members}
      currency={currency}
      spaceType={spaceType}
      defaultTransactionType={
        isBuilding
          ? "EXPENSE"
          : features.incomeExpense
            ? draftTransactionType
            : "EXPENSE"
      }
      hiddenCategories={hiddenCategories}
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
          <Fab className={cn(open && "pointer-events-none opacity-0")}>
            <span className="flex size-6 items-center justify-center rounded-md bg-on-hero/15 text-base leading-none text-on-hero">
              +
            </span>
            {fabLabel}
          </Fab>
        </DialogTrigger>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden border-border/60 bg-background p-0 shadow-dialog sm:max-w-md">
          <ExpenseSheetBody
            description={description}
            variant="dialog"
            title={sheetTitle}
            compact={isBuilding}
          >
            {form}
          </ExpenseSheetBody>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} repositionInputs={false}>
      <DrawerTrigger asChild>
        <Fab className={cn(open && "pointer-events-none opacity-0")}>
          <span className="flex size-6 items-center justify-center rounded-md bg-on-hero/15 text-base leading-none text-on-hero">
            +
          </span>
          {fabLabel}
        </Fab>
      </DrawerTrigger>
      <DrawerContent className="mt-0! h-auto max-h-[85dvh] gap-0 overflow-hidden border-border/50 bg-background p-0">
        <ExpenseSheetBody
          description={description}
          variant="drawer"
          title={sheetTitle}
          compact={isBuilding}
        >
          {form}
        </ExpenseSheetBody>
      </DrawerContent>
    </Drawer>
  );
}
