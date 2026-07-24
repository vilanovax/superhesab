"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createBuildingSuggestion,
  type BuildingSuggestionDTO,
} from "@/app/actions/building";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SUGGESTION_STATUS_LABELS,
  type SuggestionStatusValue,
} from "@/lib/building";
import { formatDateFaShort } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

type ResidentSuggestionsProps = {
  spaceId: string;
  suggestions: BuildingSuggestionDTO[];
};

export function ResidentSuggestionsPanel({
  spaceId,
  suggestions,
}: ResidentSuggestionsProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (t.length < 3 || b.length < 5) return;

    setFormOpen(false);
    setTitle("");
    setBody("");
    showToast("پیشنهاد ثبت شد");

    startTransition(async () => {
      const result = await createBuildingSuggestion({
        spaceId,
        title: t,
        body: b,
      });
      if (!result.ok) {
        showToast(result.error || "خطا در ثبت اطلاعات", "error");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {!formOpen ? (
        <Button
          type="button"
          className="h-11 w-full rounded-xl text-body-sm font-semibold"
          onClick={() => setFormOpen(true)}
        >
          ثبت پیشنهاد یا درخواست
        </Button>
      ) : (
        <form
          onSubmit={onSubmit}
          className="space-y-2.5 rounded-2xl border border-border/55 bg-card p-3.5"
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان (مثلاً آسانسور صدا می‌دهد)"
            maxLength={80}
            className="h-11 rounded-xl"
            autoFocus
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="توضیح کوتاه برای مدیر ساختمان…"
            maxLength={800}
            rows={4}
            className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-body-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 rounded-xl"
              onClick={() => setFormOpen(false)}
              disabled={pending}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              className="h-10 flex-1 rounded-xl"
              disabled={pending || title.trim().length < 3 || body.trim().length < 5}
            >
              ارسال
            </Button>
          </div>
        </form>
      )}

      {suggestions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-body-sm text-muted-foreground">
          هنوز پیشنهادی ثبت نکرده‌اید.
        </div>
      ) : (
        <ul className="space-y-2">
          {suggestions.map((s) => (
            <li
              key={s.id}
              className="rounded-2xl border border-border/50 bg-card px-3.5 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-body-sm font-semibold text-foreground">
                  {s.title}
                </p>
                <SuggestionStatusPill status={s.status} />
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-caption text-muted-foreground">
                {s.body}
              </p>
              {s.managerNote ? (
                <p className="mt-2 rounded-xl bg-muted/60 px-2.5 py-1.5 text-caption text-foreground">
                  پاسخ مدیر: {s.managerNote}
                </p>
              ) : null}
              <p className="mt-2 text-micro text-muted-foreground">
                {formatDateFaShort(s.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SuggestionStatusPill({
  status,
}: {
  status: SuggestionStatusValue;
}) {
  const tone =
    status === "DONE"
      ? "bg-success-soft text-success"
      : status === "REJECTED"
        ? "bg-destructive-soft text-destructive"
        : status === "IN_PROGRESS"
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "shrink-0 rounded-lg px-2 py-0.5 text-micro font-semibold",
        tone,
      )}
    >
      {SUGGESTION_STATUS_LABELS[status]}
    </span>
  );
}
