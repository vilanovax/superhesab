"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  confirmChargeProofUpload,
  createChargeProofUploadIntent,
  getChargeProofDownloadUrl,
  type ChargePaymentProofDTO,
} from "@/app/actions/building";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { monthLabelFa } from "@/lib/building";
import { formatDateFaShort, type SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const STATUS_FA = {
  PENDING: "در انتظار مدیر",
  APPROVED: "تایید شده",
  REJECTED: "رد شده",
} as const;

type ResidentPaymentProofProps = {
  spaceId: string;
  unitId: string;
  year: number;
  throughMonth: number;
  currency: SpaceCurrency;
  proofs: ChargePaymentProofDTO[];
};

export function ResidentPaymentProof({
  spaceId,
  unitId,
  year,
  throughMonth,
  currency,
  proofs,
}: ResidentPaymentProofProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [month, setMonth] = useState(
    Math.max(1, Math.min(throughMonth || 1, 12)),
  );
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const months = Array.from({ length: Math.max(throughMonth, 0) }, (_, i) => i + 1);

  function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      showToast("فایل رسید را انتخاب کنید", "error");
      return;
    }
    if (!ALLOWED.has(file.type)) {
      showToast("فقط jpg/png/webp/pdf", "error");
      return;
    }

    const selected = file;
    startTransition(async () => {
      const intent = await createChargeProofUploadIntent({
        spaceId,
        unitId,
        year,
        month,
        mimeType: selected.type as
          | "image/jpeg"
          | "image/png"
          | "image/webp"
          | "application/pdf",
        byteSize: selected.size,
        amount: Math.trunc(amount) || undefined,
        note: note.trim() || null,
      });
      if (!intent.ok) {
        showToast(intent.error, "error");
        return;
      }

      const put = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selected.type,
          "Content-Length": String(selected.size),
        },
        body: selected,
      });
      if (!put.ok) {
        showToast("آپلود فایل ناموفق بود", "error");
        return;
      }

      const confirmed = await confirmChargeProofUpload({
        spaceId,
        proofId: intent.proofId,
      });
      if (!confirmed.ok) {
        showToast(confirmed.error, "error");
        return;
      }

      setFile(null);
      setNote("");
      showToast("رسید ارسال شد");
      router.refresh();
    });
  }

  function download(proofId: string) {
    startTransition(async () => {
      const result = await getChargeProofDownloadUrl(spaceId, proofId);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={onUpload}
        className="space-y-2.5 rounded-2xl border border-border/55 bg-card p-3.5"
      >
        <p className="text-body-sm font-semibold text-foreground">ارسال رسید</p>
        <p className="text-caption text-muted-foreground">
          عکس یا PDF رسید پرداخت را برای تایید مدیر بفرستید.
        </p>
        {months.length === 0 ? (
          <p className="text-caption text-muted-foreground">
            هنوز ماهی برای ارسال رسید فعال نیست.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-label text-muted-foreground">ماه</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-body-sm"
                >
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {monthLabelFa(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-label text-muted-foreground">مبلغ</label>
                <MoneyInput
                  value={amount}
                  onValueChange={setAmount}
                  className="h-11 rounded-xl font-semibold"
                />
              </div>
            </div>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="h-11 rounded-xl text-caption file:me-2"
            />
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="یادداشت اختیاری"
              maxLength={200}
              className="h-11 rounded-xl"
            />
            <Button
              type="submit"
              className="h-11 w-full rounded-xl"
              disabled={pending || !file || months.length === 0}
            >
              {pending ? "…" : "ارسال رسید"}
            </Button>
          </>
        )}
      </form>

      {proofs.length > 0 ? (
        <ul className="space-y-2">
          {proofs.map((p) => (
            <li
              key={p.id}
              className={cn(
                "rounded-2xl border bg-card px-3.5 py-3",
                p.status === "PENDING"
                  ? "border-amber-500/30"
                  : p.status === "APPROVED"
                    ? "border-emerald-500/25"
                    : "border-border/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-body-sm font-semibold text-foreground">
                    {monthLabelFa(p.month)} · {STATUS_FA[p.status]}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {formatCurrency(p.amount, currency)} ·{" "}
                    {formatDateFaShort(p.createdAt)}
                  </p>
                  {p.reviewNote ? (
                    <p className="mt-1 text-caption text-muted-foreground">
                      یادداشت مدیر: {p.reviewNote}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-caption"
                  disabled={pending}
                  onClick={() => download(p.id)}
                >
                  فایل
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
