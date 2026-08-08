"use client";

import { useState } from "react";
import type {
  BuildingAnnouncementDTO,
  BuildingSuggestionDTO,
} from "@/app/actions/building";
import { BuildingAnnouncementsBoard } from "@/components/spaces/building-announcements-board";
import { BuildingSuggestionsInbox } from "@/components/spaces/building-suggestions-inbox";
import { cn } from "@/lib/utils";

type BoardView = "announcements" | "suggestions";

type BuildingCommunityHubProps = {
  spaceId: string;
  suggestions: BuildingSuggestionDTO[];
  announcements: BuildingAnnouncementDTO[];
  canMutate: boolean;
};

function faDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

function readBoardView(): BoardView {
  if (typeof window === "undefined") return "announcements";
  return new URL(window.location.href).searchParams.get("board") ===
    "suggestions"
    ? "suggestions"
    : "announcements";
}

/** Deep-link hub sub-view (`?board=suggestions`; omit for announcements). */
function syncBoardQuery(view: BoardView) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const prev = `${url.pathname}${url.search}`;
  if (view === "announcements") url.searchParams.delete("board");
  else url.searchParams.set("board", "suggestions");
  const next = `${url.pathname}${url.search}`;
  if (prev === next) return;
  window.history.replaceState(null, "", next);
}

/**
 * Manager tab: announcements board + suggestions inbox (phase 24 + 26).
 */
export function BuildingCommunityHub({
  spaceId,
  suggestions,
  announcements,
  canMutate,
}: BuildingCommunityHubProps) {
  const [view, setView] = useState<BoardView>(readBoardView);
  const openSuggestions = suggestions.filter(
    (s) => s.status === "OPEN" || s.status === "IN_PROGRESS",
  ).length;
  const activeAnnouncements = announcements.filter((a) => !a.archived).length;

  function selectView(next: BoardView) {
    setView(next);
    syncBoardQuery(next);
  }

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="برد جامعه"
        className="grid grid-cols-2 gap-1 rounded-[1.15rem] border border-border/45 bg-card p-1 shadow-sm"
      >
        <button
          type="button"
          role="tab"
          id="board-tab-announcements"
          aria-controls="board-panel-announcements"
          aria-selected={view === "announcements"}
          onClick={() => selectView("announcements")}
          className={cn(
            "relative flex h-11 items-center justify-center rounded-xl text-body-sm font-semibold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            view === "announcements"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          اعلان‌ها
          {activeAnnouncements > 0 ? (
            <span
              className={cn(
                "ms-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-micro tabular-nums",
                view === "announcements"
                  ? "bg-on-hero/20 text-on-hero"
                  : "bg-muted-foreground/15 text-muted-foreground",
              )}
            >
              {faDigits(activeAnnouncements)}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          id="board-tab-suggestions"
          aria-controls="board-panel-suggestions"
          aria-selected={view === "suggestions"}
          onClick={() => selectView("suggestions")}
          className={cn(
            "relative flex h-11 items-center justify-center rounded-xl text-body-sm font-semibold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            view === "suggestions"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          پیشنهادات
          {openSuggestions > 0 ? (
            <span
              className={cn(
                "ms-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-micro tabular-nums",
                view === "suggestions"
                  ? "bg-on-hero/20 text-on-hero"
                  : "bg-amber-500/15 text-amber-800 dark:text-amber-200",
              )}
            >
              {faDigits(openSuggestions)}
            </span>
          ) : null}
        </button>
      </div>

      {view === "announcements" ? (
        <div
          id="board-panel-announcements"
          role="tabpanel"
          aria-labelledby="board-tab-announcements"
        >
          <BuildingAnnouncementsBoard
            spaceId={spaceId}
            announcements={announcements}
            canMutate={canMutate}
          />
        </div>
      ) : (
        <div
          id="board-panel-suggestions"
          role="tabpanel"
          aria-labelledby="board-tab-suggestions"
        >
          <BuildingSuggestionsInbox
            spaceId={spaceId}
            suggestions={suggestions}
            canMutate={canMutate}
          />
        </div>
      )}
    </div>
  );
}
