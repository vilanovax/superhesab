"use client";

import { useRouter } from "next/navigation";
import {
  useId,
  useState,
  useTransition,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  createBuildingContact,
  deleteBuildingContact,
  reorderBuildingContacts,
  updateBuildingContact,
  type BuildingContactCategoryValue,
  type BuildingContactDTO,
} from "@/app/actions/building-contacts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<BuildingContactCategoryValue, string> = {
  EMERGENCY: "اورژانس",
  FACILITIES: "تأسیسات",
  CONTRACTOR: "پیمانکار",
  ADMIN: "اداری",
  OTHER: "سایر",
};

const CATEGORY_TONE: Record<BuildingContactCategoryValue, string> = {
  EMERGENCY: "bg-destructive/10 text-destructive",
  FACILITIES: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  CONTRACTOR: "bg-amber-500/12 text-amber-800 dark:text-amber-300",
  ADMIN: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  OTHER: "bg-muted text-muted-foreground",
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [
  BuildingContactCategoryValue,
  string,
][];

const QUICK_START: {
  title: string;
  category: BuildingContactCategoryValue;
}[] = [
  { title: "آتش‌نشانی", category: "EMERGENCY" },
  { title: "نگهبانی", category: "ADMIN" },
  { title: "آسانسور", category: "FACILITIES" },
  { title: "برق اضطراری", category: "FACILITIES" },
];

type Draft = {
  title: string;
  phone: string;
  category: BuildingContactCategoryValue;
  note: string;
  pinned: boolean;
  visibleToResidents: boolean;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  phone: "",
  category: "OTHER",
  note: "",
  pinned: false,
  visibleToResidents: false,
};

type BuildingContactsPanelProps = {
  spaceId: string;
  contacts: BuildingContactDTO[];
  canMutate: boolean;
};

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.74-1.27a2 2 0 0 1 2.11-.45c.74.34 1.53.57 2.34.7A2 2 0 0 1 22 16.92z"
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9l.8-12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 19V5M6 11l6-6 6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 5v14M6 13l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ResidentsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function toTelHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "#";
}

function phoneLooksValid(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 3;
}

type ContactComposerProps = {
  formId: string;
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft>>;
  editingId: string | null;
  pending: boolean;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
};

