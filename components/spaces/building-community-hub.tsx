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

/**
 * Manager tab: suggestions inbox + announcement board (phase 24 + 26).
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

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-2xl bg-muted/70 p-1">
        <button
          type="button"
          onClick={() => setView("announcements")}
          className={cn(
            "h-9 flex-1 rounded-xl text-caption font-semibold transition-colors",
            view === "announcements"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          اعلانات
        </button>
        <button
          type="button"
          onClick={() => setView("suggestions")}
          className={cn(
            "h-9 flex-1 rounded-xl text-caption font-semibold transition-colors",
            view === "suggestions"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          پیشنهادات
          {openSuggestions > 0 ? (
            <span className="ms-1 tabular-nums text-primary">
              ({openSuggestions.toLocaleString("fa-IR")})
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
