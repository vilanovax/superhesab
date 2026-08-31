"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  exportAccountBackup,
  exportSpaceBackup,
  listOwnedSpacesForBackup,
  restoreBackupFile,
  type OwnedBackupSpaceDTO,
} from "@/app/actions/backup";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SpaceType } from "@/types";
import { cn } from "@/lib/utils";

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type AccountBackupPanelProps = {
  className?: string;
};

type AccountPending = "export" | "restore" | "list" | null;

type TypeFilter = "all" | SpaceType;

/** App settings — account export + restore from file */
export function AccountBackupPanel({ className }: AccountBackupPanelProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [spaces, setSpaces] = useState<OwnedBackupSpaceDTO[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [listLoaded, setListLoaded] = useState(false);
  const [pendingKind, setPendingKind] = useState<AccountPending>(null);
  const [pending, startTransition] = useTransition();
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPendingKind("list");
    startTransition(async () => {
      try {
        const rows = await listOwnedSpacesForBackup();
        if (cancelled) return;
        setSpaces(rows);
        setSelected(new Set(rows.map((s) => s.id)));
        setListLoaded(true);
      } catch {
        if (!cancelled) {
          setError("بارگذاری لیست دفاتر ناموفق بود.");
          setListLoaded(true);
        }
      } finally {
        if (!cancelled) setPendingKind(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const typeOptions = useMemo(() => {
    const map = new Map<SpaceType, { type: SpaceType; label: string; n: number }>();
    for (const s of spaces) {
      const cur = map.get(s.type);
      if (cur) cur.n += 1;
      else map.set(s.type, { type: s.type, label: s.typeLabel, n: 1 });
    }
    return [...map.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "fa"),
    );
  }, [spaces]);

  const visibleSpaces = useMemo(() => {
    if (typeFilter === "all") return spaces;
    return spaces.filter((s) => s.type === typeFilter);
  }, [spaces, typeFilter]);

  const selectedCount = selected.size;
  const visibleSelectedCount = visibleSpaces.filter((s) =>
    selected.has(s.id),
  ).length;
  const allVisibleSelected =
    visibleSpaces.length > 0 && visibleSelectedCount === visibleSpaces.length;

  function toggleSpace(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const s of visibleSpaces) next.delete(s.id);
      } else {
        for (const s of visibleSpaces) next.add(s.id);
      }
      return next;
    });
  }

  function selectByType(type: TypeFilter) {
    setTypeFilter(type);
    if (type === "all") {
      setSelected(new Set(spaces.map((s) => s.id)));
      return;
    }
    setSelected(new Set(spaces.filter((s) => s.type === type).map((s) => s.id)));
  }

  function onExport() {
    setError(null);
    setMessage(null);
    if (selectedCount === 0) {
      setError("حداقل یک دفتر را انتخاب کنید.");
      return;
    }
    setPendingKind("export");
    startTransition(async () => {
      try {
        const result = await exportAccountBackup({
          spaceIds: [...selected],
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const stamp = new Date().toISOString().slice(0, 10);
        downloadJson(result.data, `superhesab-backup-${stamp}.json`);
        setMessage(
          result.data.spaces.length === 0
            ? "فایل خالی دانلود شد."
            : `بک‌آپ ${result.data.spaces.length.toLocaleString("fa-IR")} دفتر دانلود شد.`,
        );
      } catch {
        setError("خروجی بک‌آپ ناموفق بود.");
      } finally {
        setPendingKind(null);
      }
    });
  }

  function onConfirmRestore() {
    setConfirmRestore(false);
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setMessage(null);
    setPendingKind("restore");
    startTransition(async () => {
      try {
        const text = await file.text();
        const raw = JSON.parse(text) as unknown;
        const result = await restoreBackupFile(raw);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const names = result.data.spaces.map((s) => s.name).join("، ");
        const warn =
          result.data.warnings.length > 0
            ? ` · توجه: ${result.data.warnings[0]}`
            : "";
        setMessage(
          `${result.data.spaces.length.toLocaleString("fa-IR")} دفتر بازیابی شد: ${names}${warn}`,
        );
        router.refresh();
        const rows = await listOwnedSpacesForBackup();
        setSpaces(rows);
        setSelected(new Set(rows.map((s) => s.id)));
      } catch {
        setError("خواندن فایل ناموفق بود. JSON معتبر انتخاب کنید.");
      } finally {
        setPendingKind(null);
      }
    });
  }

  const exportBusy = pending && pendingKind === "export";
  const restoreBusy = pending && pendingKind === "restore";
  const listBusy = pending && pendingKind === "list";

  return (
    <div className={cn("space-y-2.5", className)}>
      <section className="rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm">
        <h2 className="text-body-sm font-semibold text-foreground">بک‌آپ</h2>
        <p className="mt-0.5 text-caption leading-snug text-muted-foreground">
          دفاتر مالک را انتخاب کنید؛ بازیابی همیشه دفتر جدید می‌سازد.
        </p>

        {listBusy && !listLoaded ? (
          <div className="mt-3 h-24 animate-pulse rounded-xl bg-muted/40" />
        ) : spaces.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border/50 px-3 py-4 text-center text-caption text-muted-foreground">
            دفتر مالکی برای بک‌آپ ندارید.
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            <div
              role="radiogroup"
              aria-label="فیلتر قالب"
              className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 scrollbar-none"
            >
              <FilterChip
                label={`همه (${spaces.length.toLocaleString("fa-IR")})`}
                active={typeFilter === "all"}
                onClick={() => selectByType("all")}
              />
              {typeOptions.map((opt) => (
                <FilterChip
                  key={opt.type}
                  label={`${opt.label} (${opt.n.toLocaleString("fa-IR")})`}
                  active={typeFilter === opt.type}
                  onClick={() => selectByType(opt.type)}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="text-[11px] font-semibold text-primary"
                onClick={toggleAllVisible}
              >
                {allVisibleSelected ? "لغو انتخاب این لیست" : "انتخاب همهٔ این لیست"}
              </button>
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {selectedCount.toLocaleString("fa-IR")} انتخاب‌شده
              </p>
            </div>

            <ul className="max-h-52 divide-y divide-border/35 overflow-y-auto rounded-xl border border-border/40">
              {visibleSpaces.map((space) => {
                const on = selected.has(space.id);
                return (
                  <li key={space.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 px-2.5 py-2 transition-colors",
                        on ? "bg-primary/5" : "hover:bg-muted/30",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleSpace(space.id)}
                        className="size-4 shrink-0 rounded border-border accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-caption font-semibold text-foreground">
                          {space.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {space.typeLabel}
                          {space.archived ? " · آرشیو" : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-xl text-caption"
            disabled={pending || spaces.length === 0 || selectedCount === 0}
            onClick={onExport}
          >
            {exportBusy ? "در حال دانلود…" : "دانلود"}
          </Button>
          <Button
            type="button"
            className="h-10 w-full rounded-xl text-caption"
            disabled={pending}
            onClick={() => {
              setError(null);
              setMessage(null);
              setConfirmRestore(true);
            }}
          >
            {restoreBusy ? "در حال بازیابی…" : "بازیابی"}
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="انتخاب فایل بک‌آپ JSON"
          onChange={onFileChange}
        />
        {message ? (
          <p
            className="mt-2 text-caption text-success"
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}
        {error ? (
          <p
            className="mt-2 text-caption text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        ) : null}
      </section>

      <ConfirmDialog
        open={confirmRestore}
        onOpenChange={setConfirmRestore}
        title="بازیابی از فایل بک‌آپ"
        description="دفترهای داخل فایل به‌صورت دفتر جدید ساخته می‌شوند و جایگزین دفترهای فعلی نمی‌شوند. ادامه می‌دهید؟"
        confirmLabel="انتخاب فایل"
        cancelLabel="انصراف"
        onConfirm={onConfirmRestore}
      />
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors active:scale-95",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

type SpaceBackupButtonProps = {
  spaceId: string;
  spaceName: string;
  /** panel = full card (default); compact = button only inside a parent card */
  variant?: "panel" | "compact";
};

/** Space settings — OWNER single-space export */
export function SpaceBackupButton({
  spaceId,
  spaceName,
  variant = "panel",
}: SpaceBackupButtonProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onExport() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await exportSpaceBackup(spaceId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      const safe = spaceName.replace(/[^\w\u0600-\u06FF-]+/g, "-").slice(0, 40);
      downloadJson(result.data, `superhesab-${safe}-${stamp}.json`);
      setMessage("بک‌آپ این دفتر دانلود شد.");
    });
  }

  if (variant === "compact") {
    return (
      <div className="space-y-1">
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full rounded-xl text-caption"
          disabled={pending}
          onClick={onExport}
        >
          {pending ? "در حال دانلود…" : "دانلود بک‌آپ"}
        </Button>
        {message ? (
          <p
            className="text-[11px] text-success"
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}
        {error ? (
          <p
            className="text-[11px] text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      <h2 className="text-body-sm font-semibold text-foreground">
        بک‌آپ این دفتر
      </h2>
      <p className="mt-0.5 text-caption text-muted-foreground">
        JSON کامل برای بازیابی به‌صورت دفتر جدید از تنظیمات اپ
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-3 h-11 w-full rounded-xl"
        disabled={pending}
        onClick={onExport}
      >
        {pending ? "در حال دانلود…" : "دانلود بک‌آپ دفتر"}
      </Button>
      {message ? (
        <p
          className="mt-2 text-caption text-success"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          className="mt-2 text-caption text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
