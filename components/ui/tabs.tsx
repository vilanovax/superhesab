"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  setValue: (v: string) => void;
  tabId: (tabValue: string) => string;
  panelId: (tabValue: string) => string;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>");
  return ctx;
}

function isRtlElement(el: Element): boolean {
  return getComputedStyle(el).direction === "rtl";
}

export function Tabs({
  defaultValue = "",
  value: controlled,
  onValueChange,
  className,
  children,
}: {
  /** Required for uncontrolled usage; optional when `value` is controlled. */
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const reactId = React.useId();
  const baseId = `tabs${reactId.replace(/:/g, "")}`;
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const value = controlled ?? uncontrolled;
  const setValue = (v: string) => {
    setUncontrolled(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider
      value={{
        value,
        setValue,
        tabId: (tabValue) => `${baseId}-tab-${tabValue}`,
        panelId: (tabValue) => `${baseId}-panel-${tabValue}`,
      }}
    >
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
  "aria-label": ariaLabel = "زبانه‌های دفتر",
}: {
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  const { setValue } = useTabs();

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.getAttribute("role") !== "tab") return;

    const list = e.currentTarget;
    const tabs = Array.from(
      list.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'),
    );
    const index = tabs.indexOf(target);
    if (index < 0 || tabs.length === 0) return;

    const rtl = isRtlElement(list);
    let nextIndex = index;

    switch (e.key) {
      case "ArrowRight":
        nextIndex = rtl ? index - 1 : index + 1;
        break;
      case "ArrowLeft":
        nextIndex = rtl ? index + 1 : index - 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    if (nextIndex < 0) nextIndex = tabs.length - 1;
    if (nextIndex >= tabs.length) nextIndex = 0;

    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    const nextValue = nextTab.dataset.tabsValue;
    if (nextValue) setValue(nextValue);
    nextTab.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className={cn(
        "grid h-10 gap-0.5 rounded-xl border border-border/60 bg-card/70 p-1 shadow-none backdrop-blur-sm",
        className ?? "grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { value: active, setValue, tabId, panelId } = useTabs();
  const selected = active === value;
  return (
    <button
      type="button"
      role="tab"
      id={tabId(value)}
      data-tabs-value={value}
      aria-controls={panelId(value)}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={() => setValue(value)}
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-lg text-body-sm font-semibold transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98]",
        className,
        // Color utilities must come after className — text-body-sm merges with text-* and would wipe them.
        selected
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-transparent text-muted-foreground hover:bg-card/80 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { value: active, tabId, panelId } = useTabs();
  const selected = active === value;

  // Keep the tabpanel node mounted (hidden when inactive) so aria-controls stays valid;
  // defer heavy children until selected — preserves existing lazy/deferred tab loading.
  return (
    <div
      role="tabpanel"
      id={panelId(value)}
      aria-labelledby={tabId(value)}
      hidden={!selected}
      tabIndex={selected ? 0 : undefined}
      className={cn("animate-fade-up mt-3 outline-none", className)}
    >
      {selected ? children : null}
    </div>
  );
}
