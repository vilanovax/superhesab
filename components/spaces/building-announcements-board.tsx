"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createBuildingAnnouncement,
  updateBuildingAnnouncement,
  type BuildingAnnouncementDTO,
} from "@/app/actions/building";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateFaShort } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

type BuildingAnnouncementsBoardProps = {
  spaceId: string;
  announcements: BuildingAnnouncementDTO[];
  /** Manager can compose / pin / archive / edit. */
  canMutate: boolean;
  /** Unread announcement ids — show «جدید» for residents. */
  highlightIds?: string[];
};

type Draft = {
  title: string;
  body: string;
  pinned: boolean;
};

const EMPTY_DRAFT: Draft = { title: "", body: "", pinned: false };

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12.5 6.5 4 15v3.5H7.5L16 10.5M12.5 6.5l2.1-2.1a1.5 1.5 0 0 1 2.1 0l1.9 1.9a1.5 1.5 0 0 1 0 2.1L16 10.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 17v5M9.5 3.5 8 9l-3.5 1.5L8 13l1.5 4.5L13 14l3.5 1.5L15 9l-1.5-5.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 7.5h18M5 7.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7.5M9.5 11.5h5M4 4.5h16l1 3H3l1-3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconAction({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-xl border transition-colors",
        "disabled:pointer-events-none disabled:opacity-45",
        active
          ? "border-primary/35 bg-primary/10 text-primary"
          : "border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function AnnouncementEditor({
  draft,
  onChange,
  onCancel,
  onSubmit,
  pending,
  submitLabel,
}: {
  draft: Draft;
  onChange: (next: Draft) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  pending: boolean;
  submitLabel: string;
}) {
  const canSubmit =
    draft.title.trim().length >= 3 && draft.body.trim().length >= 5;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-2.5 rounded-2xl border border-primary/20 bg-card p-3.5 shadow-sm ring-1 ring-primary/10"
    >
      <Input
        value={draft.title}
        onChange={(e) => onChange({ ...draft, title: e.target.value })}
        placeholder="عنوان اعلان"
        maxLength={100}
        className="h-11 rounded-xl"
        autoFocus
      />
      <textarea
        value={draft.body}
        onChange={(e) => onChange({ ...draft, body: e.target.value })}
        placeholder="متن اعلان برای همه ساکنین…"
        maxLength={2000}
        rows={4}
        className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-body-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <label className="flex items-center gap-2 text-caption text-muted-foreground">
        <input
          type="checkbox"
          checked={draft.pinned}
          onChange={(e) => onChange({ ...draft, pinned: e.target.checked })}
          className="size-4 rounded border-border"
        />
        سنجاق در بالای برد
      </label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 flex-1 rounded-xl"
          onClick={onCancel}
          disabled={pending}
        >
          انصراف
        </Button>
        <Button
          type="submit"
          className="h-10 flex-1 rounded-xl"
          disabled={pending || !canSubmit}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function BuildingAnnouncementsBoard({
  spaceId,
  announcements,
  canMutate,
  highlightIds = [],
}: BuildingAnnouncementsBoardProps) {
  const highlightSet = new Set(highlightIds);
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [composing, setComposing] = useState(false);
  const [createDraft, setCreateDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [showArchived, setShowArchived] = useState(false);

  const activeCount = announcements.filter((a) => !a.archived).length;
  const archivedCount = announcements.filter((a) => a.archived).length;

  const visible = canMutate
    ? showArchived
      ? announcements.filter((a) => a.archived)
      : announcements.filter((a) => !a.archived)
    : announcements.filter((a) => !a.archived);

  function openCompose() {
    setEditingId(null);
    setCreateDraft(EMPTY_DRAFT);
    setComposing(true);
  }

  function startEdit(a: BuildingAnnouncementDTO) {
    setComposing(false);
    setEditingId(a.id);
    setEditDraft({
      title: a.title,
      body: a.body,
      pinned: a.pinned,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const title = createDraft.title.trim();
    const body = createDraft.body.trim();
    if (title.length < 3 || body.length < 5) return;

    const pinned = createDraft.pinned;
    setComposing(false);
    setCreateDraft(EMPTY_DRAFT);
    showToast("اعلان منتشر شد");

    startTransition(async () => {
      const result = await createBuildingAnnouncement({
        spaceId,
        title,
        body,
        pinned,
      });
      if (!result.ok) {
        showToast(result.error || "خطا در ثبت اطلاعات", "error");
        return;
      }
      router.refresh();
    });
  }

  function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const title = editDraft.title.trim();
    const body = editDraft.body.trim();
    if (title.length < 3 || body.length < 5) return;

    const id = editingId;
    const pinned = editDraft.pinned;
    cancelEdit();
    showToast("اعلان ویرایش شد");

    startTransition(async () => {
      const result = await updateBuildingAnnouncement({
        spaceId,
        announcementId: id,
        title,
        body,
        pinned,
      });
      if (!result.ok) {
        showToast(result.error || "خطا در ثبت اطلاعات", "error");
        return;
      }
      router.refresh();
    });
  }

  function togglePin(a: BuildingAnnouncementDTO) {
    showToast(a.pinned ? "از سنجاق برداشته شد" : "سنجاق شد");
    startTransition(async () => {
      const result = await updateBuildingAnnouncement({
        spaceId,
        announcementId: a.id,
        pinned: !a.pinned,
      });
      if (!result.ok) {
        showToast(result.error || "خطا در ثبت اطلاعات", "error");
        return;
      }
      router.refresh();
    });
  }

  function toggleArchive(a: BuildingAnnouncementDTO) {
    if (editingId === a.id) cancelEdit();
    showToast(a.archived ? "اعلان بازگردانی شد" : "اعلان بایگانی شد");
    startTransition(async () => {
      const result = await updateBuildingAnnouncement({
        spaceId,
        announcementId: a.id,
        archive: !a.archived,
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
      {canMutate ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-caption text-muted-foreground">
            {showArchived
              ? archivedCount > 0
                ? `${archivedCount.toLocaleString("fa-IR")} اعلان بایگانی`
                : "بایگانی خالی"
              : activeCount > 0
                ? `${activeCount.toLocaleString("fa-IR")} اعلان فعال`
                : "هنوز اعلانی نیست"}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setShowArchived((v) => !v);
                cancelEdit();
                setComposing(false);
              }}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-caption font-medium transition-colors",
                showArchived
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={showArchived}
            >
              <ArchiveIcon className="size-3.5" />
              {showArchived ? "فعال‌ها" : "بایگانی"}
            </button>
            {!showArchived && !composing ? (
              <Button
                type="button"
                className="h-9 rounded-xl px-3 text-caption font-semibold"
                onClick={openCompose}
              >
                <PlusIcon className="size-3.5" />
                اعلان جدید
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {canMutate && composing ? (
        <AnnouncementEditor
          draft={createDraft}
          onChange={setCreateDraft}
          onCancel={() => {
            setComposing(false);
            setCreateDraft(EMPTY_DRAFT);
          }}
          onSubmit={onCreate}
          pending={pending}
          submitLabel="انتشار"
        />
      ) : null}

      {visible.length === 0 && !(canMutate && composing) ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-9 text-center">
          <p className="text-body-sm font-medium text-foreground">
            {canMutate
              ? showArchived
                ? "بایگانی خالی است"
                : "برد اعلان‌ها خالی است"
              : "اعلانی از مدیر ساختمان نیست"}
          </p>
          <p className="mt-1 text-caption text-muted-foreground">
            {canMutate && !showArchived
              ? "اولین خبر مهم ساختمان را برای ساکنین منتشر کنید."
              : showArchived
                ? "اعلان‌های بایگانی‌شده اینجا دیده می‌شوند."
                : "وقتی مدیر اعلان بگذارد، اینجا نمایش داده می‌شود."}
          </p>
          {canMutate && !showArchived ? (
            <Button
              type="button"
              className="mt-4 h-10 rounded-xl px-4 text-caption font-semibold"
              onClick={openCompose}
            >
              <PlusIcon className="size-3.5" />
              نوشتن اعلان
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {visible.map((a) =>
            editingId === a.id ? (
              <li key={a.id}>
                <AnnouncementEditor
                  draft={editDraft}
                  onChange={setEditDraft}
                  onCancel={cancelEdit}
                  onSubmit={onSaveEdit}
                  pending={pending}
                  submitLabel="ذخیره"
                />
              </li>
            ) : (
              <li
                key={a.id}
                className={cn(
                  "rounded-2xl border bg-card px-3.5 py-3 transition-shadow",
                  a.pinned
                    ? "border-primary/30 shadow-sm ring-1 ring-primary/12"
                    : "border-border/50",
                  a.archived && "opacity-70",
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {highlightSet.has(a.id) ? (
                        <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-micro font-semibold text-amber-800 dark:text-amber-200">
                          جدید
                        </span>
                      ) : null}
                      {a.pinned ? (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-micro font-semibold text-primary">
                          <PinIcon className="size-3" />
                          سنجاق
                        </span>
                      ) : null}
                      {a.archived ? (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-micro font-medium text-muted-foreground">
                          بایگانی
                        </span>
                      ) : null}
                      <p className="text-body-sm font-semibold leading-snug text-foreground">
                        {a.title}
                      </p>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-caption leading-relaxed text-muted-foreground">
                      {a.body}
                    </p>
                    <p className="mt-2 text-micro text-muted-foreground/90">
                      {formatDateFaShort(a.createdAt)}
                      {a.authorName ? ` · ${a.authorName}` : ""}
                    </p>
                  </div>

                  {canMutate ? (
                    <div className="flex shrink-0 items-center gap-1">
                      {!a.archived ? (
                        <IconAction
                          label="ویرایش اعلان"
                          disabled={pending}
                          onClick={() => startEdit(a)}
                        >
                          <PencilIcon className="size-4" />
                        </IconAction>
                      ) : null}
                      <IconAction
                        label={a.pinned ? "برداشتن سنجاق" : "سنجاق کردن"}
                        active={a.pinned}
                        disabled={pending || a.archived}
                        onClick={() => togglePin(a)}
                      >
                        <PinIcon className="size-4" />
                      </IconAction>
                      <IconAction
                        label={a.archived ? "بازگردانی" : "بایگانی"}
                        active={a.archived}
                        disabled={pending}
                        onClick={() => toggleArchive(a)}
                      >
                        <ArchiveIcon className="size-4" />
                      </IconAction>
                    </div>
                  ) : null}
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
