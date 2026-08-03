"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  dryRunAdminBackupRestore,
  exportPlatformBackup,
  exportSpacesBackup,
  exportUserSpacesBackup,
  restoreAdminBackupFile,
} from "@/app/actions/admin";
import type { BackupRestoreDryRun } from "@/lib/backup/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function AdminBackupPanel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState<BackupRestoreDryRun | null>(null);
  const [pendingRaw, setPendingRaw] = useState<unknown | null>(null);
  const [userPhone, setUserPhone] = useState("");
  const [spaceIds, setSpaceIds] = useState("");

  function stamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function onExportPlatform() {
    setError(null);
    setMessage(null);
    setDryRun(null);
    startTransition(async () => {
      const result = await exportPlatformBackup();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      downloadJson(
        result.data,
        `superhesab-platform-${stamp()}.json`,
      );
      setMessage(
        `پلتفرم: ${result.data.users?.length ?? 0} کاربر · ${result.data.spaces.length} دفتر`,
      );
    });
  }

  function onExportUser() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await exportUserSpacesBackup({ phone: userPhone });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      downloadJson(
        result.data,
        `superhesab-user-${userPhone.replace(/\D/g, "") || "x"}-${stamp()}.json`,
      );
      setMessage(
        `کاربر: ${result.data.spaces.length} دفتر مالک دانلود شد.`,
      );
    });
  }

  function onExportSpaces() {
    setError(null);
    setMessage(null);
    const ids = spaceIds
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    startTransition(async () => {
      const result = await exportSpacesBackup({ spaceIds: ids });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      downloadJson(
        result.data,
        `superhesab-spaces-${stamp()}.json`,
      );
      setMessage(`${result.data.spaces.length} دفتر دانلود شد.`);
    });
  }

  function onPickFile() {
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setMessage(null);
    setDryRun(null);
    setPendingRaw(null);

    startTransition(async () => {
      try {
        const text = await file.text();
        const raw = JSON.parse(text) as unknown;
        const result = await dryRunAdminBackupRestore(raw);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setPendingRaw(raw);
        setDryRun(result.data);
        setMessage("خلاصه dry-run آماده است. در صورت تأیید، بازیابی را بزنید.");
      } catch {
        setError("خواندن فایل ناموفق بود. JSON معتبر انتخاب کنید.");
      }
    });
  }

  function onConfirmRestore() {
    if (!pendingRaw) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await restoreAdminBackupFile(pendingRaw);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const names = result.data.spaces.map((s) => s.name).join("، ");
      const warn =
        result.data.warnings.length > 0
          ? ` · ${result.data.warnings[0]}`
          : "";
      setMessage(
        `${result.data.spaces.length} دفتر بازیابی شد: ${names}${warn}`,
      );
      setDryRun(null);
      setPendingRaw(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm">
        <h2 className="text-body-sm font-semibold text-foreground">
          خروجی پلتفرم
        </h2>
        <p className="mt-0.5 text-caption text-muted-foreground">
          همه کاربران (بدون رمز) و همه دفاتر. برای بایگانی عملیاتی.
        </p>
        <Button
          type="button"
          className="mt-3 h-11 w-full rounded-xl"
          disabled={pending}
          onClick={onExportPlatform}
        >
          {pending ? "در حال آماده‌سازی…" : "دانلود بک‌آپ کامل"}
        </Button>
      </section>

      <section className="rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm">
        <h2 className="text-body-sm font-semibold text-foreground">
          خروجی انتخابی
        </h2>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="backup-phone" className="text-caption">
              دفاتر مالک یک کاربر (موبایل)
            </Label>
            <div className="flex gap-2">
              <Input
                id="backup-phone"
                dir="ltr"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="0912…"
                className="h-10 rounded-xl"
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 rounded-xl px-3"
                disabled={pending || userPhone.trim().length < 8}
                onClick={onExportUser}
              >
                دانلود
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="backup-space-ids" className="text-caption">
              شناسه دفتر(ها) — با فاصله یا ویرگول
            </Label>
            <div className="flex gap-2">
              <Input
                id="backup-space-ids"
                dir="ltr"
                value={spaceIds}
                onChange={(e) => setSpaceIds(e.target.value)}
                placeholder="cuid…"
                className="h-10 rounded-xl font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 rounded-xl px-3"
                disabled={pending || spaceIds.trim().length < 4}
                onClick={onExportSpaces}
              >
                دانلود
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm">
        <h2 className="text-body-sm font-semibold text-foreground">
          بازیابی
        </h2>
        <p className="mt-0.5 text-caption leading-relaxed text-muted-foreground">
          اول dry-run، بعد تأیید. همیشه دفتر جدید می‌سازد؛ overwrite ندارد.
          شما OWNER دفاتر بازیابی‌شده می‌شوید.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onFileChange}
        />
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-11 w-full rounded-xl"
          disabled={pending}
          onClick={onPickFile}
        >
          انتخاب فایل و dry-run
        </Button>

        {dryRun ? (
          <div className="mt-3 space-y-2 rounded-xl bg-muted/50 px-3 py-3">
            <p className="text-caption font-semibold text-foreground">
              خلاصه dry-run
            </p>
            <ul className="space-y-1 text-caption text-muted-foreground">
              <li>
                محدوده:{" "}
                <span className="font-semibold text-foreground">
                  {dryRun.scope}
                </span>
              </li>
              <li>
                دفاتر:{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {dryRun.spaceCount}
                </span>
                {" · "}
                هزینه:{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {dryRun.expenseCount}
                </span>
              </li>
              <li>
                موبایل‌ها: {dryRun.phonesExisting} موجود / {dryRun.phonesMissing}{" "}
                غایب (از {dryRun.memberPhoneCount})
              </li>
              {dryRun.spacesByType.map((t) => (
                <li key={t.type}>
                  {t.type}: {t.count}
                </li>
              ))}
            </ul>
            {dryRun.warnings.length > 0 ? (
              <ul className="space-y-1 border-t border-border/40 pt-2 text-caption text-muted-foreground">
                {dryRun.warnings.map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            ) : null}
            <Button
              type="button"
              variant="destructive"
              className="mt-2 h-11 w-full rounded-xl"
              disabled={pending || dryRun.spaceCount === 0}
              onClick={onConfirmRestore}
            >
              تأیید و بازیابی دفاتر
            </Button>
          </div>
        ) : null}
      </section>

      {error || message ? (
        <p
          className={cn(
            "rounded-xl px-3 py-2 text-caption font-medium",
            error
              ? "bg-destructive-soft text-destructive"
              : "bg-success-soft text-success",
          )}
          role="status"
        >
          {error ?? message}
        </p>
      ) : null}
    </div>
  );
}
