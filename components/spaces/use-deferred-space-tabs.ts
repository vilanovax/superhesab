"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useState,
} from "react";
import { loadSpaceTabData } from "@/app/actions/spaceTab";
import type {
  DeferredTabPayload,
  SpaceTabId,
} from "@/lib/spaces/space-tab-data";

/** Tabs that pull extra server data beyond the space chrome payload. */
export const DEFERRED_TABS = new Set<SpaceTabId>([
  "report",
  "debts",
  "funds",
  "checklist",
  "charges",
]);

export function syncTabQuery(tab: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("tab") === tab) return;
  url.searchParams.set("tab", tab);
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
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

  useEffect(() => {
    setTab(defaultTab);
    setLoaded(new Set(loadedTabsProp?.length ? loadedTabsProp : [defaultTab]));
    setDeferred(initial);
    setPendingTab(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount on space/period
  }, [spaceId, defaultTab, reportPlanYear, reportMonth]);

  const ensureTabData = useCallback(
    (next: SpaceTabId) => {
      if (!DEFERRED_TABS.has(next) || loaded.has(next)) return;
      setPendingTab(next);
      startTransition(async () => {
        const result = await loadSpaceTabData({
          spaceId,
          tab: next,
          year: tabLoadContext?.planYear ?? reportPlanYear,
          reportMonth: tabLoadContext?.reportMonth ?? reportMonth,
        });
        if (result.ok) {
          setDeferred((prev) => ({
            personalReportData:
              next === "report"
                ? result.data.personalReportData
                : prev.personalReportData,
            reportExpenseLines:
              next === "report"
                ? result.data.reportExpenseLines
                : prev.reportExpenseLines,
            categoryBudgets:
              next === "report"
                ? result.data.categoryBudgets
                : prev.categoryBudgets,
            debts: next === "debts" ? result.data.debts : prev.debts,
            savingsPots:
              next === "funds" ? result.data.savingsPots : prev.savingsPots,
            internalLoans:
              next === "funds"
                ? result.data.internalLoans
                : prev.internalLoans,
            checklist:
              next === "checklist" ? result.data.checklist : prev.checklist,
            chargeProofs:
              next === "charges"
                ? result.data.chargeProofs
                : prev.chargeProofs,
          }));
          setLoaded((prev) => new Set(prev).add(next));
        }
        setPendingTab((cur) => (cur === next ? null : cur));
      });
    },
    [
      loaded,
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

  return {
    tab,
    deferred,
    tabBusy: pendingTab !== null && pendingTab === tab,
    onTabChange,
  };
}
