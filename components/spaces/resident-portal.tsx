"use client";

import type {
  BuildingAnnouncementDTO,
  BuildingSuggestionDTO,
  ResidentPortalDTO,
} from "@/app/actions/building";
import { BuildingAnnouncementsBoard } from "@/components/spaces/building-announcements-board";
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
};

export function ResidentPortal({
  data,
  suggestions,
  announcements,
}: ResidentPortalProps) {
  const settled = data.unit.arrears <= 0;
  const unitLabel =
    data.currency === "TOMAN"
      ? "تومان"
      : data.currency === "RIAL"
        ? "ریال"
        : data.currency;

  return (
    <div className="space-y-4">
      <header className="surface-hero animate-fade-up rounded-2xl p-5">
        <p className="text-caption text-on-hero/70">
          وضعیت شارژ · {formatJalaliYear(data.year)}
        </p>
        <h1 className="mt-1 text-title font-bold text-on-hero">
          واحد {data.unit.name}
        </h1>
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

      <Tabs defaultValue="announcements" className="w-full">
        <TabsList className="grid h-11 w-full grid-cols-4 rounded-2xl bg-muted/70 p-1">
          <TabsTrigger value="announcements" className="rounded-xl px-1">
            اعلان
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-xl px-1">
            پرداخت
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
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-3">
          {data.payments.length === 0 ? (
            <EmptyBox text="هنوز پرداختی برای این واحد ثبت نشده است." />
          ) : (
            <ul className="space-y-2">
              {data.payments.map((p) => (
                <li
                  key={p.id}
                  className="rounded-2xl border border-border/50 bg-card px-3.5 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-body-sm font-semibold text-foreground">
                        {monthLabelFa(p.month)} {formatJalaliYear(p.year)}
                      </p>
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
              ))}
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