function ContactComposer({
  formId,
  draft,
  setDraft,
  editingId,
  pending,
  onSubmit,
  onClose,
}: ContactComposerProps) {
  const titleOk = draft.title.trim().length > 0;
  const phoneOk = phoneLooksValid(draft.phone);
  const canSubmit = titleOk && phoneOk && !pending;
  const previewTitle = draft.title.trim() || "عنوان شماره";
  const previewPhone = draft.phone.trim() || "۰۹…";

  return (
    <form
      id={formId}
      onSubmit={onSubmit}
      className="animate-fade-up overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-md ring-1 ring-primary/10"
    >
      <div className="flex items-center gap-2.5 border-b border-border/40 bg-primary/[0.04] px-3 py-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <PhoneIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-bold text-foreground">
            {editingId ? "ویرایش شماره" : "افزودن شماره"}
          </p>
          <p className="text-micro text-muted-foreground">
            {editingId
              ? "تغییرات را ذخیره کنید"
              : "عنوان و تماس کافی است — بقیه اختیاری"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-xl"
          onClick={onClose}
          disabled={pending}
          aria-label="بستن فرم"
        >
          <CloseIcon className="size-4" />
        </Button>
      </div>

      <div className="space-y-4 p-3.5">
        {/* Live preview */}
        <div
          aria-hidden
          className="rounded-xl border border-dashed border-border/55 bg-muted/20 px-3 py-2.5"
        >
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground">
            پیش‌نمایش
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-body-sm font-bold text-foreground">
              {previewTitle}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                CATEGORY_TONE[draft.category],
              )}
            >
              {CATEGORY_LABELS[draft.category]}
            </span>
            {draft.pinned ? (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                سنجاق
              </span>
            ) : null}
            {draft.visibleToResidents ? (
              <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                ساکن
              </span>
            ) : null}
          </div>
          <p
            dir="ltr"
            className="mt-1 text-start font-mono text-caption font-semibold tabular-nums tracking-wide text-primary"
          >
            {previewPhone}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-title`}>عنوان</Label>
          <Input
            id={`${formId}-title`}
            value={draft.title}
            onChange={(e) =>
              setDraft((d) => ({ ...d, title: e.target.value }))
            }
            placeholder="مثلاً آتش‌نشانی"
            required
            maxLength={80}
            disabled={pending}
            autoFocus
            className="h-11 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor={`${formId}-phone`}>شماره تماس</Label>
            {draft.phone.trim() && !phoneOk ? (
              <span className="text-[10px] font-medium text-destructive">
                شماره کوتاه است
              </span>
            ) : null}
          </div>
          <div
            className={cn(
              "flex h-11 items-center gap-2 rounded-xl border bg-background px-3 transition-[box-shadow,border-color]",
              "focus-within:border-ring focus-within:ring-2 focus-within:ring-primary/40",
              draft.phone.trim() && !phoneOk
                ? "border-destructive/50"
                : "border-input",
            )}
          >
            <PhoneIcon className="size-4 shrink-0 text-muted-foreground" />
            <input
              id={`${formId}-phone`}
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={draft.phone}
              onChange={(e) =>
                setDraft((d) => ({ ...d, phone: e.target.value }))
              }
              placeholder="021… یا 09…"
              required
              maxLength={40}
              disabled={pending}
              className="min-w-0 flex-1 bg-transparent text-start font-mono text-body-sm tabular-nums tracking-wide outline-none placeholder:font-sans placeholder:tracking-normal disabled:opacity-70"
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-caption font-medium text-foreground">دسته</p>
          <div
            role="radiogroup"
            aria-label="دسته شماره"
            className="flex flex-wrap gap-1.5"
          >
            {CATEGORY_OPTIONS.map(([value, label]) => {
              const selected = draft.category === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={pending}
                  onClick={() =>
                    setDraft((d) => ({ ...d, category: value }))
                  }
                  className={cn(
                    "rounded-full px-3 py-1.5 text-caption font-semibold transition-[transform,background-color,box-shadow] active:scale-[0.97] disabled:opacity-50",
                    selected
                      ? cn("ring-2 ring-primary/30", CATEGORY_TONE[value])
                      : "bg-muted/60 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-note`}>توضیح کوتاه</Label>
          <Input
            id={`${formId}-note`}
            value={draft.note}
            onChange={(e) =>
              setDraft((d) => ({ ...d, note: e.target.value }))
            }
            placeholder="مثلاً شیفت شب یا واحد فنی"
            maxLength={200}
            disabled={pending}
            className="h-11 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              setDraft((d) => ({ ...d, pinned: !d.pinned }))
            }
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors active:scale-[0.99] disabled:opacity-50",
              draft.pinned
                ? "border-primary/30 bg-primary/8"
                : "border-border/50 bg-muted/15 hover:bg-muted/30",
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                draft.pinned
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <PinIcon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-caption font-semibold text-foreground">
                سنجاق در بالای لیست
              </span>
              <span className="mt-0.5 block text-micro text-muted-foreground">
                برای شماره‌های پرکاربرد
              </span>
            </span>
            <Checkbox
              checked={draft.pinned}
              tabIndex={-1}
              aria-hidden
              className="pointer-events-none"
            />
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={() =>
              setDraft((d) => ({
                ...d,
                visibleToResidents: !d.visibleToResidents,
              }))
            }
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors active:scale-[0.99] disabled:opacity-50",
              draft.visibleToResidents
                ? "border-emerald-500/30 bg-emerald-500/8"
                : "border-border/50 bg-muted/15 hover:bg-muted/30",
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                draft.visibleToResidents
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <ResidentsIcon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-caption font-semibold text-foreground">
                نمایش در پرتال ساکن
              </span>
              <span className="mt-0.5 block text-micro text-muted-foreground">
                فقط اگر لازم است ساکن ببیند
              </span>
            </span>
            <Checkbox
              checked={draft.visibleToResidents}
              tabIndex={-1}
              aria-hidden
              className="pointer-events-none"
            />
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-t border-border/40 bg-muted/15 p-3">
        <Button
          type="submit"
          className="h-11 flex-1 rounded-xl text-caption font-semibold active:scale-[0.98]"
          disabled={!canSubmit}
        >
          {pending
            ? "در حال ذخیره…"
            : editingId
              ? "ذخیره تغییرات"
              : "ثبت شماره"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 min-w-[5.5rem] rounded-xl text-caption font-semibold"
          onClick={onClose}
          disabled={pending}
        >
          انصراف
        </Button>
      </div>
    </form>
  );
}

