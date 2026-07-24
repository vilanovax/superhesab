"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  upsertChargePayment,
  type BuildingDashboardDTO,
  type ChargePaymentDTO,
  type UnitDTO,
} from "@/app/actions/building";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import {
  CHARGE_STATUS_LABELS,
  formatJalaliYear,
  monthLabelFa,
  type ChargeStatusValue,
} from "@/lib/building";
import type { SpaceCurrency } from "@/lib/format";
import { todayIsoDateTehran } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type BuildingChargesPanelProps = {
  spaceId: string;
  settingsHref: string;
  dashboard: BuildingDashboardDTO;
  currency: SpaceCurrency;
  canMutate: boolean;
  isOwner: boolean;
};

export function BuildingChargesPanel({
  spaceId,
  settingsHref,
  dashboard,
  currency,
  canMutate,
  isOwner,
}: BuildingChargesPanelProps) {
  const router = useRouter();
  const [month, setMonth] = useState(
    Math.max(1, dashboard.throughMonth || 1),
  );
  const [payUnit, setPayUnit] = useState<UnitDTO | null>(null);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<ChargeStatusValue>("PAID");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayIsoDateTehran());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const paymentByUnit = useMemo(() => {
    const map = new Map<string, ChargePaymentDTO>();
    for (const p of dashboard.payments) {
      if (p.month === month) map.set(p.unitId, p);
    }
    return map;
  }, [dashboard.payments, month]);

  const activeUnits = dashboard.units.filter((u) => u.isActive);

  function openPay(unit: UnitDTO) {
    const existing = paymentByUnit.get(unit.id);
    setPayUnit(unit);
    setAmount(
      existing
        ? String(existing.amount)
        : String(unit.monthlyCharge || ""),
    );
    setStatus(existing?.status ?? "PAID");
    setNote(existing?.note ?? "");
    setDate(existing?.date ?? todayIsoDateTehran());
    setError(null);
  }

  function onSavePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payUnit) return;
    setError(null);
    startTransition(async () => {
      const result = await upsertChargePayment({
        spaceId,
        unitId: payUnit.id,
        year: dashboard.year,
        month,
        amount: Math.trunc(Number(amount)) || 0,
        status,
        note: note || null,
        date,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPayUnit(null);
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="مقرر تا الان"
          value={formatCurrency(totals.expectedYtd, currency)}
        />
        <StatCard
          label="وصول‌شده"
          value={formatCurrency(totals.collectedYtd, currency)}
          tone="success"
        />
        <StatCard
          label="معوق"
          value={formatCurrency(totals.arrearsTotal, currency)}
          tone={totals.arrearsTotal > 0 ? "danger" : "default"}
        />
      </div>

      {dashboard.debtors.length > 0 ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive-soft/40 px-3.5 py-3">
          <p className="text-body-sm font-semibold text-destructive">
            بدهکاران ({dashboard.debtors.length})
          </p>
          <ul className="mt-2 space-y-1.5">
            {dashboard.debtors.slice(0, 6).map((u) => (
              <li
                key={u.id}
                className="flex justify-between gap-2 text-caption text-destructive/90"
              >
                <span>واحد {u.name}</span>
                <span className="tabular-nums font-semibold">
                  {formatCurrency(u.arrears, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-xl bg-success-soft/50 px-3 py-2 text-center text-caption font-medium text-success">
          معوق فعالی نیست
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-caption font-semibold text-muted-foreground">
            وصول ماه — {formatJalaliYear(dashboard.year)}
          </p>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-9 rounded-xl border border-border/60 bg-card px-2 text-caption outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {monthLabelFa(m)}
              </option>
            ))}
          </select>
        </div>

        <ul className="space-y-2">
          {activeUnits.map((unit) => {
            const payment = paymentByUnit.get(unit.id);
            const status = payment?.status;
            return (
              <li
                key={unit.id}
                className="rounded-2xl border border-border/55 bg-card p-3.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-body font-semibold text-foreground">
                      واحد {unit.name}
                    </p>
                    <p className="mt-0.5 text-caption text-muted-foreground">
                      مقرر {formatCurrency(unit.monthlyCharge, currency)}
                      {status
                        ? ` · ${CHARGE_STATUS_LABELS[status]}`
                        : " · ثبت نشده"}
                      {payment
                        ? ` · ${formatCurrency(payment.amount, currency)}`
                        : ""}
                    </p>
                    {unit.arrears > 0 ? (
                      <p className="mt-1 text-micro font-medium text-destructive">
                        معوق کل: {formatCurrency(unit.arrears, currency)}
                      </p>
                    ) : null}
                  </div>
                  {canMutate ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 rounded-xl"
                      onClick={() => openPay(unit)}
                    >
                      {payment ? "ویرایش" : "ثبت وصول"}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <Drawer
        open={Boolean(payUnit)}
        onOpenChange={(open) => {
          if (!open) setPayUnit(null);
        }}
        repositionInputs={false}
      >
        <DrawerContent className="mt-0! max-h-[92dvh] gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero shrink-0 px-5 pb-3.5 pt-2">
            <DrawerHeader className="space-y-0.5 p-0 text-start">
              <DrawerTitle className="text-lg font-bold text-on-hero">
                وصول شارژ — واحد {payUnit?.name}
              </DrawerTitle>
              <DrawerDescription className="text-body-sm text-on-hero/70">
                {monthLabelFa(month)} {formatJalaliYear(dashboard.year)}
                {payUnit
                  ? ` · مقرر ${formatCurrency(payUnit.monthlyCharge, currency)}`
                  : ""}
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <form
            onSubmit={onSavePayment}
            className="surface-sheet-canvas space-y-3 overflow-y-auto px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
          >
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/80 p-1">
              {(
                [
                  "PAID",
                  "PARTIAL",
                  "DUE",
                  "WAIVED",
                ] as const
              ).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "h-9 rounded-lg text-caption font-semibold",
                    status === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {CHARGE_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="text-label text-muted-foreground">مبلغ</label>
              <Input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^\d]/g, ""))
                }
                className="h-12 rounded-xl text-lg font-bold tabular-nums"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-label text-muted-foreground">تاریخ</label>
              <JalaliDatePicker value={date} onChange={setDate} />
            </div>
            <div className="space-y-1.5">
              <label className="text-label text-muted-foreground">یادداشت</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="اختیاری"
                className="h-11 rounded-xl"
                maxLength={200}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-12 w-full rounded-2xl"
              disabled={pending}
            >
              {pending ? "…" : "ذخیره"}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card px-2.5 py-2.5 text-center">
      <p className="text-micro text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-caption font-bold tabular-nums",
          tone === "success" && "text-success",
          tone === "danger" && "text-destructive",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
