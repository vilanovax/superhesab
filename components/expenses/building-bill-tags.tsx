"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_BILL_TAGS,
  loadCustomBillTags,
  rememberCustomBillTag,
  removeCustomBillTag,
} from "@/lib/building-bill-tags";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BuildingBillTagsProps = {
  spaceId: string;
  value: string | null;
  onChange: (tag: string | null) => void;
  className?: string;
};

/**
 * Chips under قبوض: آب / برق / گاز / اینترنت + user tags persisted per space.
 */
export function BuildingBillTags({
  spaceId,
  value,
  onChange,
  className,
}: BuildingBillTagsProps) {
  const [customs, setCustoms] = useState(() => loadCustomBillTags(spaceId));
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setCustoms(loadCustomBillTags(spaceId));
  }, [spaceId]);

  function pick(tag: string) {
    onChange(value === tag ? null : tag);
  }

  function addCustom(e: React.FormEvent) {
    e.preventDefault();
    const label = draft.trim();
    if (label.length < 1) return;
    const next = rememberCustomBillTag(spaceId, label);
    setCustoms(next);
    onChange(label);
    setDraft("");
    setDraftOpen(false);
  }

  function forget(tag: string) {
    const next = removeCustomBillTag(spaceId, tag);
    setCustoms(next);
    if (value === tag) onChange(null);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <p className="text-caption font-semibold text-muted-foreground">
          نوع قبض
        </p>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-micro font-medium text-muted-foreground hover:text-foreground"
          >
            پاک کردن
          </button>
        ) : null}
      </div>

      <div
        role="group"
        aria-label="تگ نوع قبض"
        className="flex flex-wrap gap-1.5"
      >
        {DEFAULT_BILL_TAGS.map((tag) => {
          const on = value === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => pick(tag)}
              className={cn(
                "rounded-full px-3 py-1.5 text-caption font-semibold transition-transform active:scale-95",
                on
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tag}
            </button>
          );
        })}
        {customs.map((tag) => {
          const on = value === tag;
          return (
            <span key={tag} className="inline-flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => pick(tag)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-caption font-semibold transition-transform active:scale-95",
                  on
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card text-foreground ring-1 ring-border/70 hover:bg-muted/60",
                )}
              >
                {tag}
              </button>
              <button
                type="button"
                aria-label={`حذف تگ ${tag}`}
                title="حذف از لیست من"
                onClick={() => forget(tag)}
                className="flex size-6 items-center justify-center rounded-full text-micro text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
              >
                ×
              </button>
            </span>
          );
        })}
        {!draftOpen ? (
          <button
            type="button"
            onClick={() => setDraftOpen(true)}
            className="rounded-full border border-dashed border-primary/35 px-3 py-1.5 text-caption font-semibold text-primary hover:bg-primary/8"
          >
            + تگ
          </button>
        ) : null}
      </div>

      {draftOpen ? (
        <form
          onSubmit={addCustom}
          className="flex gap-1.5 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-2"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="مثلاً شارژ ساختمان، تلفن…"
            maxLength={24}
            autoFocus
            className="h-9 flex-1 rounded-lg border-border/60 bg-card text-caption"
          />
          <Button
            type="submit"
            disabled={draft.trim().length < 1}
            className="h-9 shrink-0 rounded-lg px-3 text-caption"
          >
            افزودن
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-9 shrink-0 rounded-lg px-2 text-caption"
            onClick={() => {
              setDraftOpen(false);
              setDraft("");
            }}
          >
            انصراف
          </Button>
        </form>
      ) : null}
    </div>
  );
}
