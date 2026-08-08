"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  permanentlyDeleteSpace,
  restoreSpace,
} from "@/app/actions/space";
import {
  SpaceTypeIcon,
  spaceTypeTint,
} from "@/components/spaces/space-type-icon";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { formatDateFaShort } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui-store";
import { getTemplate } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";
import type { SpaceType } from "@/types";

export type ArchivedSpaceRow = {
  id: string;
  name: string;
  type: SpaceType;
  archivedAt: string;
  memberCount: number;
  expenseCount: number;
  canManage: boolean;
};

type FilterType = "ALL" | SpaceType;

/**
 * Archived ledgers — restore / permanent delete (owner only).
 * Matches home list visual language (icon tint + dense meta).
 */
export function ArchivedSpacesList({ spaces }: { spaces: ArchivedSpaceRow[] }) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");

  const restoreTarget = spaces.find((s) => s.id === restoreId);
  const deleteTarget = spaces.find((s) => s.id === deleteId);

  const typeOptions = useMemo(() => {
    const seen = new Set<SpaceType>();
    const order: SpaceType[] = [];
    for (const s of spaces) {
      if (!seen.has(s.type)) {
        seen.add(s.type);
        order.push(s.type);
      }
    }
    return order;
  }, [spaces]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return spaces.filter((s) => {
      if (typeFilter !== "ALL" && s.type !== typeFilter) return false;
      if (!q) return true;
      const label = getTemplate(s.type).label.toLowerCase();
      return s.name.toLowerCase().includes(q) || label.includes(q);
    });
  }, [spaces, query, typeFilter]);

  const showSearch = spaces.length >= 5;
  const showTypeFilter = typeOptions.length > 1;

  function onRestore() {
    if (!restoreId) return;
    const id = restoreId;
    const name = restoreTarget?.name;
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await restoreSpace(id);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRestoreId(null);
      showToast(name ? `«${name}» بازگردانی شد` : "دفتر بازگردانی شد");
      router.refresh();
    });
  }

  function onDelete() {
    if (!deleteId) return;
    const id = deleteId;
    const name = deleteTarget?.name;
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await permanentlyDeleteSpace(id);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDeleteId(null);
      showToast(name ? `«${name}» برای همیشه حذف شد` : "دفتر حذف شد");
      router.refresh();
    });
  }

  if (spaces.length === 0) {
    return (
      <div className="animate-fade-up flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/50 px-5 py-14 text-center">
        <span
          aria-hidden
          className="flex size-14 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground"
        >
          <ArchiveGlyph className="size-7" />
        </span>
        <p className="mt-4 text-body font-bold text-foreground">
          آرشیو خالی است
        </p>
        <p className="mt-1.5 max-w-[16rem] text-caption leading-relaxed text-muted-foreground">
          وقتی دفتری را آرشیو کنید اینجا می‌آید. حذف دائمی فقط از همین صفحه
          ممکن است.
        </p>
        <Button asChild className="mt-5 h-11 rounded-xl px-5">
          <Link href="/app">بازگشت به خانه</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {(showSearch || showTypeFilter) && (
        <div className="mb-3 space-y-2.5">
          {showSearch ? (
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی نام دفتر…"
              className="h-11 rounded-xl"
              aria-label="جستجو در آرشیو"
            />
          ) : null}
          {showTypeFilter ? (
            <div
              role="tablist"
              aria-label="فیلتر نوع دفتر"
              className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <FilterChip
                active={typeFilter === "ALL"}
                onClick={() => setTypeFilter("ALL")}
                label={`همه (${spaces.length.toLocaleString("fa-IR")})`}
              />
              {typeOptions.map((t) => {
                const n = spaces.filter((s) => s.type === t).length;
                return (
                  <FilterChip
                    key={t}
                    active={typeFilter === t}
                    onClick={() => setTypeFilter(t)}
                    label={`${getTemplate(t).label} (${n.toLocaleString("fa-IR")})`}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/55 bg-card/60 px-4 py-10 text-center">
          <p className="text-body-sm font-semibold text-foreground">
            نتیجه‌ای نیست
          </p>
          <p className="mt-1 text-caption text-muted-foreground">
            فیلتر یا جستجو را عوض کنید.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setTypeFilter("ALL");
            }}
            className="mt-3 text-caption font-semibold text-primary"
          >
            پاک کردن فیلتر
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5" aria-label="دفاتر آرشیوشده">
          {filtered.map((space, index) => {
            const template = getTemplate(space.type);
            const rowBusy = pending && busyId === space.id;
            return (
              <li
                key={space.id}
                className={cn(
                  "animate-fade-up rounded-[1.25rem] border border-border/45 bg-card px-3.5 py-3.5 shadow-sm",
                  "[content-visibility:auto] [contain-intrinsic-size:auto_8rem]",
                  rowBusy && "opacity-70",
                )}
                style={{
                  animationDelay: `${Math.min(index, 6) * 40}ms`,
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-2xl",
                      spaceTypeTint(space.type),
                    )}
                  >
                    <SpaceTypeIcon type={space.type} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-foreground">
                      {space.name}
                    </p>
                    <p className="mt-0.5 truncate text-caption text-muted-foreground">
                      {template.label}
                      {" · "}
                      {space.memberCount.toLocaleString("fa-IR")} عضو
                      {" · "}
                      {space.expenseCount.toLocaleString("fa-IR")} هزینه
                    </p>
                    <p className="mt-1 text-[11px] tabular-nums text-muted-foreground/90">
                      آرشیو {formatDateFaShort(space.archivedAt)}
                    </p>
                  </div>
                </div>

                {space.canManage ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      className="h-10 flex-1 rounded-xl text-body-sm font-semibold active:scale-[0.98]"
                      disabled={pending}
                      aria-label={`بازگردانی «${space.name}»`}
                      onClick={() => {
                        setError(null);
                        setRestoreId(space.id);
                      }}
                    >
                      بازگردانی
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 flex-1 rounded-xl border-destructive/30 text-body-sm font-semibold text-destructive hover:bg-destructive/8 hover:text-destructive active:scale-[0.98]"
                      disabled={pending}
                      aria-label={`حذف دائمی «${space.name}»`}
                      onClick={() => {
                        setError(null);
                        setDeleteId(space.id);
                      }}
                    >
                      حذف دائمی
                    </Button>
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-muted/40 px-3 py-2 text-caption text-muted-foreground">
                    فقط مالک می‌تواند بازگرداند یا حذف کند.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(restoreId)}
        onOpenChange={(open) => {
          if (!open && !pending) setRestoreId(null);
        }}
        title="بازگردانی دفتر"
        description={
          restoreTarget
            ? `دفتر «${restoreTarget.name}» دوباره در فضاهای فعال دیده می‌شود.`
            : ""
        }
        confirmLabel="بازگردانی"
        pending={pending}
        error={error}
        onConfirm={onRestore}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open && !pending) setDeleteId(null);
        }}
        title="حذف دائمی"
        description={
          deleteTarget
            ? `دفتر «${deleteTarget.name}» و همه هزینه‌ها، شارژها و داده‌هایش برای همیشه پاک می‌شود. این کار قابل بازگشت نیست.`
            : ""
        }
        confirmLabel="حذف برای همیشه"
        pending={pending}
        error={error}
        destructive
        onConfirm={onDelete}
      />
    </>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-caption font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function ArchiveGlyph({ className }: { className?: string }) {
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
      <rect x="3" y="4" width="18" height="4" rx="1.5" />
      <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4" />
    </svg>
  );
}
