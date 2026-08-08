"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
  type ChecklistItemDTO,
} from "@/app/actions/checklist";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SpaceChecklistProps = {
  spaceId: string;
  items: ChecklistItemDTO[];
  canMutate?: boolean;
};

type OptimisticAction =
  | { type: "toggle"; id: string }
  | { type: "delete"; id: string }
  | { type: "add"; item: ChecklistItemDTO };

/** Incomplete first; completed sink to the end. Stable by createdAt within group. */
function sortChecklist(items: ChecklistItemDTO[]): ChecklistItemDTO[] {
  return [...items].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    return (
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  });
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function SpaceChecklist({
  spaceId,
  items,
  canMutate = true,
}: SpaceChecklistProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [doneOpen, setDoneOpen] = useState(false);

  const [optimisticItems, applyOptimistic] = useOptimistic(
    sortChecklist(items),
    (state: ChecklistItemDTO[], action: OptimisticAction) => {
      switch (action.type) {
        case "toggle":
          return sortChecklist(
            state.map((item) =>
              item.id === action.id
                ? { ...item, isCompleted: !item.isCompleted }
                : item,
            ),
          );
        case "delete":
          return state.filter((item) => item.id !== action.id);
        case "add":
          return sortChecklist([...state, action.item]);
        default:
          return state;
      }
    },
  );

  const openItems = optimisticItems.filter((i) => !i.isCompleted);
  const doneItems = optimisticItems.filter((i) => i.isCompleted);
  const total = optimisticItems.length;
  const doneCount = doneItems.length;
  const progressPct = total > 0 ? Math.round((doneCount * 100) / total) : 0;

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!canMutate) return;
    const trimmed = title.trim();
    if (!trimmed) return;

    setError(null);
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticItem: ChecklistItemDTO = {
      id: tempId,
      spaceId,
      title: trimmed,
      isCompleted: false,
      createdAt: new Date(),
    };

    startTransition(async () => {
      applyOptimistic({ type: "add", item: optimisticItem });
      const result = await addChecklistItem(spaceId, trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      router.refresh();
    });
  }

  function onToggle(item: ChecklistItemDTO) {
    if (!canMutate) return;
    startTransition(async () => {
      applyOptimistic({ type: "toggle", id: item.id });
      await toggleChecklistItem(item.id, item.isCompleted, spaceId);
      router.refresh();
    });
  }

  function onDelete(itemId: string) {
    if (!canMutate) return;
    startTransition(async () => {
      applyOptimistic({ type: "delete", id: itemId });
      await deleteChecklistItem(itemId, spaceId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 pb-6">
      {total > 0 ? (
        <div
          className="flex items-center gap-2.5 rounded-xl border border-border/45 bg-card px-3 py-2 shadow-sm"
          aria-label="پیشرفت چک‌لیست"
        >
          <div
            className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${doneCount} از ${total} انجام شد`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300 ease-out",
                progressPct >= 100 ? "bg-success" : "bg-primary",
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="shrink-0 text-[11px] font-bold tabular-nums text-foreground">
            {doneCount.toLocaleString("fa-IR")}/
            {total.toLocaleString("fa-IR")}
          </p>
          {progressPct >= 100 ? (
            <p className="shrink-0 text-[11px] font-semibold text-success">
              کامل
            </p>
          ) : (
            <p className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {openItems.length.toLocaleString("fa-IR")} باز
            </p>
          )}
        </div>
      ) : null}

      {canMutate ? (
        <form
          onSubmit={onAdd}
          className="flex items-center gap-1.5 rounded-2xl border border-border/50 bg-card p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/35"
        >
          <label htmlFor="checklist-item-title" className="sr-only">
            آیتم جدید
          </label>
          <Input
            id="checklist-item-title"
            name="title"
            autoComplete="off"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="آیتم جدید…"
            className="h-10 min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
            disabled={pending}
            maxLength={120}
          />
          <Button
            type="submit"
            size="sm"
            className="h-10 shrink-0 gap-1 rounded-xl px-3.5 text-caption font-semibold active:scale-[0.97]"
            disabled={pending || title.trim().length === 0}
            aria-label="افزودن آیتم"
          >
            <PlusIcon className="size-4" />
            {pending ? "…" : "افزودن"}
          </Button>
        </form>
      ) : null}

      {error ? (
        <p
          className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}

      {optimisticItems.length === 0 ? (
        <EmptyState
          icon="checklist"
          title="چک‌لیست خالی است"
          description={
            canMutate
              ? "اولین کار یا خرید را بنویسید تا با همسفرها هم‌رسانی شود."
              : "هنوز آیتمی نیست. نقش ناظر فقط مشاهده است."
          }
        />
      ) : (
        <>
          {openItems.length > 0 ? (
            <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
              <div className="flex items-baseline justify-between gap-2 border-b border-border/40 px-3.5 py-2">
                <h3 className="text-caption font-bold text-foreground">
                  باز
                </h3>
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {openItems.length.toLocaleString("fa-IR")} مورد
                </p>
              </div>
              <ul className="divide-y divide-border/35">
                {openItems.map((item) => (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    canMutate={canMutate}
                    pending={pending}
                    onToggle={() => onToggle(item)}
                    onDelete={() => onDelete(item.id)}
                  />
                ))}
              </ul>
            </section>
          ) : (
            <p className="rounded-2xl border border-success/25 bg-success-soft/40 px-3.5 py-3 text-center text-caption font-semibold text-success">
              همه آیتم‌ها انجام شد
            </p>
          )}

          {doneItems.length > 0 ? (
            <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/80 shadow-sm">
              <button
                type="button"
                aria-expanded={doneOpen}
                onClick={() => setDoneOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-start transition-colors active:bg-muted/30"
              >
                <h3 className="text-caption font-semibold text-muted-foreground">
                  انجام‌شده
                  <span className="ms-1.5 tabular-nums">
                    ({doneItems.length.toLocaleString("fa-IR")})
                  </span>
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  {doneOpen ? "بستن" : "نمایش"}
                </span>
              </button>
              {doneOpen ? (
                <ul className="divide-y divide-border/30 border-t border-border/35">
                  {doneItems.map((item) => (
                    <ChecklistRow
                      key={item.id}
                      item={item}
                      canMutate={canMutate}
                      pending={pending}
                      dimmed
                      onToggle={() => onToggle(item)}
                      onDelete={() => onDelete(item.id)}
                    />
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function ChecklistRow({
  item,
  canMutate,
  pending,
  dimmed,
  onToggle,
  onDelete,
}: {
  item: ChecklistItemDTO;
  canMutate: boolean;
  pending: boolean;
  dimmed?: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isTemp = item.id.startsWith("temp-");

  return (
    <li
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 [content-visibility:auto] [contain-intrinsic-size:auto_2.75rem]",
        dimmed && "opacity-75",
      )}
    >
      <Checkbox
        checked={item.isCompleted}
        onCheckedChange={onToggle}
        aria-label={item.title}
        disabled={!canMutate || isTemp || pending}
        className="size-5"
      />
      <button
        type="button"
        onClick={canMutate && !isTemp ? onToggle : undefined}
        disabled={!canMutate || isTemp}
        className={cn(
          "min-w-0 flex-1 text-start text-caption leading-snug",
          item.isCompleted
            ? "text-muted-foreground line-through"
            : "font-medium text-foreground",
          canMutate && !isTemp && "active:opacity-80",
        )}
      >
        {item.title}
      </button>
      {canMutate ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          disabled={isTemp || pending}
          aria-label={`حذف «${item.title}»`}
        >
          <TrashIcon className="size-4" />
        </Button>
      ) : null}
    </li>
  );
}
