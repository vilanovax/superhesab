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
import { AdminSection } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toAsciiDigits } from "@/lib/format";
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
      downloadJson(result.data, `superhesab-platform-${stamp()}.json`);
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
      setMessage(`کاربر: ${result.data.spaces.length} دفتر مالک دانلود شد.`);
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
      downloadJson(result.data, `superhesab-spaces-${stamp()}.json`);
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
        setMessage("خلاصه dry-run آماده است — در صورت تأیید، بازیابی را بزنید.");
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
    <div className="space-y-2.5">
      <AdminSection
        title="خروجی کامل"
        description="همه کاربران (بدون رمز) و همه دفاتر"
        tone="accent"
        className="p-3.5"
      >
        <Button
          type="button"
          className="h-10 w-full rounded-xl text-caption font-semibold"
          disabled={pending}
          onClick={onExportPlatform}
        >
          {pending ? "در حال آماده‌سازی…" : "دانلود بک‌آپ کامل"}
        </Button>
      </AdminSection>

      <AdminSection
        title="خروجی انتخابی"
        description="دفاتر یک مالک یا چند شناسه"
        className="p-3.5"
      >
        <div className="space-y-2.5">
          <div className="space-y-1">
            <Label
              htmlFor="backup-phone"
              className="text-[11px] text-muted-foreground"
            >
              موبایل مالک
            </Label>
            <div className="flex gap-1.5">
              <Input
                id="backup-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                spellCheck={false}
                dir="ltr"
                value={userPhone}
                onChange={(e) =>
                  setUserPhone(
                    toAsciiDigits(e.target.value).replace(/[^\d+]/g, ""),
                  )
                }
                placeholder="09123456789"
                className="h-9 rounded-lg tabular-nums"
              />
              <Button
                type="button"
                variant="outline"
                className="h-9 shrink-0 rounded-lg px-3 text-caption"
                disabled={pending || userPhone.trim().length < 8}
                onClick={onExportUser}
              >
                دانلود
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="backup-space-ids"
              className="text-[11px] text-muted-foreground"
            >
              شناسه دفتر(ها)
            </Label>
            <div className="flex gap-1.5">
              <Input
                id="backup-space-ids"
                name="spaceIds"
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                value={spaceIds}
                onChange={(e) => setSpaceIds(e.target.value)}
                placeholder="id1, id2…"
                className="h-9 rounded-lg font-mono text-[11px]"
              />
              <Button
                type="button"
                variant="outline"
                className="h-9 shrink-0 rounded-lg px-3 text-caption"
                disabled={pending || spaceIds.trim().length < 4}
                onClick={onExportSpaces}
              >
                دانلود
              </Button>
            </div>
          </div>
        </div>
      </AdminSection>

      <AdminSection
        title="بازیابی"
        description="dry-run سپس تأیید · دفتر جدید · شما OWNER"
        tone="danger"
        className="p-3.5"
      >
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="انتخاب فایل بک‌آپ JSON"
          onChange={onFileChange}
        />
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full rounded-xl text-caption font-semibold"
          disabled={pending}
          onClick={onPickFile}
        >
          {pending ? "در حال بررسی…" : "انتخاب فایل و dry-run"}
        </Button>

        {dryRun ? (
          <div className="mt-2.5 space-y-2 rounded-xl bg-muted/50 px-3 py-2.5 ring-1 ring-border/40">
            <p className="text-[11px] font-bold text-foreground">خلاصه dry-run</p>
            <ul className="space-y-0.5 text-[11px] text-muted-foreground">
              <li>
                محدوده:{" "}
                <span className="font-semibold text-foreground">
                  {dryRun.scope}
                </span>
              </li>
              <li>
                دفاتر{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {dryRun.spaceCount}
                </span>
                {" · "}
                هزینه{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {dryRun.expenseCount}
                </span>
              </li>
              <li>
                موبایل: {dryRun.phonesExisting} موجود / {dryRun.phonesMissing}{" "}
                غایب
              </li>
              {dryRun.spacesByType.map((t) => (
                <li key={t.type}>
                  {t.type}: {t.count}
                </li>
              ))}
            </ul>
            {dryRun.warnings.length > 0 ? (
              <ul className="space-y-0.5 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                {dryRun.warnings.map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            ) : null}
            <Button
              type="button"
              variant="destructive"
              className="h-10 w-full rounded-xl text-caption font-semibold"
              disabled={pending || dryRun.spaceCount === 0}
              onClick={onConfirmRestore}
            >
              {pending ? "در حال بازیابی…" : "تأیید و بازیابی"}
            </Button>
          </div>
        ) : null}
      </AdminSection>

      {error || message ? (
        <p
          className={cn(
            "rounded-xl px-3 py-2 text-[11px] font-medium",
            error
              ? "bg-destructive-soft text-destructive"
              : "bg-success-soft text-success",
          )}
          role={error ? "alert" : "status"}
          aria-live={error ? "assertive" : "polite"}
        >
          {error ?? message}
        </p>
      ) : null}
    </div>
  );
}
