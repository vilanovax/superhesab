"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  unfollowBuildingShare,
  type FollowedBuildingShareCard,
} from "@/app/actions/building-share";
import { SpaceTypeIcon, spaceTypeTint } from "@/components/spaces/space-type-icon";
import { formatMoney } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function HomeFollowedReports({
  cards,
}: {
  cards: FollowedBuildingShareCard[];
}) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();

  if (cards.length === 0) return null;

  function unpin(token: string) {
    startTransition(async () => {
      const result = await unfollowBuildingShare(token);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast("گزارش از خانه برداشته شد", "success");
      router.refresh();
    });
  }

  return (
    <section className="mt-8" aria-label="گزارش‌های دنبال‌شده">
      <h2 className="mb-3 text-base font-bold tracking-tight text-foreground">
        گزارش ساختمان‌ها
      </h2>
      <ul className="space-y-2.5">
        {cards.map((card) => {
          const stat =
            card.collectPct != null
              ? `${card.collectPct.toLocaleString("fa-IR")}٪ وصول`
              : card.monthSpend != null && card.monthSpend > 0
                ? `این ماه ${formatMoney(card.monthSpend)}`
                : "فقط مشاهده";
          return (
            <li key={card.token} className="animate-fade-up">
              <div
                className={cn(
                  "flex min-h-17 items-center gap-3.5 rounded-[1.25rem] border border-dashed border-primary/25 bg-card px-3.5 py-3.5",
                  "shadow-sm",
                )}
              >
                <Link
                  href={`/share/b/${card.token}`}
                  className="flex min-w-0 flex-1 items-center gap-3.5"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-2xl",
                      spaceTypeTint("BUILDING"),
                    )}
                  >
                    <SpaceTypeIcon type="BUILDING" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-foreground">
                      {card.spaceName}
                    </p>
                    <p className="mt-0.5 truncate text-caption text-muted-foreground">
                      گزارش دنبال‌شده
                      {card.title?.trim() ? ` · ${card.title.trim()}` : ""}
                    </p>
                    <p className="mt-1.5 text-caption font-semibold tabular-nums text-muted-foreground">
                      {stat}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground"
                  >
                    <Chevron className="size-4" />
                  </span>
                </Link>
                <button
                  type="button"
                  className="shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-destructive"
                  disabled={pending}
                  onClick={() => unpin(card.token)}
                >
                  برداشتن
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
