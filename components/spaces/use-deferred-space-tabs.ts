"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
  "checklist",
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
}) {
  const key = tabFetchKey(
    input.spaceId,
    input.tab,
    input.year,
    input.reportMonth,
  );
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
  if (url.searchParams.get("tab") === tab) return;
  url.searchParams.set("tab", tab);
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
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
    debts: next === "debts" ? data.debts : prev.debts,
    savingsPots: next === "funds" ? data.savingsPots : prev.savingsPots,
    internalLoans:
      next === "funds" ? data.internalLoans : prev.internalLoans,
    checklist: next === "checklist" ? data.checklist : prev.checklist,
    chargeProofs:
      next === "charges" ? data.chargeProofs : prev.chargeProofs,
    expenses: next === "expenses" ? data.expenses : prev.expenses,
    expensesHasMore:
      next === "expenses" ? data.expensesHasMore : prev.expensesHasMore,
    buildingDashboard:
      next === "charges" || next === "units"
        ? data.buildingDashboard
        : prev.buildingDashboard,
    buildingCalendar:
      next === "charges" ? data.buildingCalendar : prev.buildingCalendar,
    buildingUnits:
      next === "charges" || next === "units"
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

  useEffect(() => {
    setTab(defaultTab);
    setLoaded(new Set(loadedTabsProp?.length ? loadedTabsProp : [defaultTab]));
    setDeferred(initial);
    setPendingTab(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount on space/period
  }, [spaceId, defaultTab, reportPlanYear, reportMonth]);

  const ensureTabData = useCallback(
    (next: SpaceTabId) => {
      if (!DEFERRED_TABS.has(next) || loadedRef.current.has(next)) return;
      setPendingTab(next);
      startTransition(async () => {
        const result = await loadSpaceTabDataDeduped({
          spaceId,
          tab: next,
          year: tabLoadContext?.planYear ?? reportPlanYear,
          reportMonth: tabLoadContext?.reportMonth ?? reportMonth,
        });
        if (result.ok) {
          setDeferred((prev) => mergeDeferred(prev, next, result.data));
          setLoaded((prev) => new Set(prev).add(next));
        }
        setPendingTab((cur) => (cur === next ? null : cur));
      });
    },
    [
      reportMonth,
      reportPlanYear,
      spaceId,
      tabLoadContext?.planYear,
      tabLoadContext?.reportMonth,
    ],
  );

  const onTabChange = (value: string) => {
    const next = value as SpaceTabId;
    setTab(next);
    syncTabQuery(next);
    ensureTabData(next);
  };

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
    hydrateChargeProofs,
  };
}
