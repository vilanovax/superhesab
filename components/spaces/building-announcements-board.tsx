"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
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

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 11v2a1 1 0 0 0 1 1h1l6 3.5V6.5L5 10H4a1 1 0 0 0-1 1Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M14 8.5c1.2.6 2 1.9 2 3.5s-.8 2.9-2 3.5M17 6.5c2 1.1 3.3 3.2 3.3 5.5S19 16.4 17 17.5M7.5 15.5v2.2a1.8 1.8 0 0 0 3.2 1.1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
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
  mode,
  draft,
  onChange,
  onCancel,
  onSubmit,
  pending,
  submitLabel,
  error,
}: {
  mode: "create" | "edit";
  draft: Draft;
  onChange: (next: Draft) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  pending: boolean;
  submitLabel: string;
  error?: string | null;
}) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const bodyId = `${uid}-body`;
  const titleLen = draft.title.trim().length;
  const bodyLen = draft.body.trim().length;
  const canSubmit = titleLen >= 3 && bodyLen >= 5;

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = document.getElementById(titleId);
    if (el instanceof HTMLInputElement) el.focus();
  }, [titleId]);

  return (
    <form
      onSubmit={onSubmit}
      className="overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm"
    >
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/25 px-3.5 py-2.5">
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <MegaphoneIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-body-sm font-semibold text-foreground">
            {mode === "create" ? "اعلان جدید" : "ویرایش اعلان"}
          </p>
          <p className="text-micro text-muted-foreground">
            برای همه ساکنین ساختمان دیده می‌شود
          </p>
        </div>
      </div>

      <div className="space-y-3 px-3.5 py-3.5">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor={titleId}
              className="text-caption font-medium text-foreground"
            >
              عنوان
            </label>
            <span className="text-micro tabular-nums text-muted-foreground/80">
              {titleLen.toLocaleString("fa-IR")}/۱۰۰
            </span>
          </div>
          <Input
            id={titleId}
            name="announcementTitle"
            autoComplete="off"
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            placeholder="مثلاً قطعی آب فردا…"
            maxLength={100}
            className="h-11 rounded-xl"
            required
            minLength={3}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor={bodyId}
              className="text-caption font-medium text-foreground"
            >
              متن
            </label>
            <span className="text-micro tabular-nums text-muted-foreground/80">
              {bodyLen.toLocaleString("fa-IR")}/۲۰۰۰
            </span>
          </div>
          <textarea
            id={bodyId}
            name="announcementBody"
            autoComplete="off"
            value={draft.body}
            onChange={(e) => onChange({ ...draft, body: e.target.value })}
            placeholder="جزئیات اعلان برای ساکنین…"
            maxLength={2000}
            rows={5}
            required
            minLength={5}
            className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2.5 text-body-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <button
          type="button"
          aria-pressed={draft.pinned}
          onClick={() => onChange({ ...draft, pinned: !draft.pinned })}
          className={cn(
            "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-caption font-semibold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            draft.pinned
              ? "border-primary/35 bg-primary/10 text-primary"
              : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          <PinIcon className="size-3.5" />
          {draft.pinned ? "سنجاق‌شده در بالای برد" : "سنجاق در بالای برد"}
        </button>

        {error ? (
          <p
            className="rounded-xl bg-destructive-soft px-3 py-2 text-caption text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2 border-t border-border/40 bg-muted/20 p-3">
        <Button
          type="submit"
          className="h-11 flex-[1.35] rounded-xl font-semibold"
          disabled={pending || !canSubmit}
        >
          {pending ? "در حال ذخیره…" : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 rounded-xl"
          onClick={onCancel}
          disabled={pending}
        >
          انصراف
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
  const [formError, setFormError] = useState<string | null>(null);

  const activeCount = announcements.filter((a) => !a.archived).length;
  const archivedCount = announcements.filter((a) => a.archived).length;

  const visible = canMutate
    ? showArchived
      ? announcements.filter((a) => a.archived)
      : announcements.filter((a) => !a.archived)
    : announcements.filter((a) => !a.archived);

  function openCompose() {
    setEditingId(null);
    setFormError(null);
    setCreateDraft(EMPTY_DRAFT);
    setComposing(true);
  }

  function startEdit(a: BuildingAnnouncementDTO) {
    setComposing(false);
    setFormError(null);
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
    setFormError(null);
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setFormError(null);
    const title = createDraft.title.trim();
    const body = createDraft.body.trim();
    if (title.length < 3 || body.length < 5) {
      setFormError("عنوان حداقل ۳ و متن حداقل ۵ کاراکتر.");
      return;
    }

    const pinned = createDraft.pinned;
    startTransition(async () => {
      const result = await createBuildingAnnouncement({
        spaceId,
        title,
        body,
        pinned,
      });
      if (!result.ok) {
        const msg = result.error || "خطا در ثبت اطلاعات";
        setFormError(msg);
        showToast(msg, "error");
        return;
      }
      setComposing(false);
      setCreateDraft(EMPTY_DRAFT);
      setFormError(null);
      showToast("اعلان منتشر شد");
      router.refresh();
    });
  }

  function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || pending) return;
    setFormError(null);
    const title = editDraft.title.trim();
    const body = editDraft.body.trim();
    if (title.length < 3 || body.length < 5) {
      setFormError("عنوان حداقل ۳ و متن حداقل ۵ کاراکتر.");
      return;
    }

    const id = editingId;
    const pinned = editDraft.pinned;
    startTransition(async () => {
      const result = await updateBuildingAnnouncement({
        spaceId,
        announcementId: id,
        title,
        body,
        pinned,
      });
      if (!result.ok) {
        const msg = result.error || "خطا در ثبت اطلاعات";
        setFormError(msg);
        showToast(msg, "error");
        return;
      }
      cancelEdit();
      showToast("اعلان ویرایش شد");
      router.refresh();
    });
  }

  function togglePin(a: BuildingAnnouncementDTO) {
    if (pending) return;
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
      showToast(a.pinned ? "از سنجاق برداشته شد" : "سنجاق شد");
      router.refresh();
    });
  }

  function toggleArchive(a: BuildingAnnouncementDTO) {
    if (pending) return;
    if (editingId === a.id) cancelEdit();
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
      showToast(a.archived ? "اعلان بازگردانی شد" : "اعلان بایگانی شد");
      router.refresh();
    });
  }

  const showToolbar =
    canMutate &&
    !composing &&
    (activeCount > 0 || showArchived || archivedCount > 0);

  return (
    <div className="space-y-3">
      {showToolbar ? (
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-caption text-muted-foreground">
            {showArchived
              ? archivedCount > 0
                ? `${archivedCount.toLocaleString("fa-IR")} اعلان بایگانی`
                : "بایگانی خالی"
              : `${activeCount.toLocaleString("fa-IR")} اعلان فعال`}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {(archivedCount > 0 || showArchived) && (
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
            )}
            {!showArchived && activeCount > 0 ? (
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
          mode="create"
          draft={createDraft}
          onChange={setCreateDraft}
          onCancel={() => {
            setComposing(false);
            setCreateDraft(EMPTY_DRAFT);
            setFormError(null);
          }}
          onSubmit={onCreate}
          pending={pending}
          submitLabel="انتشار"
          error={formError}
        />
      ) : null}

      {visible.length === 0 && !(canMutate && composing) ? (
        <div className="rounded-2xl border border-dashed border-border/55 bg-muted/15 px-4 py-8 text-center">
          <span
            aria-hidden
            className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"
          >
            <MegaphoneIcon className="size-5" />
          </span>
          <p className="mt-3 text-body-sm font-semibold text-foreground">
            {canMutate
              ? showArchived
                ? "بایگانی خالی است"
                : "هنوز اعلانی نیست"
              : "اعلانی از مدیر ساختمان نیست"}
          </p>
          <p className="mx-auto mt-1 max-w-64 text-caption leading-relaxed text-muted-foreground">
            {canMutate && !showArchived
              ? "خبر مهم ساختمان را برای ساکنین منتشر کنید."
              : showArchived
                ? "اعلان‌های بایگانی‌شده اینجا دیده می‌شوند."
                : "وقتی مدیر اعلان بگذارد، اینجا نمایش داده می‌شود."}
          </p>
          {canMutate && !showArchived ? (
            <Button
              type="button"
              className="mt-4 h-11 rounded-xl px-5 text-caption font-semibold"
              onClick={openCompose}
            >
              <PlusIcon className="size-3.5" />
              نوشتن اعلان
            </Button>
          ) : null}
        </div>
      ) : composing ? null : (
        <ul className="space-y-2.5">
          {visible.map((a) =>
            editingId === a.id ? (
              <li key={a.id}>
                <AnnouncementEditor
                  mode="edit"
                  draft={editDraft}
                  onChange={setEditDraft}
                  onCancel={cancelEdit}
                  onSubmit={onSaveEdit}
                  pending={pending}
                  submitLabel="ذخیره"
                  error={formError}
                />
              </li>
            ) : (
              <li
                key={a.id}
                className={cn(
                  "rounded-2xl border bg-card px-3.5 py-3 transition-shadow [content-visibility:auto] [contain-intrinsic-size:auto_7rem]",
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
                      <h3 className="text-pretty text-body-sm font-semibold leading-snug text-foreground">
                        {a.title}
                      </h3>
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
