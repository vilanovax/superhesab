"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  getChargeProofDownloadUrl,
  reviewChargeProof,
  type ChargePaymentProofDTO,
} from "@/app/actions/building";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CHARGE_STATUS_LABELS, monthLabelFa } from "@/lib/building";
import { formatDateFaShort, type SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

const STATUS_FA = {
  PENDING: "در انتظار",
  APPROVED: "تایید",
  REJECTED: "رد",
} as const;

type BuildingProofsInboxProps = {
  spaceId: string;
  proofs: ChargePaymentProofDTO[];
  currency: SpaceCurrency;
  canReview: boolean;
};

export function BuildingProofsInbox({
  spaceId,
  proofs,
  currency,
  canReview,
}: BuildingProofsInboxProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<ChargePaymentProofDTO | null>(null);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [error, setError] = useState<string | null>(null);

  const pendingCount = proofs.filter((p) => p.status === "PENDING").length;
  const visible =
    filter === "pending"
      ? proofs.filter((p) => p.status === "PENDING")
      : proofs;

  function openReview(p: ChargePaymentProofDTO) {
    setSelected(p);
    setAmount(p.amount);
    setNote("");
    setError(null);
  }

  function closeReview() {
    if (pending) return;
    setSelected(null);
    setError(null);
  }

  function review(status: "APPROVED" | "REJECTED") {
    if (!selected || pending) return;
    const id = selected.id;
    setError(null);
    startTransition(async () => {
      const result = await reviewChargeProof({
        spaceId,
        proofId: id,
        status,
        reviewNote: note.trim() || null,
        amount: status === "APPROVED" ? Math.trunc(amount) || 0 : undefined,
        paymentStatus: status === "APPROVED" ? "PAID" : undefined,
      });
      if (!result.ok) {
        const msg = result.error || "خطا در بررسی رسید";
        setError(msg);
        showToast(msg, "error");
        return;
      }
      setSelected(null);
      showToast(status === "APPROVED" ? "رسید تایید شد" : "رسید رد شد");
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

  if (proofs.length === 0) return null;

  return (
    <div className="space-y-2 rounded-2xl border border-border/50 bg-card px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-pretty text-body-sm font-semibold text-foreground">
            رسیدها
          </h3>
          <p className="text-caption text-muted-foreground">
            {pendingCount > 0
              ? `${pendingCount} در انتظار بررسی`
              : "رسید در انتظاری نیست"}
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="فیلتر رسیدها"
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
                "h-8 rounded-lg px-2.5 text-caption font-semibold transition-colors",
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

      {visible.length === 0 ? (
        <p className="py-4 text-center text-caption text-muted-foreground">
          موردی نیست.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-xl border border-border/40 px-2.5 py-2 [content-visibility:auto] [contain-intrinsic-size:auto_3.25rem]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-caption font-semibold text-foreground">
                  واحد {p.unitName} · {monthLabelFa(p.month)}
                </p>
                <p className="text-micro text-muted-foreground">
                  {formatCurrency(p.amount, currency)} ·{" "}
                  {STATUS_FA[p.status]} · {formatDateFaShort(p.createdAt)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 rounded-lg text-caption"
                disabled={pending}
                onClick={() => download(p.id)}
              >
                فایل
              </Button>
              {canReview && p.status === "PENDING" ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 shrink-0 rounded-lg text-caption"
                  disabled={pending}
                  onClick={() => openReview(p)}
                >
                  بررسی
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={Boolean(selected)}
        onOpenChange={(o) => {
          if (!o) closeReview();
        }}
        repositionInputs={false}
      >
        <DrawerContent className="mt-0! flex h-auto max-h-[85dvh] flex-col gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero shrink-0 px-4 pb-2.5 pt-1">
            <DrawerHeader className="space-y-0 p-0 text-start">
              <DrawerTitle className="text-pretty text-body font-bold text-on-hero">
                بررسی رسید · واحد {selected?.unitName}
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-caption text-on-hero/70">
                {selected
                  ? `${monthLabelFa(selected.month)} · ${selected.uploadedByName ?? ""}`
                  : ""}
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="space-y-1">
              <label
                htmlFor="proof-review-amount"
                className="text-label text-muted-foreground"
              >
                مبلغ تایید ({CHARGE_STATUS_LABELS.PAID})
              </label>
              <MoneyInput
                id="proof-review-amount"
                name="amount"
                value={amount}
                onValueChange={setAmount}
                className="h-11 rounded-xl font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="proof-review-note"
                className="text-label text-muted-foreground"
              >
                یادداشت
              </label>
              <textarea
                id="proof-review-note"
                name="reviewNote"
                autoComplete="off"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="اختیاری…"
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-body-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl text-destructive"
                disabled={pending}
                onClick={() => review("REJECTED")}
              >
                {pending ? "در حال ذخیره…" : "رد"}
              </Button>
              <Button
                type="button"
                className="h-11 flex-[1.4] rounded-xl"
                disabled={pending}
                onClick={() => review("APPROVED")}
              >
                {pending ? "در حال ذخیره…" : "تایید و پرداخت‌شده"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
