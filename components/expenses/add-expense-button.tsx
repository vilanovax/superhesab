"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type * as React from "react";
import type { ExpenseMember } from "@/components/ExpenseForm";
import { useIsDesktop } from "@/components/hooks/use-is-desktop";
import { Button } from "@/components/ui/button";
import { useUnsavedCloseGuard } from "@/components/ui/unsaved-close-guard";
import { useUiStore } from "@/lib/stores/ui-store";
import { getTemplate } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";
import type { SpaceCurrency } from "@/lib/format";
import type { ExpenseCategory } from "@/lib/categorizer";
import type { SpaceType } from "@/types";

const ExpenseForm = dynamic(
  () =>
    import("@/components/ExpenseForm").then((m) => m.ExpenseForm),
  {
    loading: () => (
      <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
    ),
  },
);

const AddExpenseDesktop = dynamic(
  () =>
    import("@/components/expenses/add-expense-desktop").then(
      (m) => m.AddExpenseDesktop,
    ),
  { ssr: false },
);

const AddExpenseMobile = dynamic(
  () =>
    import("@/components/expenses/add-expense-mobile").then(
      (m) => m.AddExpenseMobile,
    ),
  { ssr: false },
);

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

function Fab({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn(
        "fixed bottom-[calc(1rem+max(env(safe-area-inset-bottom,0px),var(--vv-bottom,0px)))] left-1/2 z-40 h-12 min-h-12 -translate-x-1/2 gap-1.5 rounded-2xl px-5 text-sm font-semibold shadow-fab",
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
  const denseSheet =
    isBuilding || isTrip || isPartner || features.incomeExpense;
  const description = isBuilding
    ? "کسر از صندوق ساختمان"
    : isTrip || isPartner
      ? ""
      : features.householdLedger
        ? "بدون دنگ بین اعضا"
        : features.incomeExpense
          ? "درآمد یا هزینه — بدون تسهیم"
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

  /** Units/report own their CTAs — don't float expense/collect here. */
  if (isBuilding && (liveTab === "units" || liveTab === "report" || liveTab === "debts")) {
    return null;
  }

  /** Checklist / balances own the focus — hide expense FAB. */
  if (liveTab === "balances") {
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

  const fab = (
    <Fab className={cn(open && "pointer-events-none opacity-0")}>
      <span className="flex size-6 items-center justify-center rounded-md bg-on-hero/15 text-base leading-none text-on-hero">
        +
      </span>
      {fabLabel}
    </Fab>
  );

  // Avoid SSR/hydration mismatch: wait until media query is known
  if (isDesktop === null) {
    return (
      <Fab
        type="button"
        onClick={() => setOpen(true)}
        className="opacity-90"
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
        <AddExpenseDesktop
          open={open}
          onOpenChange={setOpen}
          trigger={fab}
          title={sheetTitle}
          description={description}
          compact={denseSheet}
        >
          {form}
        </AddExpenseDesktop>
        {discardConfirm}
      </>
    );
  }

  return (
    <>
      <AddExpenseMobile
        open={open}
        onOpenChange={setOpen}
        trigger={fab}
        title={sheetTitle}
        description={description}
        compact={denseSheet}
      >
        {form}
      </AddExpenseMobile>
      {discardConfirm}
    </>
  );
}
