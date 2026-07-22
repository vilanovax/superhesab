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

export function SpaceChecklist({ spaceId, items }: SpaceChecklistProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
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
    startTransition(async () => {
      applyOptimistic({ type: "toggle", id: item.id });
      await toggleChecklistItem(item.id, item.isCompleted, spaceId);
      router.refresh();
    });
  }

  function onDelete(itemId: string) {
    startTransition(async () => {
      applyOptimistic({ type: "delete", id: itemId });
      await deleteChecklistItem(itemId, spaceId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onAdd} className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="آیتم جدید…"
          className="h-12"
          disabled={pending}
        />
        <Button type="submit" className="h-12 shrink-0 px-5" disabled={pending}>
          افزودن
        </Button>
      </form>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {optimisticItems.length === 0 ? (
        <EmptyState
          icon="checklist"
          title="چک‌لیست خالی است"
          description="خرید، کارها و یادآورها را اینجا بنویسید تا همه ببینند."
        />
      ) : (
        <ul className="space-y-2">
          {optimisticItems.map((item) => (
            <li
              key={item.id}
              className="flex min-h-12 items-center gap-3 rounded-xl border border-border/80 bg-card/90 px-3 py-2 backdrop-blur-sm"
            >
              <Checkbox
                checked={item.isCompleted}
                onCheckedChange={() => onToggle(item)}
                aria-label={item.title}
                disabled={item.id.startsWith("temp-")}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm leading-snug",
                  item.isCompleted
                    ? "text-muted-foreground line-through"
                    : "text-foreground",
                )}
              >
                {item.title}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-12 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(item.id)}
                disabled={item.id.startsWith("temp-")}
                aria-label="حذف"
              >
                <TrashIcon className="size-5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
