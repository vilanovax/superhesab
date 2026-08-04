"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  confirmFundProofUpload,
  createFundProofUploadIntent,
  getFundProofDownloadUrl,
  reviewFundProof,
  type FundPaymentProofDTO,
} from "@/app/actions/fund";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type FundMemberProofProps = {
  spaceId: string;
  periodIndex: number;
  expectedAmount: number;
  paid: boolean;
  currency: SpaceCurrency;
  proofs: FundPaymentProofDTO[];
  storageReady: boolean;
};

export function FundMemberProof({
  spaceId,
  periodIndex,
  expectedAmount,
  paid,
  currency,
  proofs,
  storageReady,
}: FundMemberProofProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const periodProofs = proofs.filter((p) => p.periodIndex === periodIndex);

  function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    if (!file) {
      setError("فایل فیش را انتخاب کنید.");
      showToast("فایل فیش را انتخاب کنید", "error");
      return;
    }
    if (!ALLOWED.has(file.type)) {
      setError("فقط jpg / png / webp / pdf مجاز است.");
      showToast("فقط jpg/png/webp/pdf", "error");
      return;
    }

    const selected = file;
    startTransition(async () => {
      const intent = await createFundProofUploadIntent({
        spaceId,
        periodIndex,
        mimeType: selected.type as
          | "image/jpeg"
          | "image/png"
          | "image/webp"
          | "application/pdf",
        byteSize: selected.size,
        note: note.trim() || null,
      });
      if (!intent.ok) {
        setError(intent.error);
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
        setError("آپلود فایل ناموفق بود. دوباره تلاش کنید.");
        showToast("آپلود فایل ناموفق بود", "error");
        return;
      }

      const confirmed = await confirmFundProofUpload({
        spaceId,
        proofId: intent.proofId,
      });
      if (!confirmed.ok) {
        setError(confirmed.error);
        showToast(confirmed.error, "error");
        return;
      }

      showToast("فیش ارسال شد");
      setFile(null);
      setNote("");
      setError(null);
      router.refresh();
    });
  }

  function download(proofId: string) {
    startTransition(async () => {
      const result = await getFundProofDownloadUrl(spaceId, proofId);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-pretty text-body-sm font-semibold text-foreground">
          فیش پرداخت · دوره {periodIndex}
        </h2>
        <p className="mt-0.5 text-caption text-muted-foreground">
          مبلغ مورد انتظار:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatCurrency(expectedAmount, currency)}
          </span>
        </p>
      </div>

      {paid ? (
        <p className="rounded-xl bg-success-soft px-3 py-2 text-caption font-semibold text-success">
          پرداخت این دوره ثبت شده است.
        </p>
      ) : !storageReady ? (
        <p className="text-caption text-muted-foreground">
          آپلود فیش فعلاً در دسترس نیست (S3 پیکربندی نشده).
        </p>
      ) : (
        <form onSubmit={onUpload} className="space-y-2.5">
          <div className="space-y-1">
            <label
              htmlFor="fund-proof-file"
              className="text-label text-muted-foreground"
            >
              فایل فیش
            </label>
            <Input
              id="fund-proof-file"
              name="proofFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              aria-label="انتخاب فایل فیش (jpg، png، webp یا pdf)"
              className="h-11 rounded-xl text-caption file:me-2"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="fund-proof-note"
              className="text-label text-muted-foreground"
            >
              یادداشت
            </label>
            <Input
              id="fund-proof-note"
              name="note"
              autoComplete="off"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="اختیاری…"
              maxLength={200}
              className="h-10 rounded-xl"
            />
          </div>
          {error ? (
            <p
              className="rounded-lg bg-destructive-soft px-2.5 py-1.5 text-caption text-destructive"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            className="h-11 w-full rounded-xl"
            disabled={pending || !file}
          >
            {pending ? "در حال ارسال…" : "ارسال فیش"}
          </Button>
        </form>
      )}

      {periodProofs.length > 0 ? (
        <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/40">
          {periodProofs.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 px-3 py-2.5 [content-visibility:auto] [contain-intrinsic-size:auto_3.5rem]"
            >
              <div className="min-w-0">
                <p className="text-caption font-semibold text-foreground">
                  {STATUS_FA[p.status]}
                </p>
                <p className="text-[0.65rem] text-muted-foreground">
                  {formatDateFaShort(new Date(p.createdAt))}
                  {p.reviewNote ? ` · ${p.reviewNote}` : ""}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 shrink-0 rounded-lg text-caption"
                disabled={pending}
                onClick={() => download(p.id)}
              >
                دانلود
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

type FundProofsInboxProps = {
  spaceId: string;
  proofs: FundPaymentProofDTO[];
  canReview: boolean;
};

export function FundProofsInbox({
  spaceId,
  proofs,
  canReview,
}: FundProofsInboxProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [note, setNote] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingCount = proofs.filter((p) => p.status === "PENDING").length;
  const visible =
    filter === "pending"
      ? proofs.filter((p) => p.status === "PENDING")
      : proofs;

  function download(proofId: string) {
    startTransition(async () => {
      const result = await getFundProofDownloadUrl(spaceId, proofId);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  function review(proofId: string, status: "APPROVED" | "REJECTED") {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await reviewFundProof({
        spaceId,
        proofId,
        status,
        reviewNote: note.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        showToast(result.error, "error");
        return;
      }
      showToast(
        status === "APPROVED" ? "فیش تایید و پرداخت ثبت شد" : "فیش رد شد",
      );
      setSelectedId(null);
      setNote("");
      setError(null);
      router.refresh();
    });
  }

  if (proofs.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-border/50 bg-card px-3.5 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-pretty text-body-sm font-semibold text-foreground">
            فیش‌های اعضا
          </h3>
          <p className="text-caption text-muted-foreground">
            {pendingCount > 0
              ? `${pendingCount} در انتظار بررسی`
              : "فیش باز نیست"}
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="فیلتر فیش‌ها"
          className="flex gap-1 rounded-xl bg-muted/70 p-0.5"
        >
          {(
            [
              { id: "pending" as const, label: "باز" },
              { id: "all" as const, label: "همه" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={filter === t.id}
              onClick={() => setFilter(t.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-caption font-semibold transition-colors",
                filter === t.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/40">
        {visible.map((p) => (
          <li
            key={p.id}
            className="space-y-2 px-3 py-2.5 [content-visibility:auto] [contain-intrinsic-size:auto_4rem]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-body-sm font-semibold text-foreground">
                  {p.memberName}
                  <span className="ms-1.5 text-caption font-normal text-muted-foreground">
                    دوره {p.periodIndex}
                  </span>
                </p>
                <p className="text-caption text-muted-foreground">
                  {STATUS_FA[p.status]} ·{" "}
                  {formatDateFaShort(new Date(p.createdAt))}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-lg text-caption"
                  disabled={pending}
                  onClick={() => download(p.id)}
                >
                  دانلود
                </Button>
                {canReview && p.status === "PENDING" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-caption"
                    aria-expanded={selectedId === p.id}
                    disabled={pending}
                    onClick={() => {
                      setSelectedId(selectedId === p.id ? null : p.id);
                      setError(null);
                      setNote("");
                    }}
                  >
                    بررسی
                  </Button>
                ) : null}
              </div>
            </div>
            {selectedId === p.id ? (
              <div className="space-y-2 rounded-xl bg-muted/40 p-2.5">
                <p className="text-caption text-muted-foreground">
                  تایید = ثبت پرداخت{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    (سهم مورد انتظار)
                  </span>
                </p>
                <div className="space-y-1">
                  <label
                    htmlFor={`fund-review-note-${p.id}`}
                    className="text-label text-muted-foreground"
                  >
                    یادداشت بررسی
                  </label>
                  <Input
                    id={`fund-review-note-${p.id}`}
                    name="reviewNote"
                    autoComplete="off"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="اختیاری…"
                    className="h-9 rounded-lg"
                    maxLength={300}
                  />
                </div>
                {error ? (
                  <p
                    className="rounded-lg bg-destructive-soft px-2 py-1.5 text-caption text-destructive"
                    role="alert"
                    aria-live="assertive"
                  >
                    {error}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 flex-1 rounded-lg"
                    disabled={pending}
                    onClick={() => review(p.id, "APPROVED")}
                  >
                    {pending ? "در حال ذخیره…" : "تایید"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 flex-1 rounded-lg"
                    disabled={pending}
                    onClick={() => review(p.id, "REJECTED")}
                  >
                    {pending ? "در حال ذخیره…" : "رد"}
                  </Button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {visible.length === 0 ? (
        <p className="py-2 text-center text-caption text-muted-foreground">
          موردی نیست
        </p>
      ) : null}
    </section>
  );
}
