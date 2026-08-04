"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!formOpen) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = document.getElementById("resident-suggestion-title");
    if (el instanceof HTMLInputElement) el.focus();
  }, [formOpen]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setFormError(null);
    const t = title.trim();
    const b = body.trim();
    if (t.length < 3 || b.length < 5) {
      setFormError("عنوان حداقل ۳ و توضیح حداقل ۵ کاراکتر.");
      return;
    }

    startTransition(async () => {
      const result = await createBuildingSuggestion({
        spaceId,
        title: t,
        body: b,
      });
      if (!result.ok) {
        const msg = result.error || "خطا در ثبت اطلاعات";
        setFormError(msg);
        showToast(msg, "error");
        return;
      }
      setFormOpen(false);
      setTitle("");
      setBody("");
      setFormError(null);
      showToast("پیشنهاد ثبت شد");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {!formOpen ? (
        <Button
          type="button"
          className="h-11 w-full rounded-xl text-body-sm font-semibold"
          onClick={() => {
            setFormError(null);
            setFormOpen(true);
          }}
        >
          ثبت پیشنهاد یا درخواست
        </Button>
      ) : (
        <form
          onSubmit={onSubmit}
          className="space-y-2.5 rounded-2xl border border-border/55 bg-card p-3.5"
        >
          <div className="space-y-1">
            <label
              htmlFor="resident-suggestion-title"
              className="text-label text-muted-foreground"
            >
              عنوان
            </label>
            <Input
              id="resident-suggestion-title"
              name="suggestionTitle"
              autoComplete="off"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً آسانسور صدا می‌دهد…"
              maxLength={80}
              className="h-11 rounded-xl"
              required
              minLength={3}
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="resident-suggestion-body"
              className="text-label text-muted-foreground"
            >
              توضیح
            </label>
            <textarea
              id="resident-suggestion-body"
              name="suggestionBody"
              autoComplete="off"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="توضیح کوتاه برای مدیر ساختمان…"
              maxLength={800}
              rows={4}
              required
              minLength={5}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-body-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {formError ? (
            <p
              className="rounded-lg bg-destructive-soft px-2.5 py-1.5 text-caption text-destructive"
              role="alert"
              aria-live="assertive"
            >
              {formError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 rounded-xl"
              onClick={() => {
                setFormOpen(false);
                setFormError(null);
              }}
              disabled={pending}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              className="h-10 flex-1 rounded-xl"
              disabled={
                pending || title.trim().length < 3 || body.trim().length < 5
              }
            >
              {pending ? "در حال ارسال…" : "ارسال"}
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
              className="rounded-2xl border border-border/50 bg-card px-3.5 py-3 [content-visibility:auto] [contain-intrinsic-size:auto_6rem]"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 text-pretty text-body-sm font-semibold text-foreground">
                  {s.title}
                </h3>
                <SuggestionStatusPill status={s.status} />
              </div>
              <p className="mt-1.5 whitespace-pre-wrap wrap-break-word text-caption text-muted-foreground">
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
