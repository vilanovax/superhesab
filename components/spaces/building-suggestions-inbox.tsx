"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  updateBuildingSuggestionStatus,
  type BuildingSuggestionDTO,
} from "@/app/actions/building";
import { SuggestionStatusPill } from "@/components/spaces/resident-suggestions-panel";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  SUGGESTION_STATUS_LABELS,
  type SuggestionStatusValue,
} from "@/lib/building";
import { formatDateFaShort } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

type BuildingSuggestionsInboxProps = {
  spaceId: string;
  suggestions: BuildingSuggestionDTO[];
  canMutate: boolean;
};

const STATUS_ORDER: SuggestionStatusValue[] = [
  "OPEN",
  "IN_PROGRESS",
  "DONE",
  "REJECTED",
];

export function BuildingSuggestionsInbox({
  spaceId,
  suggestions,
  canMutate,
}: BuildingSuggestionsInboxProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<BuildingSuggestionDTO | null>(null);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<"all" | "open">("open");

  const openCount = suggestions.filter(
    (s) => s.status === "OPEN" || s.status === "IN_PROGRESS",
  ).length;

  const visible =
    filter === "open"
      ? suggestions.filter(
          (s) => s.status === "OPEN" || s.status === "IN_PROGRESS",
        )
      : suggestions;

  function openItem(s: BuildingSuggestionDTO) {
    setSelected(s);
    setNote(s.managerNote ?? "");
  }

  function setStatus(status: SuggestionStatusValue) {
    if (!selected || !canMutate) return;
    const id = selected.id;
    setSelected(null);
    showToast("وضعیت به‌روز شد");

    startTransition(async () => {
      const result = await updateBuildingSuggestionStatus({
        spaceId,
        suggestionId: id,
        status,
        managerNote: note.trim() || null,
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
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption text-muted-foreground">
          {openCount > 0
            ? `${openCount} مورد باز یا در حال پیگیری`
            : "مورد بازی نیست"}
        </p>
        <div className="flex gap-1 rounded-xl bg-muted/70 p-0.5">
          {(
            [
              { id: "open" as const, label: "باز" },
              { id: "all" as const, label: "همه" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-caption font-semibold transition-colors",
                filter === opt.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-body-sm text-muted-foreground">
          {filter === "open"
            ? "پیشنهاد بازی از ساکنین نیست."
            : "هنوز پیشنهادی ثبت نشده است."}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => openItem(s)}
                className="w-full rounded-2xl border border-border/50 bg-card px-3.5 py-3 text-start transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-foreground">
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-caption text-muted-foreground">
                      واحد {s.unitName}
                      {s.authorName ? ` · ${s.authorName}` : ""} ·{" "}
                      {formatDateFaShort(s.createdAt)}
                    </p>
                  </div>
                  <SuggestionStatusPill status={s.status} />
                </div>
                <p className="mt-1.5 line-clamp-2 text-caption text-muted-foreground">
                  {s.body}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        repositionInputs={false}
      >
        <DrawerContent className="mt-0! flex max-h-[85dvh] flex-col gap-0 overflow-hidden border-border/50 bg-background p-0">
          {selected ? (
            <>
              <div className="surface-hero shrink-0 px-4 pb-2.5 pt-1">
                <DrawerHeader className="space-y-0 p-0 text-start">
                  <DrawerTitle className="text-body font-bold text-on-hero">
                    {selected.title}
                  </DrawerTitle>
                  <DrawerDescription className="mt-0.5 text-caption text-on-hero/70">
                    واحد {selected.unitName}
                    {selected.authorName ? ` · ${selected.authorName}` : ""}
                  </DrawerDescription>
                </DrawerHeader>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                <p className="whitespace-pre-wrap text-body-sm text-foreground">
                  {selected.body}
                </p>
                <p className="text-micro text-muted-foreground">
                  {formatDateFaShort(selected.createdAt)} ·{" "}
                  {SUGGESTION_STATUS_LABELS[selected.status]}
                </p>
                {canMutate ? (
                  <>
                    <label className="block space-y-1.5">
                      <span className="text-caption font-medium text-muted-foreground">
                        یادداشت مدیر (اختیاری)
                      </span>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={300}
                        rows={3}
                        className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-body-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="پاسخ کوتاه برای ساکن…"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {STATUS_ORDER.map((st) => (
                        <Button
                          key={st}
                          type="button"
                          variant={
                            selected.status === st ? "default" : "outline"
                          }
                          className="h-10 rounded-xl text-caption"
                          disabled={pending}
                          onClick={() => setStatus(st)}
                        >
                          {SUGGESTION_STATUS_LABELS[st]}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
