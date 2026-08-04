"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  exportAccountBackup,
  exportSpaceBackup,
  restoreBackupFile,
} from "@/app/actions/backup";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

type AccountPending = "export" | "restore" | null;

/** App settings — account export + restore from file */
export function AccountBackupPanel({ className }: AccountBackupPanelProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingKind, setPendingKind] = useState<AccountPending>(null);
  const [pending, startTransition] = useTransition();
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onExport() {
    setError(null);
    setMessage(null);
    setPendingKind("export");
    startTransition(async () => {
      try {
        const data = await exportAccountBackup();
        const stamp = new Date().toISOString().slice(0, 10);
        downloadJson(data, `superhesab-backup-${stamp}.json`);
        setMessage(
          data.spaces.length === 0
            ? "فایل خالی دانلود شد (دفتر مالکی ندارید)."
            : `بک‌آپ ${data.spaces.length} دفتر دانلود شد.`,
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
          `${result.data.spaces.length} دفتر بازیابی شد: ${names}${warn}`,
        );
        router.refresh();
      } catch {
        setError("خواندن فایل ناموفق بود. JSON معتبر انتخاب کنید.");
      } finally {
        setPendingKind(null);
      }
    });
  }

  const exportBusy = pending && pendingKind === "export";
  const restoreBusy = pending && pendingKind === "restore";

  return (
    <div className={cn("space-y-2.5", className)}>
      <section className="rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm">
        <h2 className="text-body-sm font-semibold text-foreground">بک‌آپ</h2>
        <p className="mt-0.5 text-caption leading-snug text-muted-foreground">
          دانلود JSON دفاتری که مالکی؛ بازیابی همیشه دفتر جدید می‌سازد.
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-xl text-caption"
            disabled={pending}
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

type SpaceBackupButtonProps = {
  spaceId: string;
  spaceName: string;
};

/** Space settings — OWNER single-space export */
export function SpaceBackupButton({
  spaceId,
  spaceName,
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
