"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  upsertChargePayment,
  type AnnualChargeCalendarDTO,
  type BuildingDashboardDTO,
  type ChargePaymentDTO,
  type UnitDTO,
} from "@/app/actions/building";
import { BuildingAnnualCalendar } from "@/components/spaces/building-annual-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  CHARGE_STATUS_LABELS,
  formatJalaliYear,
  monthLabelFa,
  type ChargeStatusValue,
} from "@/lib/building";
import {
  currencyLabel,
  formatMoney,
  type SpaceCurrency,
} from "@/lib/format";
import { todayIsoDateTehran } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

const JalaliDatePicker = dynamic(
  () =>
    import("@/components/ui/jalali-date-picker").then(
      (m) => m.JalaliDatePicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-28 animate-pulse rounded-2xl bg-muted/40" />
    ),
  },
);

type BuildingChargesPanelProps = {
  spaceId: string;
  settingsHref: string;
  dashboard: BuildingDashboardDTO;
  calendar: AnnualChargeCalendarDTO | null;
  currency: SpaceCurrency;
  canMutate: boolean;
  isOwner: boolean;
};

export function BuildingChargesPanel({
  spaceId,
  settingsHref,
  dashboard,
  calendar,
  currency,
  canMutate,
  isOwner,
}: BuildingChargesPanelProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [view, setView] = useState<"month" | "calendar">("calendar");
  const [month, setMonth] = useState(
    Math.max(1, dashboard.throughMonth || 1),
  );
  const [debtorsOpen, setDebtorsOpen] = useState(false);
  const [payUnit, setPayUnit] = useState<UnitDTO | null>(null);
  const [amount, setAmount] = useState(0);
  const [status, setStatus] = useState<ChargeStatusValue>("PAID");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayIsoDateTehran());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);

  const unitLabel = currencyLabel(currency);

  const paymentByUnit = useMemo(() => {
    const map = new Map<string, ChargePaymentDTO>();
    for (const p of dashboard.payments) {
      if (p.month === month) map.set(p.unitId, p);
    }
    return map;
  }, [dashboard.payments, month]);

  const activeUnits = dashboard.units.filter((u) => u.isActive);
  const paidThisMonth = activeUnits.filter((u) => {
    const s = paymentByUnit.get(u.id)?.status;
    return s === "PAID" || s === "WAIVED";
  }).length;

  function openPay(unit: UnitDTO) {
    const existing = paymentByUnit.get(unit.id);
    setPayUnit(unit);
    setAmount(existing?.amount ?? unit.monthlyCharge ?? 0);
    setStatus(existing?.status ?? "PAID");
    setNote(existing?.note ?? "");
    setNoteOpen(Boolean(existing?.note));
    setDate(existing?.date ?? todayIsoDateTehran());
    setError(null);
  }

  function openPayFromCalendar(args: {
    unitId: string;
    unitName: string;
    month: number;
    monthlyCharge: number;
    payment: ChargePaymentDTO | null;
  }) {
    setMonth(args.month);
    setPayUnit({
      id: args.unitId,
      name: args.unitName,
      area: null,
      multiplier: 1000,
      isActive: true,
      monthlyCharge: args.monthlyCharge,
      arrears: 0,
      collected: 0,
    });
    setAmount(args.payment?.amount ?? args.monthlyCharge ?? 0);
    setStatus(args.payment?.status ?? "PAID");
    setNote(args.payment?.note ?? "");
    setNoteOpen(Boolean(args.payment?.note));
    setDate(args.payment?.date ?? todayIsoDateTehran());
    setError(null);
  }

  function onSavePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payUnit) return;
    setError(null);

    const payload = {
      spaceId,
      unitId: payUnit.id,
      year: dashboard.year,
      month,
      amount: Math.trunc(amount) || 0,
      status,
      note: note || null,
      date,
    };

    // Fast-close before server round-trip.
    setPayUnit(null);
    showToast("ثبت شد");

    startTransition(async () => {
      const result = await upsertChargePayment(payload);
      if (!result.ok) {
        showToast(result.error || "خطا در ثبت اطلاعات", "error");
        return;
      }
      router.refresh();
    });
  }

  if (!dashboard.plan) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-border/60 bg-card/70 px-4 py-8 text-center">
        <p className="text-body font-semibold text-foreground">
          پلن شارژ سال {formatJalaliYear(dashboard.year)} تعریف نشده
        </p>
        <p className="text-body-sm text-muted-foreground">
          ابتدا مبلغ پایه ماهانه را در تنظیمات ذخیره کنید.
        </p>
        {isOwner ? (
          <Button asChild className="mt-2 h-11 rounded-xl">
            <Link href={settingsHref}>رفتن به تنظیمات</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  if (activeUnits.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-border/60 bg-card/70 px-4 py-8 text-center">
        <p className="text-body font-semibold text-foreground">
          واحدی ثبت نشده
        </p>
        {isOwner ? (
          <Button asChild className="h-11 rounded-xl">
            <Link href={settingsHref}>افزودن واحد</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  const { totals } = dashboard;
  const visibleDebtors = debtorsOpen
    ? dashboard.debtors
    : dashboard.debtors.slice(0, 3);

  return (
    <div className="space-y-3">
      {/* Compact KPI strip */}
      <div className="grid grid-cols-3 gap-1.5">
        <StatCard
          label="مقرر"
          amount={totals.expectedYtd}
          unit={unitLabel}
        />
        <StatCard
          label="وصول"
          amount={totals.collectedYtd}
          unit={unitLabel}
          tone="success"
        />
        <StatCard
          label="معوق"
          amount={totals.arrearsTotal}
          unit={unitLabel}
          tone={totals.arrearsTotal > 0 ? "danger" : "default"}
        />
      </div>

      <div className="flex gap-1 rounded-2xl bg-muted/70 p-1">
        <button
          type="button"
          onClick={() => setView("calendar")}
          className={cn(
            "h-10 flex-1 rounded-xl text-caption font-semibold transition-colors",
            view === "calendar"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          تقویم سال
        </button>
        <button
          type="button"
          onClick={() => setView("month")}
          className={cn(
            "h-10 flex-1 rounded-xl text-caption font-semibold transition-colors",
            view === "month"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          وصول ماهانه
        </button>
      </div>

      {view === "calendar" ? (
        <div className="rounded-2xl border border-border/40 bg-card px-3.5 py-3.5 shadow-sm">
          {calendar ? (
            <BuildingAnnualCalendar
              spaceId={spaceId}
              calendar={calendar}
              canMutate={canMutate}
              onCellClick={canMutate ? openPayFromCalendar : undefined}
            />
          ) : (
            <p className="py-6 text-center text-body-sm text-muted-foreground">
              بارگذاری تقویم ممکن نیست.
            </p>
          )}
        </div>
      ) : (
        <>
      {/* Debtors — compact, expandable */}
      {dashboard.debtors.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-destructive/20 bg-destructive-soft/35">
          <button
            type="button"
            onClick={() => setDebtorsOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-start"
          >
            <span className="text-body-sm font-semibold text-destructive">
              بدهکاران · {dashboard.debtors.length} واحد
            </span>
            <span className="text-micro font-medium text-destructive/75">
              {debtorsOpen ? "بستن" : "مشاهده"}
            </span>
          </button>
          <ul className="space-y-0 border-t border-destructive/15 px-3.5 pb-2.5 pt-2">
            {visibleDebtors.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-2 py-1 text-caption"
              >
                <span className="text-destructive/85">واحد {u.name}</span>
                <span className="tabular-nums font-semibold text-destructive">
                  {formatMoney(u.arrears)}
                </span>
              </li>
            ))}
          </ul>
          {!debtorsOpen && dashboard.debtors.length > 3 ? (
            <p className="border-t border-destructive/10 px-3.5 py-1.5 text-center text-micro text-destructive/70">
              و {dashboard.debtors.length - 3} واحد دیگر
            </p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-xl bg-success-soft/60 px-3 py-2 text-center text-caption font-medium text-success">
          معوق فعالی نیست ✓
        </p>
      )}

      {/* Month collection */}
      <div className="space-y-2.5">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-body-sm font-semibold text-foreground">
              وصول {monthLabelFa(month)}
            </p>
            <p className="mt-0.5 text-micro text-muted-foreground">
              {formatJalaliYear(dashboard.year)} · {paidThisMonth} از{" "}
              {activeUnits.length} واحد تسویه
            </p>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const on = month === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMonth(m)}
                className={cn(
                  "shrink-0 rounded-xl px-2.5 py-1.5 text-caption font-semibold transition-colors",
                  on
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {monthLabelFa(m)}
              </button>
            );
          })}
        </div>

        <ul className="space-y-2">
          {activeUnits.map((unit) => {
            const payment = paymentByUnit.get(unit.id);
            const payStatus = payment?.status;
            const settled =
              payStatus === "PAID" || payStatus === "WAIVED";
            return (
              <li
                key={unit.id}
                className={cn(
                  "rounded-2xl border bg-card px-3.5 py-3",
                  settled
                    ? "border-border/40"
                    : unit.arrears > 0
                      ? "border-destructive/25"
                      : "border-border/55",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl text-caption font-bold",
                      settled
                        ? "bg-success-soft text-success"
                        : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {unit.name}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-body-sm font-semibold text-foreground">
                        واحد {unit.name}
                      </p>
                      {payStatus ? (
                        <StatusPill status={payStatus} />
                      ) : (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-micro font-medium text-muted-foreground">
                          ثبت نشده
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-caption text-muted-foreground">
                      مقرر {formatMoney(unit.monthlyCharge)} {unitLabel}
                      {payment
                        ? ` · پرداخت ${formatMoney(payment.amount)}`
                        : ""}
                    </p>
                    {unit.arrears > 0 ? (
                      <p className="mt-0.5 text-micro font-medium text-destructive">
                        معوق {formatMoney(unit.arrears)} {unitLabel}
                      </p>
                    ) : null}
                  </div>
                  {canMutate ? (
                    <Button
                      type="button"
                      variant={settled ? "outline" : "default"}
                      size="sm"
                      className={cn(
                        "h-9 shrink-0 rounded-xl px-3.5 text-caption font-semibold",
                        !settled && "text-primary-foreground",
                      )}
                      onClick={() => openPay(unit)}
                    >
                      {payment ? "ویرایش" : "ثبت"}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
        </>
      )}

      <Drawer
        open={Boolean(payUnit)}
        onOpenChange={(open) => {
          if (!open) setPayUnit(null);
        }}
        repositionInputs={false}
      >
        <DrawerContent className="mt-0! flex max-h-[85dvh] flex-col gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero shrink-0 px-4 pb-2.5 pt-1">
            <DrawerHeader className="space-y-0 p-0 text-start">
              <DrawerTitle className="text-body font-bold text-on-hero">
                وصول — واحد {payUnit?.name}
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-caption text-on-hero/70">
                {monthLabelFa(month)} {formatJalaliYear(dashboard.year)}
                {payUnit
                  ? ` · مقرر ${formatCurrency(payUnit.monthlyCharge, currency)}`
                  : ""}
              </DrawerDescription>
            </DrawerHeader>
          </div>

          <form
            onSubmit={onSavePayment}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="surface-sheet-canvas min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
              <div
                role="group"
                aria-label="وضعیت پرداخت"
                className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {(
                  ["PAID", "PARTIAL", "DUE", "WAIVED"] as const
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setStatus(s);
                      if (s === "PAID" && payUnit && amount <= 0) {
                        setAmount(payUnit.monthlyCharge);
                      }
                      if (s === "WAIVED") setAmount(0);
                    }}
                    className={cn(
                      "h-8 shrink-0 rounded-lg px-2.5 text-caption font-semibold transition-colors",
                      status === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {CHARGE_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-label text-muted-foreground">
                    مبلغ ({unitLabel})
                  </label>
                  {payUnit &&
                  payUnit.monthlyCharge > 0 &&
                  amount !== payUnit.monthlyCharge ? (
                    <button
                      type="button"
                      onClick={() => setAmount(payUnit.monthlyCharge)}
                      className="text-micro font-semibold text-primary"
                    >
                      پر کردن مقرر
                    </button>
                  ) : null}
                </div>
                <MoneyInput
                  value={amount}
                  onValueChange={setAmount}
                  className="h-11 rounded-xl text-base font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-label text-muted-foreground">تاریخ</label>
                <JalaliDatePicker
                  value={date}
                  onChange={setDate}
                  variant="compact"
                />
              </div>

              {noteOpen ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-label text-muted-foreground">
                      یادداشت
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNote("");
                        setNoteOpen(false);
                      }}
                      className="text-micro text-muted-foreground"
                    >
                      حذف
                    </button>
                  </div>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="اختیاری"
                    className="h-10 rounded-xl"
                    maxLength={200}
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setNoteOpen(true)}
                  className="text-caption font-medium text-muted-foreground"
                >
                  + یادداشت
                </button>
              )}
            </div>

            <div className="mt-auto shrink-0 space-y-2 border-t border-border/45 bg-card px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5">
              {error ? (
                <p
                  className="rounded-lg bg-destructive-soft px-2.5 py-1.5 text-caption text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-xl"
                  disabled={pending}
                  onClick={() => setPayUnit(null)}
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  className="h-11 flex-[1.4] rounded-xl text-primary-foreground"
                  disabled={pending}
                >
                  {pending ? "…" : "ذخیره"}
                </Button>
              </div>
            </div>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function StatusPill({ status }: { status: ChargeStatusValue }) {
  const tone =
    status === "PAID" || status === "WAIVED"
      ? "bg-success-soft text-success"
      : status === "PARTIAL"
        ? "bg-secondary text-secondary-foreground"
        : "bg-destructive-soft text-destructive";
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-micro font-medium",
        tone,
      )}
    >
      {CHARGE_STATUS_LABELS[status]}
    </span>
  );
}

function StatCard({
  label,
  amount,
  unit,
  tone = "default",
}: {
  label: string;
  amount: number;
  unit: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card px-2 py-2 text-center shadow-sm">
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-[13px] font-bold leading-tight tabular-nums tracking-tight",
          tone === "success" && "text-success",
          tone === "danger" && "text-destructive",
          tone === "default" && "text-foreground",
        )}
      >
        {formatMoney(amount)}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{unit}</p>
    </div>
  );
}