export function BuildingContactsPanel({
  spaceId,
  contacts,
  canMutate,
}: BuildingContactsPanelProps) {
  const router = useRouter();
  const formId = useId();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const visibleCount = contacts.filter((c) => c.visibleToResidents).length;
  const pinnedCount = contacts.filter((c) => c.pinned).length;

  function openCreate(preset?: {
    title?: string;
    category?: BuildingContactCategoryValue;
  }) {
    setEditingId(null);
    setDraft({
      ...EMPTY_DRAFT,
      title: preset?.title ?? "",
      category: preset?.category ?? "OTHER",
      visibleToResidents: preset?.category === "EMERGENCY",
    });
    setComposerOpen(true);
  }

  function openEdit(contact: BuildingContactDTO) {
    setEditingId(contact.id);
    setDraft({
      title: contact.title,
      phone: contact.phone,
      category: contact.category,
      note: contact.note ?? "",
      pinned: contact.pinned,
      visibleToResidents: contact.visibleToResidents,
    });
    setComposerOpen(true);
  }

  function closeComposer() {
    setComposerOpen(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  function submitDraft(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        spaceId,
        title: draft.title,
        phone: draft.phone,
        category: draft.category,
        note: draft.note.trim() || null,
        pinned: draft.pinned,
        visibleToResidents: draft.visibleToResidents,
      };
      const result = editingId
        ? await updateBuildingContact({
            ...payload,
            contactId: editingId,
          })
        : await createBuildingContact(payload);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast(editingId ? "شماره به‌روز شد." : "شماره اضافه شد.");
      closeComposer();
      router.refresh();
    });
  }

  function togglePin(contact: BuildingContactDTO) {
    startTransition(async () => {
      const result = await updateBuildingContact({
        spaceId,
        contactId: contact.id,
        pinned: !contact.pinned,
      });
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      router.refresh();
    });
  }

  function removeContact(contact: BuildingContactDTO) {
    if (!window.confirm(`حذف «${contact.title}»؟`)) return;
    startTransition(async () => {
      const result = await deleteBuildingContact({
        spaceId,
        contactId: contact.id,
      });
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast("شماره حذف شد.");
      router.refresh();
    });
  }

  function moveContact(contactId: string, direction: -1 | 1) {
    const ids = contacts.map((c) => c.id);
    const index = ids.indexOf(contactId);
    const swap = index + direction;
    if (index < 0 || swap < 0 || swap >= ids.length) return;
    const next = [...ids];
    const tmp = next[index]!;
    next[index] = next[swap]!;
    next[swap] = tmp;
    startTransition(async () => {
      const result = await reorderBuildingContacts({
        spaceId,
        orderedIds: next,
      });
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      router.refresh();
    });
  }

  const usedTitles = new Set(contacts.map((c) => c.title.trim()));
  const quickSuggestions = QUICK_START.filter((q) => !usedTitles.has(q.title));

  return (
    <div className="animate-fade-up space-y-3 pb-2">
      {canMutate && contacts.length > 0 && !composerOpen ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 rounded-2xl border border-border/45 bg-card px-3 py-2.5 shadow-sm">
            <p className="text-micro leading-snug text-muted-foreground">
              {contacts.length.toLocaleString("fa-IR")} شماره
              {pinnedCount > 0
                ? ` · ${pinnedCount.toLocaleString("fa-IR")} سنجاق`
                : ""}
              {visibleCount > 0
                ? ` · ${visibleCount.toLocaleString("fa-IR")} برای ساکن`
                : " · هنوز برای ساکن دیده نمی‌شود"}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-11 shrink-0 gap-1.5 rounded-xl px-3.5 active:scale-[0.97]"
            onClick={() => openCreate()}
            disabled={pending}
          >
            <PlusIcon className="size-4" />
            افزودن
          </Button>
        </div>
      ) : null}

      {composerOpen && canMutate ? (
        <ContactComposer
          formId={formId}
          draft={draft}
          setDraft={setDraft}
          editingId={editingId}
          pending={pending}
          onSubmit={submitDraft}
          onClose={closeComposer}
        />
      ) : null}

      {contacts.length === 0 && !composerOpen ? (
        <div className="overflow-hidden rounded-2xl border border-dashed border-border/55 bg-card shadow-sm">
          <div className="px-4 pb-2 pt-7 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PhoneIcon className="size-6" />
            </span>
            <p className="mt-3 text-body-sm font-bold text-foreground">
              دفترچه تماس خالی است
            </p>
            <p className="mx-auto mt-1 max-w-[16rem] text-micro leading-relaxed text-muted-foreground">
              نگهبانی، آسانسور، آتش‌نشانی و پیمانکارها را یک‌جا نگه دارید.
            </p>
            {canMutate ? (
              <Button
                type="button"
                className="mt-4 h-11 gap-1.5 rounded-xl px-5 active:scale-[0.97]"
                onClick={() => openCreate()}
                disabled={pending}
              >
                <PlusIcon className="size-4" />
                افزودن اولین شماره
              </Button>
            ) : null}
          </div>

          {canMutate && quickSuggestions.length > 0 ? (
            <div className="border-t border-border/40 bg-muted/20 px-3.5 py-3">
              <p className="text-micro font-semibold text-muted-foreground">
                شروع سریع
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quickSuggestions.map((q) => (
                  <button
                    key={q.title}
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      openCreate({ title: q.title, category: q.category })
                    }
                    className="rounded-full border border-border/50 bg-background px-3 py-1.5 text-caption font-medium text-foreground transition-colors hover:border-primary/35 hover:bg-primary/5 active:scale-[0.97] disabled:opacity-50"
                  >
                    {q.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {contacts.length > 0 ? (
        <ul className="space-y-2">
          {contacts.map((contact, index) => (
            <li
              key={contact.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-card shadow-sm transition-[box-shadow,border-color]",
                contact.pinned
                  ? "border-primary/30 ring-1 ring-primary/15"
                  : "border-border/50",
              )}
            >
              <div className="flex items-stretch gap-0">
                <div className="min-w-0 flex-1 p-3.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-body-sm font-bold text-foreground">
                      {contact.title}
                    </h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        CATEGORY_TONE[contact.category],
                      )}
                    >
                      {CATEGORY_LABELS[contact.category]}
                    </span>
                    {contact.pinned ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        <PinIcon className="size-2.5" />
                        سنجاق
                      </span>
                    ) : null}
                    {canMutate && contact.visibleToResidents ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <ResidentsIcon className="size-2.5" />
                        ساکن
                      </span>
                    ) : null}
                  </div>

                  {contact.note ? (
                    <p className="mt-1 text-micro leading-snug text-muted-foreground">
                      {contact.note}
                    </p>
                  ) : null}

                  <a
                    href={toTelHref(contact.phone)}
                    dir="ltr"
                    className="mt-2.5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary/10 px-3 text-body-sm font-bold tabular-nums tracking-wide text-primary transition-colors hover:bg-primary/15 active:scale-[0.98]"
                  >
                    <PhoneIcon className="size-3.5" />
                    {contact.phone}
                  </a>
                </div>

                {canMutate ? (
                  <div className="flex flex-col justify-center gap-0.5 border-s border-border/40 bg-muted/15 px-1 py-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      aria-label="بالا"
                      disabled={pending || index === 0}
                      onClick={() => moveContact(contact.id, -1)}
                    >
                      <ArrowUpIcon className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      aria-label="پایین"
                      disabled={pending || index === contacts.length - 1}
                      onClick={() => moveContact(contact.id, 1)}
                    >
                      <ArrowDownIcon className="size-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>

              {canMutate ? (
                <div className="flex flex-wrap gap-1 border-t border-border/40 bg-muted/10 px-2.5 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 rounded-lg px-2.5 text-caption"
                    disabled={pending}
                    onClick={() => openEdit(contact)}
                  >
                    <PencilIcon className="size-3.5" />
                    ویرایش
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 rounded-lg px-2.5 text-caption"
                    disabled={pending}
                    onClick={() => togglePin(contact)}
                  >
                    <PinIcon className="size-3.5" />
                    {contact.pinned ? "برداشتن" : "سنجاق"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ms-auto h-8 gap-1 rounded-lg px-2.5 text-caption text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={pending}
                    onClick={() => removeContact(contact)}
                  >
                    <TrashIcon className="size-3.5" />
                    حذف
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canMutate && contacts.length > 0 && !composerOpen ? (
        <p className="px-1 text-center text-micro leading-relaxed text-muted-foreground">
          فقط شماره‌هایی که «ساکن» دارند در پرتال ساکن دیده می‌شوند.
        </p>
      ) : null}
    </div>
  );
}

/** Read-only compact list for resident portal (visible contacts only). */
export function ResidentContactsCard({
  contacts,
}: {
  contacts: BuildingContactDTO[];
}) {
  if (contacts.length === 0) return null;

  return (
    <section className="animate-fade-up overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/40 px-3.5 py-2.5">
        <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <PhoneIcon className="size-4" />
        </span>
        <h2 className="text-caption font-bold text-foreground">
          شماره‌های ضروری
        </h2>
      </div>
      <ul className="divide-y divide-border/40">
        {contacts.map((contact) => (
          <li
            key={contact.id}
            className="flex items-center justify-between gap-3 px-3.5 py-3"
          >
            <div className="min-w-0">
              <p className="text-body-sm font-semibold text-foreground">
                {contact.title}
              </p>
              <p className="mt-0.5 text-micro text-muted-foreground">
                {CATEGORY_LABELS[contact.category]}
                {contact.note ? ` · ${contact.note}` : ""}
              </p>
            </div>
            <a
              href={toTelHref(contact.phone)}
              dir="ltr"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary/10 px-2.5 text-caption font-bold tabular-nums text-primary active:scale-[0.97]"
            >
              <PhoneIcon className="size-3.5" />
              {contact.phone}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
