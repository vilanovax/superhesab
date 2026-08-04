"use client";

import { useState, useTransition } from "react";
import {
  setCategoryPrivacy,
  type CategoryPrivacyDTO,
} from "@/app/actions/categoryPrivacy";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_LABELS,
  type ExpenseCategory,
} from "@/lib/categorizer";
import { HOME_PRIVACY_CATEGORIES } from "@/lib/category-privacy";
import { cn } from "@/lib/utils";

type Props = {
  spaceId: string;
  initial: CategoryPrivacyDTO[];
  currentUserId: string;
  disabled?: boolean;
};

export function CategoryPrivacySettings({
  spaceId,
  initial,
  currentUserId,
  disabled = false,
}: Props) {
  const [policies, setPolicies] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function isPrivateMine(category: ExpenseCategory): boolean {
    const row = policies.find((p) => p.category === category);
    return Boolean(
      row &&
        row.visibility === "PRIVATE" &&
        row.ownerUserId === currentUserId,
    );
  }

  function isPrivateOther(category: ExpenseCategory): boolean {
    const row = policies.find((p) => p.category === category);
    return Boolean(
      row &&
        row.visibility === "PRIVATE" &&
        row.ownerUserId !== currentUserId,
    );
  }

  function toggle(category: ExpenseCategory, makePrivate: boolean) {
    setError(null);
    setPendingKey(category);
    startTransition(async () => {
      const result = await setCategoryPrivacy({
        spaceId,
        category,
        private: makePrivate,
      });
      setPendingKey(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPolicies((prev) => {
        const without = prev.filter((p) => p.category !== category);
        if (!makePrivate) return without;
        return [
          ...without,
          {
            category,
            visibility: "PRIVATE" as const,
            ownerUserId: currentUserId,
          },
        ];
      });
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-pretty text-body-sm font-semibold text-foreground">
          دسته‌های خصوصی
        </h2>
        <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
          مشترک = همه می‌بینند. خصوصی = فقط تو (مالک دفتر همه را می‌بیند).
        </p>
      </div>

      <ul className="space-y-1.5">
        {HOME_PRIVACY_CATEGORIES.map((category) => {
          const mine = isPrivateMine(category);
          const other = isPrivateOther(category);
          const busy = pending && pendingKey === category;
          return (
            <li
              key={category}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-sheet-muted/50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-foreground">
                  {CATEGORY_LABELS[category]}
                </p>
                <p className="text-micro text-muted-foreground">
                  {other
                    ? "خصوصیِ عضو دیگر"
                    : mine
                      ? "خصوصی · فقط تو"
                      : "مشترک"}
                </p>
              </div>
              {other ? (
                <span className="shrink-0 text-micro text-muted-foreground">
                  —
                </span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  role="switch"
                  aria-checked={mine}
                  aria-label={`${CATEGORY_LABELS[category]}: ${mine ? "خصوصی" : "مشترک"}`}
                  variant={mine ? "default" : "outline"}
                  disabled={disabled || busy}
                  className={cn(
                    "h-8 shrink-0 rounded-lg px-3 text-caption",
                    mine && "bg-primary",
                  )}
                  onClick={() => toggle(category, !mine)}
                >
                  {busy ? "…" : mine ? "خصوصی" : "مشترک"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {error ? (
        <p
          className="text-sm text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
