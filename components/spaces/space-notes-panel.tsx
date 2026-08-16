"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveSpaceNote,
  type SpaceNoteDTO,
} from "@/app/actions/notes";
import type { ChecklistItemDTO } from "@/app/actions/checklist";
import { SpaceChecklist } from "@/components/SpaceChecklist";
import { Button } from "@/components/ui/button";
import { formatDateFaShort } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

type SpaceNotesPanelProps = {
  spaceId: string;
  note: SpaceNoteDTO | null;
  checklist: ChecklistItemDTO[];
  canMutate?: boolean;
};

const EMPTY_NOTE: SpaceNoteDTO = {
  spaceId: "",
  body: "",
  updatedAt: null,
  updatedByName: null,
};

function NotePadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 4h8a2 2 0 0 1 2 2v14l-3-1.5L12 20l-3-1.5L6 20V6a2 2 0 0 1 2-2z" />
      <path d="M9.5 9h5M9.5 12.5h5M9.5 16h3" />
    </svg>
  );
}

function CheckListIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4.5 6.5 5.5 7.5 7.5 5.5" />
      <path d="M4.5 12.5 5.5 13.5 7.5 11.5" />
      <path d="M4.5 18.5 5.5 19.5 7.5 17.5" />
    </svg>
  );
}

/**
 * Shared notes hub: freeform pad + todo checklist for every template.
 */
export function SpaceNotesPanel({
  spaceId,
  note,
  checklist,
  canMutate = true,
}: SpaceNotesPanelProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const serverBody = note?.body ?? "";
  const [body, setBody] = useState(serverBody);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBody(note?.body ?? "");
  }, [note?.body, note?.updatedAt]);

  const dirty = body !== serverBody;
  const meta = note ?? { ...EMPTY_NOTE, spaceId };
  const openCount = checklist.filter((i) => !i.isCompleted).length;
  const doneCount = checklist.filter((i) => i.isCompleted).length;

  function onSave() {
    if (!canMutate || pending || !dirty) return;
    setError(null);
    startTransition(async () => {
      const result = await saveSpaceNote(spaceId, body);
      if (!result.ok) {
        setError(result.error);
        showToast(result.error, "error");
        return;
      }
      showToast("یادداشت ذخیره شد");
      router.refresh();
    });
  }

  return (
    <div className="animate-fade-up space-y-3 pb-2">
      <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <div className="flex items-start gap-2.5 border-b border-border/40 px-3.5 py-2.5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <NotePadIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-caption font-bold text-foreground">متن مشترک</h2>
            <p className="mt-0.5 text-micro leading-snug text-muted-foreground">
              آدرس، قرار، نکات مهم برای اعضای این دفتر
            </p>
          </div>
          {meta.updatedAt ? (
            <p className="shrink-0 text-end text-micro leading-snug text-muted-foreground">
              <span className="block tabular-nums">
                {formatDateFaShort(meta.updatedAt)}
              </span>
              {meta.updatedByName ? (
                <span className="mt-0.5 block max-w-[7rem] truncate">
                  {meta.updatedByName}
                </span>
              ) : null}
            </p>
          ) : (
            <span className="shrink-0 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              خالی
            </span>
          )}
        </div>

        <div className="relative">
          <label htmlFor="space-note-body" className="sr-only">
            متن یادداشت
          </label>
          <textarea
            id="space-note-body"
            name="spaceNoteBody"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              canMutate
                ? "اینجا بنویسید…"
                : "یادداشتی ثبت نشده است."
            }
            rows={8}
            maxLength={12000}
            disabled={!canMutate || pending}
            className={cn(
              "min-h-[11rem] w-full resize-y border-0 bg-transparent px-3.5 py-3 text-body-sm leading-[1.75] outline-none",
              "placeholder:text-muted-foreground/55 focus-visible:bg-primary/[0.03]",
              "disabled:cursor-not-allowed disabled:opacity-70",
            )}
          />

          {canMutate ? (
            <div
              className={cn(
                "flex items-center justify-between gap-2 border-t px-3.5 py-2.5 transition-[background-color,border-color] duration-200",
                dirty
                  ? "border-primary/25 bg-primary/[0.06]"
                  : "border-border/40 bg-muted/20",
              )}
            >
              <p
                className={cn(
                  "text-micro tabular-nums",
                  dirty ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                {body.length.toLocaleString("fa-IR")}/۱۲٬۰۰۰
                {dirty ? " · ذخیره‌نشده" : body.length > 0 ? " · ذخیره‌شده" : ""}
              </p>
              <Button
                type="button"
                size="sm"
                className={cn(
                  "h-9 rounded-xl px-3.5 text-caption font-semibold active:scale-[0.97]",
                  !dirty && "opacity-50",
                )}
                disabled={pending || !dirty}
                onClick={onSave}
              >
                {pending ? "در حال ذخیره…" : "ذخیره"}
              </Button>
            </div>
          ) : null}
        </div>

        {error ? (
          <p
            className="mx-3.5 mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-caption text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <div className="flex items-start gap-2.5 border-b border-border/40 px-3.5 py-2.5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CheckListIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-caption font-bold text-foreground">لیست کار</h2>
            <p className="mt-0.5 text-micro leading-snug text-muted-foreground">
              کارهای کوتاه با تیک — جدا از هزینه‌ها
            </p>
          </div>
          {checklist.length > 0 ? (
            <p className="shrink-0 rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-bold tabular-nums text-foreground">
              {openCount.toLocaleString("fa-IR")} باز
              {doneCount > 0
                ? ` · ${doneCount.toLocaleString("fa-IR")} انجام`
                : ""}
            </p>
          ) : null}
        </div>

        <div className="p-3">
          <SpaceChecklist
            spaceId={spaceId}
            items={checklist}
            canMutate={canMutate}
            embedded
          />
        </div>
      </section>
    </div>
  );
}
