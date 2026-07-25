"use client";

import { useState } from "react";
import type {
  BuildingAnnouncementDTO,
  BuildingSuggestionDTO,
} from "@/app/actions/building";
import { BuildingAnnouncementsBoard } from "@/components/spaces/building-announcements-board";
import { BuildingSuggestionsInbox } from "@/components/spaces/building-suggestions-inbox";
import { cn } from "@/lib/utils";

type BuildingCommunityHubProps = {
  spaceId: string;
  suggestions: BuildingSuggestionDTO[];
  announcements: BuildingAnnouncementDTO[];
  canMutate: boolean;
};

function faDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
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
  const [view, setView] = useState<"announcements" | "suggestions">(
    "announcements",
  );
  const openSuggestions = suggestions.filter(
    (s) => s.status === "OPEN" || s.status === "IN_PROGRESS",
  ).length;
  const activeAnnouncements = announcements.filter((a) => !a.archived).length;

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="برد جامعه"
        className="grid grid-cols-2 gap-1 rounded-2xl bg-muted/80 p-1 ring-1 ring-border/40"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === "announcements"}
          onClick={() => setView("announcements")}
          className={cn(
            "relative h-10 rounded-xl text-caption font-semibold transition-all",
            view === "announcements"
              ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          اعلان‌ها
          {activeAnnouncements > 0 ? (
            <span
              className={cn(
                "ms-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-micro tabular-nums",
                view === "announcements"
                  ? "bg-primary/12 text-primary"
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
          aria-selected={view === "suggestions"}
          onClick={() => setView("suggestions")}
          className={cn(
            "relative h-10 rounded-xl text-caption font-semibold transition-all",
            view === "suggestions"
              ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          پیشنهادات
          {openSuggestions > 0 ? (
            <span
              className={cn(
                "ms-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-micro tabular-nums",
                view === "suggestions"
                  ? "bg-primary/12 text-primary"
                  : "bg-amber-500/15 text-amber-800 dark:text-amber-200",
              )}
            >
              {faDigits(openSuggestions)}
            </span>
          ) : null}
        </button>
      </div>

      {view === "announcements" ? (
        <BuildingAnnouncementsBoard
          spaceId={spaceId}
          announcements={announcements}
          canMutate={canMutate}
        />
      ) : (
        <BuildingSuggestionsInbox
          spaceId={spaceId}
          suggestions={suggestions}
          canMutate={canMutate}
        />
      )}
    </div>
  );
}
