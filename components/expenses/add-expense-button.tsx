"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type * as React from "react";
import type { ExpenseMember } from "@/components/ExpenseForm";
import { Button } from "@/components/ui/button";

const ExpenseForm = dynamic(
  () =>
    import("@/components/ExpenseForm").then((m) => m.ExpenseForm),
  {
    loading: () => (
      <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
    ),
  },
);
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
  /** Active space tab — charges FAB opens collection, not expense form. */
  activeTab?: string;
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
  /** Building / trip — form owns sticky footer; shell does not scroll. */
  compact?: boolean;
}) {
  const showDesc = description.trim().length > 0;
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        variant === "drawer"
          ? compact
            ? "max-h-[min(88dvh,100%)]"
            : "max-h-[85dvh]"
          : "max-h-[inherit] flex-1",
      )}
    >
      <div
        className={cn(
          "surface-hero relative shrink-0 overflow-hidden px-4 pt-1",
          compact ? "pb-2.5" : "px-5 pb-3.5 pt-2",
        )}
      >
        {variant === "drawer" ? (
          <DrawerHeader className="relative space-y-0 p-0 text-start">
            <DrawerTitle
              className={cn(
                "font-bold text-on-hero",
                compact ? "text-body-sm" : "text-lg",
              )}
            >
              {title}
            </DrawerTitle>
            {showDesc ? (
              <DrawerDescription className="mt-0.5 text-[11px] text-on-hero/70">
                {description}
              </DrawerDescription>
            ) : (
              <DrawerDescription className="sr-only">{title}</DrawerDescription>
            )}
          </DrawerHeader>
        ) : (
          <DialogHeader className="relative space-y-0 text-start">
            <DialogTitle
              className={cn(
                "font-bold text-on-hero",
                compact ? "text-body" : "text-lg",
              )}
            >
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
        )}
      </div>

      <div
        className={cn(
          "surface-sheet-canvas flex min-h-0 flex-1 flex-col px-4",
          compact
            ? "overflow-hidden py-2.5"
            : "min-h-0 overflow-y-auto overscroll-contain py-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))]",
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
  activeTab,
}: AddExpenseButtonProps) {
  const expenseFormOpen = useUiStore((s) => s.expenseFormOpen);
  const setExpenseFormOpen = useUiStore((s) => s.setExpenseFormOpen);
  const draftTransactionType = useUiStore((s) => s.draftTransactionType);
  const [localOpen, setLocalOpen] = useState(false);
  const [formBlocked, setFormBlocked] = useState(false);
  const isDesktop = useIsDesktop();
  const { requestOpenChange, discardConfirm } =
    useUnsavedCloseGuard(formBlocked);
  const features = getTemplate(spaceType).features;
  const isBuilding = features.buildingCharges;
  /** Client tab may diverge from RSC `activeTab` after in-app tab switches. */
  const [liveTab, setLiveTab] = useState(activeTab ?? "");
  const [chargesCalendarView, setChargesCalendarView] = useState(false);

  useEffect(() => {
    setLiveTab(activeTab ?? "");
  }, [activeTab]);

  useEffect(() => {
    const fromUrl = () =>
      new URL(window.location.href).searchParams.get("tab") ?? "";
    setLiveTab((prev) => fromUrl() || prev || activeTab || "");
    const onTab = (e: Event) => {
      const tab = (e as CustomEvent<{ tab?: string }>).detail?.tab;
      if (tab) setLiveTab(tab);
      else setLiveTab(fromUrl() || activeTab || "");
    };
    window.addEventListener("superhesab:space-tab", onTab);
    window.addEventListener("popstate", onTab);
    return () => {
      window.removeEventListener("superhesab:space-tab", onTab);
      window.removeEventListener("popstate", onTab);
    };
  }, [activeTab]);

  useEffect(() => {
    if (!(isBuilding && liveTab === "charges")) {
      setChargesCalendarView(false);
      return;
    }
    const fromUrl = () => {
      const v = new URL(window.location.href).searchParams.get("cview");
      return v === "cal" || v === "calendar" || v === "year" || v === "grid";
    };
    setChargesCalendarView(fromUrl());
    const onView = (e: Event) => {
      const view = (e as CustomEvent<{ view?: string }>).detail?.view;
      if (view === "cal-month" || view === "cal-year" || view === "calendar") {
        setChargesCalendarView(true);
        return;
      }
      if (view === "month") {
        setChargesCalendarView(false);
        return;
      }
      setChargesCalendarView(fromUrl());
    };
    window.addEventListener("superhesab:charges-view", onView);
    window.addEventListener("popstate", onView);
    return () => {
      window.removeEventListener("superhesab:charges-view", onView);
      window.removeEventListener("popstate", onView);
    };
  }, [isBuilding, liveTab]);
  /** FAB only on وصول ماهانه — calendar/year register from cells. */
  const chargesCollectFab =
    isBuilding && liveTab === "charges" && !chargesCalendarView;
  const isTrip = spaceType === "TRIP";
  const isPartner = spaceType === "PARTNER";
  const denseSheet = isBuilding || isTrip || isPartner;
  const description = isBuilding
    ? "کسر از صندوق ساختمان"
    : isTrip || isPartner
      ? ""
      : features.householdLedger
        ? "درآمد یا هزینه خانواده — بدون دنگ‌ودونگ"
        : features.incomeExpense
          ? "درآمد یا هزینه — سریع و بدون تسهیم"
          : "عنوان، مبلغ و سهم‌ها";
  const sheetTitle = isBuilding
    ? "ثبت هزینه مشاع"
    : isTrip || isPartner
      ? "ثبت هزینه"
      : features.incomeExpense
        ? "ثبت تراکنش"
        : "ثبت هزینه جدید";
  const fabLabel = chargesCollectFab
    ? "ثبت وصول"
    : isBuilding
      ? "ثبت هزینه"
      : features.incomeExpense
        ? "ثبت تراکنش"
        : "ثبت هزینه";

  const open = expenseFormOpen || localOpen;

  function applyOpen(next: boolean) {
    setLocalOpen(next);
    setExpenseFormOpen(next);
    if (!next) setFormBlocked(false);
  }

  function setOpen(next: boolean) {
    requestOpenChange(next, applyOpen);
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
      onDirtyChange={setFormBlocked}
      onSuccess={() => applyOpen(false)}
    />
  );

  // Avoid SSR/hydration mismatch: wait until media query is known
  if (isDesktop === null) {
    return <Fab className="pointer-events-none opacity-0" tabIndex={-1} />;
  }

  /** Units/report own their CTAs — don't float expense/collect here. */
  if (isBuilding && (liveTab === "units" || liveTab === "report")) {
    return null;
  }

  /** Checklist / balances own the focus — hide expense FAB. */
  if (liveTab === "checklist" || liveTab === "balances") {
    return null;
  }

  if (chargesCollectFab) {
    return (
      <Fab
        type="button"
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent("superhesab:charges-collect"),
          );
        }}
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-on-hero/15 text-base leading-none text-on-hero">
          +
        </span>
        {fabLabel}
      </Fab>
    );
  }

  if (isDesktop) {
    return (
      <>
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
              compact={denseSheet}
            >
              {form}
            </ExpenseSheetBody>
          </DialogContent>
        </Dialog>
        {discardConfirm}
      </>
    );
  }

  return (
    <>
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
            compact={denseSheet}
          >
            {form}
          </ExpenseSheetBody>
        </DrawerContent>
      </Drawer>
      {discardConfirm}
    </>
  );
}
