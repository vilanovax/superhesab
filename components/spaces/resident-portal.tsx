"use client";

import { useMemo, useState } from "react";
import type {
  BuildingAnnouncementDTO,
  BuildingNotificationDTO,
  BuildingSuggestionDTO,
  ChargePaymentProofDTO,
  ResidentPortalDTO,
} from "@/app/actions/building";
import { BuildingAnnouncementsBoard } from "@/components/spaces/building-announcements-board";
import { ResidentNotificationsBell } from "@/components/spaces/resident-notifications-bell";
import { ResidentPaymentProof } from "@/components/spaces/resident-payment-proof";
import { ResidentSuggestionsPanel } from "@/components/spaces/resident-suggestions-panel";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  CHARGE_STATUS_LABELS,
  formatJalaliYear,
  monthLabelFa,
  type ChargeStatusValue,
} from "@/lib/building";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  type ExpenseCategory,
} from "@/lib/categorizer";
import { formatDateFaShort } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type ResidentPortalProps = {
  data: ResidentPortalDTO;
  suggestions: BuildingSuggestionDTO[];
  announcements: BuildingAnnouncementDTO[];
  notifications: BuildingNotificationDTO[];
  chargeProofs: ChargePaymentProofDTO[];
};

function faDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

export function ResidentPortal({
  data,
  suggestions,
  announcements,
  notifications,
  chargeProofs,
}: ResidentPortalProps) {
  const settled = data.unit.arrears <= 0;
  const unitLabel =
    data.currency === "TOMAN"
      ? "تومان"
      : data.currency === "RIAL"
        ? "ریال"
        : data.currency;

  const [tab, setTab] = useState("announcements");

  const unreadAnnouncementIds = useMemo(
    () =>
      notifications
        .filter(
          (n) =>
            !n.read && n.kind === "ANNOUNCEMENT" && Boolean(n.refId),
        )
        .map((n) => n.refId!),
    [notifications],
  );

  const unreadPaymentIds = useMemo(
    () =>
      new Set(
        notifications
          .filter(
            (n) =>
              !n.read && n.kind === "CHARGE_PAYMENT" && Boolean(n.refId),
          )
          .map((n) => n.refId!),
      ),
    [notifications],
  );

  const unreadAnnouncements = unreadAnnouncementIds.length;
  const unreadPayments = unreadPaymentIds.size;

  return (
    <div className="space-y-4">
      <header className="surface-hero animate-fade-up rounded-2xl p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-caption text-on-hero/70">
              وضعیت شارژ · {formatJalaliYear(data.year)}
            </p>
            <h1 className="mt-1 text-title font-bold text-on-hero">
              واحد {data.unit.name}
            </h1>
          </div>
          <ResidentNotificationsBell
            spaceId={data.spaceId}
            notifications={notifications}
            onOpenTab={(t) => setTab(t)}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-on-hero/10 px-3 py-2.5">
            <p className="text-micro text-on-hero/65">وضعیت</p>
            <p
              className={cn(
                "mt-0.5 text-body-sm font-bold",
                settled ? "text-on-hero" : "text-amber-100",
              )}
            >
              {settled ? "تسویه‌شده" : "بدهکار"}
            </p>
          </div>
          <div className="rounded-xl bg-on-hero/10 px-3 py-2.5">
            <p className="text-micro text-on-hero/65">
              {settled ? "وصول‌شده" : "معوق"}
            </p>
            <p className="mt-0.5 text-body-sm font-bold tabular-nums text-on-hero">
              {formatCurrency(
                settled ? data.unit.collected : data.unit.arrears,
                data.currency,
              )}
            </p>
          </div>
        </div>
        <p className="mt-3 text-caption text-on-hero/70">
          شارژ ماهانه مقرر:{" "}
          <span className="font-semibold text-on-hero">
            {formatCurrency(data.unit.monthlyCharge, data.currency)}
          </span>
          {data.unit.monthlyCharge === 0
            ? " · پلن شارژ هنوز تعریف نشده"
            : ` تا ${monthLabelFa(data.throughMonth)}`}
        </p>
      </header>

      <Tabs
        defaultValue="announcements"
        value={tab}
        onValueChange={setTab}
        className="w-full"
      >
        <TabsList className="grid h-11 w-full grid-cols-4 rounded-2xl bg-muted/70 p-1">
          <TabsTrigger value="announcements" className="rounded-xl px-1">
            اعلان
            {unreadAnnouncements > 0 ? (
              <span className="ms-0.5 text-micro text-primary">
                {faDigits(unreadAnnouncements)}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-xl px-1">
            پرداخت
            {unreadPayments > 0 ? (
              <span className="ms-0.5 text-micro text-primary">
                {faDigits(unreadPayments)}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-xl px-1">
            هزینه
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="rounded-xl px-1">
            پیشنهاد
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="mt-3">
          <BuildingAnnouncementsBoard
            spaceId={data.spaceId}
            announcements={announcements}
            canMutate={false}
            highlightIds={unreadAnnouncementIds}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-3 space-y-3">
          <ResidentPaymentProof
            spaceId={data.spaceId}
            unitId={data.unit.id}
            year={data.year}
            throughMonth={data.throughMonth}
            currency={data.currency}
            proofs={chargeProofs}
          />
          {data.payments.length === 0 ? (
            <EmptyBox text="هنوز پرداختی برای این واحد ثبت نشده است." />
          ) : (
            <ul className="space-y-2">
              {data.payments.map((p) => {
                const isNew = unreadPaymentIds.has(p.id);
                return (
                  <li
                    key={p.id}
                    className={cn(
                      "rounded-2xl border bg-card px-3.5 py-3",
                      isNew
                        ? "border-primary/30 ring-1 ring-primary/10"
                        : "border-border/50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isNew ? (
                            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-micro font-semibold text-amber-800 dark:text-amber-200">
                              جدید
                            </span>
                          ) : null}
                          <p className="text-body-sm font-semibold text-foreground">
                            {monthLabelFa(p.month)} {formatJalaliYear(p.year)}
                          </p>
                        </div>
                        <p className="mt-0.5 text-caption text-muted-foreground">
                          {formatDateFaShort(p.date)}
                          {p.note ? ` · ${p.note}` : ""}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="tabular-nums text-body-sm font-bold text-foreground">
                          {formatCurrency(p.amount, data.currency)}
                        </p>
                        <StatusPill status={p.status} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="mt-3">
          <p className="mb-2 px-0.5 text-caption text-muted-foreground">
            هزینه مشاع سال {formatJalaliYear(data.year)} — شفافیت صندوق ساختمان
          </p>
          {data.expenses.length === 0 ? (
            <EmptyBox text="در این سال هنوز هزینه مشاعی ثبت نشده است." />
          ) : (
            <ul className="space-y-2">
              {data.expenses.map((e) => {
                const cat = e.category as ExpenseCategory;
                const label =
                  e.categoryLabel?.trim() ||
                  CATEGORY_LABELS[cat] ||
                  e.category;
                return (
                  <li
                    key={e.id}
                    className="rounded-2xl border border-border/50 bg-card px-3.5 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm font-semibold text-foreground">
                          {e.title}
                        </p>
                        <p className="mt-0.5 text-caption text-muted-foreground">
                          {CATEGORY_EMOJI[cat] ?? "📦"} {label} ·{" "}
                          {formatDateFaShort(e.date)}
                        </p>
                      </div>
                      <p className="shrink-0 tabular-nums text-body-sm font-bold text-foreground">
                        {formatCurrency(e.totalAmount, data.currency)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-center text-micro text-muted-foreground">
            مبالغ به {unitLabel} — فقط مشاهده
          </p>
        </TabsContent>

        <TabsContent value="suggestions" className="mt-3">
          <ResidentSuggestionsPanel
            spaceId={data.spaceId}
            suggestions={suggestions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-body-sm text-muted-foreground">
      {text}
    </div>
  );
}

function StatusPill({ status }: { status: ChargeStatusValue }) {
  const tone =
    status === "PAID" || status === "WAIVED"
      ? "bg-success-soft text-success"
      : status === "PARTIAL"
        ? "bg-primary/10 text-primary"
        : "bg-destructive-soft text-destructive";

  return (
    <span
      className={cn(
        "mt-0.5 inline-block rounded-lg px-2 py-0.5 text-micro font-semibold",
        tone,
      )}
    >
      {CHARGE_STATUS_LABELS[status]}
    </span>
  );
}
