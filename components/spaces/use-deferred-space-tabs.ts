"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadSpaceChargeProofs,
  loadSpaceTabData,
} from "@/app/actions/spaceTab";
import type {
  DeferredTabPayload,
  SpaceTabId,
} from "@/lib/spaces/space-tab-data";

/**
 * Tabs that pull extra server data beyond the space chrome payload.
 * BUILDING: expenses / charges / units are also deferred so the default
 * charges tab does not pay for the ledger or vice versa.
 */
export const DEFERRED_TABS = new Set<SpaceTabId>([
  "report",
  "debts",
  "funds",
  "charges",
  "expenses",
  "units",
]);

/** In-flight tab fetches — dedupe rapid tab switches / double taps. */
const tabInflight = new Map<
  string,
  Promise<Awaited<ReturnType<typeof loadSpaceTabData>>>
>();

function tabFetchKey(
  spaceId: string,
  tab: SpaceTabId,
  year?: number,
  reportMonth?: number | null,
) {
  return `${spaceId}|${tab}|${year ?? ""}|${reportMonth ?? ""}`;
}

function loadSpaceTabDataDeduped(input: {
  spaceId: string;
  tab: SpaceTabId;
  year?: number;
  reportMonth?: number | null;
  skipBuildingView?: boolean;
}) {
  const key = `${tabFetchKey(
    input.spaceId,
    input.tab,
    input.year,
    input.reportMonth,
  )}|sb=${input.skipBuildingView ? 1 : 0}`;
  const existing = tabInflight.get(key);
  if (existing) return existing;

  const promise = loadSpaceTabData(input).finally(() => {
    tabInflight.delete(key);
  });
  tabInflight.set(key, promise);
  return promise;
}

export function syncTabQuery(tab: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("tab") !== tab) {
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }
  window.dispatchEvent(
    new CustomEvent("superhesab:space-tab", { detail: { tab } }),
  );
}

/** After add/edit/delete expense — deferred tab caches must refetch. */
export function notifyExpensesMutated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("superhesab:expenses-mutated"));
}

/** After charge payment / plan / override mutations — refresh deferred charges. */
export function notifyChargesMutated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("superhesab:charges-mutated"));
}

function mergeDeferred(
  prev: DeferredTabPayload,
  next: SpaceTabId,
  data: DeferredTabPayload,
): DeferredTabPayload {
  return {
    personalReportData:
      next === "report" ? data.personalReportData : prev.personalReportData,
    reportExpenseLines:
      next === "report" ? data.reportExpenseLines : prev.reportExpenseLines,
    categoryBudgets:
      next === "report" ? data.categoryBudgets : prev.categoryBudgets,
    debts:
      next === "debts"
        ? data.debts
        : next === "units" && data.debts.length > 0
          ? data.debts
          : prev.debts,
    savingsPots: next === "funds" ? data.savingsPots : prev.savingsPots,
    internalLoans:
      next === "funds" ? data.internalLoans : prev.internalLoans,
    chargeProofs:
      next === "charges"
        ? data.chargeProofs.length > 0
          ? data.chargeProofs
          : prev.chargeProofs
        : prev.chargeProofs,
    expenses: next === "expenses" ? data.expenses : prev.expenses,
    expensesHasMore:
      next === "expenses" ? data.expensesHasMore : prev.expensesHasMore,
    buildingDashboard:
      next === "charges" || next === "units"
        ? (data.buildingDashboard ?? prev.buildingDashboard)
        : prev.buildingDashboard,
    buildingCalendar:
      next === "charges"
        ? (data.buildingCalendar ?? prev.buildingCalendar)
        : prev.buildingCalendar,
    buildingUnits:
      next === "charges" || next === "units"
        ? data.buildingUnits.length > 0
          ? data.buildingUnits
          : prev.buildingUnits
        : next === "debts" && data.buildingUnits.length > 0
          ? data.buildingUnits
          : prev.buildingUnits,
  };
}

