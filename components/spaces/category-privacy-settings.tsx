"use client";

import { useMemo, useState, useTransition } from "react";
import {
  setCategoryPrivacy,
  type CategoryPrivacyDTO,
} from "@/app/actions/categoryPrivacy";
import { SettingsDisclosure } from "@/components/spaces/settings-disclosure";
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

  const privateCount = useMemo(
    () =>
      HOME_PRIVACY_CATEGORIES.filter((c) => {
        const row = policies.find((p) => p.category === c);
        return row?.visibility === "PRIVATE";
      }).length,
    [policies],
  );

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

  const summary =
    privateCount > 0
      ? `${HOME_PRIVACY_CATEGORIES.length.toLocaleString("fa-IR")} دسته · ${privateCount.toLocaleString("fa-IR")} خصوصی`
      : `${HOME_PRIVACY_CATEGORIES.length.toLocaleString("fa-IR")} دسته · همه مشترک`;

  return (
    <SettingsDisclosure
      title="دسته‌های خصوصی"
      summary={summary}
      defaultOpen={privateCount > 0}
    >
      <p className="mb-2.5 text-[11px] leading-relaxed text-muted-foreground">
        مشترک = همه می‌بینند. خصوصی = فقط تو (مالک دفتر همه را می‌بیند).
      </p>

      <ul className="divide-y divide-border/35 overflow-hidden rounded-xl border border-border/40">
        {HOME_PRIVACY_CATEGORIES.map((category) => {
          const mine = isPrivateMine(category);
          const other = isPrivateOther(category);
          const busy = pending && pendingKey === category;
          return (
            <li
              key={category}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5"
            >
              <div className="min-w-0">
                <p className="truncate text-caption font-medium text-foreground">
                  {CATEGORY_LABELS[category]}
                </p>
                {other || mine ? (
                  <p className="text-[10px] text-muted-foreground">
                    {other ? "خصوصیِ عضو دیگر" : "فقط تو"}
                  </p>
                ) : null}
              </div>
              {other ? (
                <span className="shrink-0 text-[10px] text-muted-foreground">
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
                    "h-7 shrink-0 rounded-lg px-2.5 text-[11px]",
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
          className="mt-2 text-sm text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}
    </SettingsDisclosure>
  );
}