export function useDeferredSpaceTabs(args: {
  spaceId: string;
  defaultTab: SpaceTabId;
  loadedTabs?: SpaceTabId[];
  reportPlanYear?: number;
  reportMonth?: number | null;
  tabLoadContext?: { planYear?: number; reportMonth?: number | null };
  initial: DeferredTabPayload;
}) {
  const {
    spaceId,
    defaultTab,
    loadedTabs: loadedTabsProp,
    reportPlanYear,
    reportMonth,
    tabLoadContext,
    initial,
  } = args;

  const [tab, setTab] = useState<SpaceTabId>(defaultTab);
  const [loaded, setLoaded] = useState<Set<SpaceTabId>>(
    () => new Set(loadedTabsProp?.length ? loadedTabsProp : [defaultTab]),
  );
  const [pendingTab, setPendingTab] = useState<SpaceTabId | null>(null);
  const [deferred, setDeferred] = useState<DeferredTabPayload>(initial);
  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;
  const deferredRef = useRef(deferred);
  deferredRef.current = deferred;
  const tabRef = useRef(tab);
  tabRef.current = tab;

  useEffect(() => {
    setTab(defaultTab);
    setLoaded(new Set(loadedTabsProp?.length ? loadedTabsProp : [defaultTab]));
    setDeferred(initial);
    setPendingTab(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount on space/period
  }, [spaceId, defaultTab, reportPlanYear, reportMonth]);

  /**
   * After `router.refresh()`, RSC props for the SSR'd tab update in the parent
   * (trip/family/building tabs prefer those props over `deferred`). Do not mirror
   * `initial` into state in an effect — new array identities every render caused
   * Maximum update depth and left the page stuck on the streaming skeleton.
   */

  const ensureTabData = useCallback(
    (next: SpaceTabId, opts?: { silent?: boolean }) => {
      if (!DEFERRED_TABS.has(next) || loadedRef.current.has(next)) return;
      // Silent warm (idle/hover) must not flip tabBusy — only real switches do.
      if (!opts?.silent) setPendingTab(next);
      /**
       * Units after charges: reuse the charge dashboard/units already in
       * memory — only debts need a network round-trip.
       */
      const skipBuildingView =
        next === "units" &&
        (loadedRef.current.has("charges") ||
          Boolean(deferredRef.current.buildingDashboard));
      // Urgent — do not wrap in startTransition (that delayed painting the list).
      void (async () => {
        const result = await loadSpaceTabDataDeduped({
          spaceId,
          tab: next,
          year: tabLoadContext?.planYear ?? reportPlanYear,
          reportMonth: tabLoadContext?.reportMonth ?? reportMonth,
          skipBuildingView,
        });
        if (result.ok) {
          setDeferred((prev) => mergeDeferred(prev, next, result.data));
          setLoaded((prev) => new Set(prev).add(next));
        }
        setPendingTab((cur) => (cur === next ? null : cur));
      })();
    },
    [
      reportMonth,
      reportPlanYear,
      spaceId,
      tabLoadContext?.planYear,
      tabLoadContext?.reportMonth,
    ],
  );

  /**
   * Force-refetch a deferred tab after a mutation. `ensureTabData` no-ops when
   * the tab is already in `loaded`, so create/edit/delete would otherwise stay
   * stale until a full page refresh.
   */
  const reloadTab = useCallback(
    (next: SpaceTabId) => {
      if (!DEFERRED_TABS.has(next)) return Promise.resolve();
      const year = tabLoadContext?.planYear ?? reportPlanYear;
      const month = tabLoadContext?.reportMonth ?? reportMonth;
      tabInflight.delete(tabFetchKey(spaceId, next, year, month));
      return (async () => {
        const result = await loadSpaceTabData({
          spaceId,
          tab: next,
          year,
          reportMonth: month,
        });
        if (result.ok) {
          setDeferred((prev) => mergeDeferred(prev, next, result.data));
          setLoaded((prev) => new Set(prev).add(next));
        }
      })();
    },
    [
      reportMonth,
      reportPlanYear,
      spaceId,
      tabLoadContext?.planYear,
      tabLoadContext?.reportMonth,
    ],
  );

  /** Warm tab payload before click (hover / focus / idle) without skeleton. */
  const prefetchTab = useCallback(
    (next: SpaceTabId) => {
      ensureTabData(next, { silent: true });
    },
    [ensureTabData],
  );

  const onTabChange = (value: string) => {
    const next = value as SpaceTabId;
    setTab(next);
    syncTabQuery(next);
    ensureTabData(next);
  };

  useEffect(() => {
    function onSpaceTab(e: Event) {
      const next = (e as CustomEvent<{ tab?: string }>).detail?.tab;
      if (!next || next === tabRef.current) return;
      const tabId = next as SpaceTabId;
      setTab(tabId);
      ensureTabData(tabId);
    }
    window.addEventListener("superhesab:space-tab", onSpaceTab);
    return () =>
      window.removeEventListener("superhesab:space-tab", onSpaceTab);
  }, [ensureTabData]);

  /** Ledger mutations — refresh deferred expenses (+ report if already loaded). */
  useEffect(() => {
    function onExpensesMutated() {
      void reloadTab("expenses");
      if (loadedRef.current.has("report")) {
        void reloadTab("report");
      }
    }
    window.addEventListener("superhesab:expenses-mutated", onExpensesMutated);
    return () =>
      window.removeEventListener(
        "superhesab:expenses-mutated",
        onExpensesMutated,
      );
  }, [reloadTab]);

  /** Charge mutations — refresh deferred charges (+ units if warmed). */
  useEffect(() => {
    function onChargesMutated() {
      void reloadTab("charges");
      if (loadedRef.current.has("units")) {
        void reloadTab("units");
      }
    }
    window.addEventListener("superhesab:charges-mutated", onChargesMutated);
    return () =>
      window.removeEventListener(
        "superhesab:charges-mutated",
        onChargesMutated,
      );
  }, [reloadTab]);

  /** Patch charge proofs after paint without blocking first charges paint. */
  const hydrateChargeProofs = useCallback(async () => {
    if (deferred.chargeProofs.length > 0) return;
    const result = await loadSpaceChargeProofs({
      spaceId,
      year: tabLoadContext?.planYear ?? reportPlanYear,
    });
    if (!result.ok) return;
    setDeferred((prev) => ({
      ...prev,
      chargeProofs: result.proofs,
    }));
  }, [
    deferred.chargeProofs.length,
    reportPlanYear,
    spaceId,
    tabLoadContext?.planYear,
  ]);

  return {
    tab,
    deferred,
    loaded,
    tabBusy: pendingTab !== null && pendingTab === tab,
    onTabChange,
    prefetchTab,
    reloadTab,
    hydrateChargeProofs,
  };
}
