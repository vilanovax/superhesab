"use client";

import {
  CHARGE_STATUS_LABELS,
  MONTH_LABELS_FA,
  formatJalaliYear,
  type ChargeStatusValue,
} from "@/lib/building";
import {
  currencyLabel,
  formatMoney,
  type SpaceCurrency,
} from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { ChargePaymentDTO } from "@/app/actions/building";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export type UnitDetailModel = {
  id: string;
  name: string;
  area: number | null;
  multiplier: number;
  isActive: boolean;
  monthlyCharge: number;
  arrears: number;
  collected: number;
  linkedUserName: string | null;
  year: number;
  throughMonth: number;
  /** month 1–12 → payment or undefined */
  months: Partial<Record<number, ChargePaymentDTO>>;
};

type BuildingUnitDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: UnitDetailModel | null;
  currency: SpaceCurrency;
  canMutate: boolean;
  onRecordPayment?: (unitId: string, month: number) => void;
};

type MonthUiStatus = ChargeStatusValue | "MISSING" | "FUTURE";

function faDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

function monthStatus(
  payment: ChargePaymentDTO | undefined,
  month: number,
  throughMonth: number,
): MonthUiStatus {
  if (payment) return payment.status;
  if (month > throughMonth) return "FUTURE";
  return "MISSING";
}

function statusLabel(status: MonthUiStatus): string {
  if (status === "FUTURE") return "آینده";
  if (status === "MISSING") return "بدهکار";
  return CHARGE_STATUS_LABELS[status];
}

function multiplierLabel(multiplier: number): string {
  const x = multiplier / 1000;
  const text =
    Number.isInteger(x) || Math.abs(x * 10 - Math.round(x * 10)) < 1e-9
      ? String(Math.round(x * 10) / 10)
      : x.toFixed(2);
  return `${text.replace(".", "٫")}×`;
}

function monthCellTone(status: MonthUiStatus): string {
  switch (status) {
    case "PAID":
    case "WAIVED":
      return "border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200";
    case "PARTIAL":
      return "border-amber-500/35 bg-amber-500/12 text-amber-900 dark:text-amber-100";
    case "DUE":
    case "MISSING":
      return "border-rose-500/35 bg-rose-500/12 text-rose-800 dark:text-rose-200";
    default:
      return "border-border/40 bg-muted/40 text-muted-foreground";
  }
}

function monthDotTone(status: MonthUiStatus): string {
  switch (status) {
    case "PAID":
    case "WAIVED":
      return "bg-emerald-500";
    case "PARTIAL":
      return "bg-amber-500";
    case "DUE":
    case "MISSING":
      return "bg-rose-500";
    default:
      return "bg-muted-foreground/35";
  }
}

function shortMonthLabel(month: number): string {
  const full = MONTH_LABELS_FA[month] ?? "";
  return full.slice(0, 3) || faDigits(month);
}

/**
 * Keep Drawer + DrawerContent mounted even when `unit` is null.
 * Mounting Vaul with open=true on first paint leaves the sheet off-screen
 * while the blurred overlay stays visible.
 */
export function BuildingUnitDetailDrawer({
  open,
  onOpenChange,
  unit,
  currency,
  canMutate,
  onRecordPayment,
}: BuildingUnitDetailDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      {/*
        Do not put `relative` on DrawerContent — it overrides vaul's `fixed`
        (via tailwind-merge) so only the overlay shows and the sheet never
        docks to the viewport bottom.
      */}
      <DrawerContent className="mt-0 flex max-h-[92dvh] flex-col gap-0 overflow-hidden border-border/50 bg-background p-0">
        {unit ? (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <UnitDetailBody
              unit={unit}
              currency={currency}
              canMutate={canMutate}
              onRecordPayment={onRecordPayment}
            />
          </div>
        ) : (
          <DrawerHeader className="sr-only">
            <DrawerTitle>جزئیات واحد</DrawerTitle>
            <DrawerDescription>در حال آماده‌سازی</DrawerDescription>
          </DrawerHeader>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function UnitDetailBody({
  unit,
  currency,
  canMutate,
  onRecordPayment,
}: {
  unit: UnitDetailModel;
  currency: SpaceCurrency;
  canMutate: boolean;
  onRecordPayment?: (unitId: string, month: number) => void;
}) {
  const expectedYtd =
    unit.throughMonth > 0 ? unit.monthlyCharge * unit.throughMonth : 0;
  const unitLabel = currencyLabel(currency);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const settled = unit.arrears <= 0 && expectedYtd > 0;
  const collectionPct =
    expectedYtd > 0
      ? Math.min(100, Math.round((unit.collected / expectedYtd) * 100))
      : 0;
  const dueMonths = months.filter((m) => {
    const st = monthStatus(unit.months[m], m, unit.throughMonth);
    return st === "MISSING" || st === "DUE" || st === "PARTIAL";
  });
  const nextDueMonth = dueMonths[0] ?? unit.throughMonth;
  const heroAmount = settled ? null : unit.arrears;
  const stickyCtaMonth =
    canMutate && unit.throughMonth > 0 ? nextDueMonth : null;

  return (
    <>
        {/* Hero — status-first */}
        <div className="surface-hero relative shrink-0 overflow-hidden px-5 pb-5 pt-2">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-e-10 -top-14 size-40 rounded-full bg-on-hero/12 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-s-16 bottom-0 size-36 rounded-full bg-on-hero/8 blur-3xl"
          />

          <DrawerHeader className="relative space-y-0 p-0 text-start">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-micro font-medium tracking-wide text-on-hero/50">
                  واحد · {formatJalaliYear(unit.year)}
                </p>
                <DrawerTitle className="mt-0.5 text-title font-bold tracking-tight text-on-hero">
                  واحد {unit.name}
                </DrawerTitle>
              </div>
              <span
                className={cn(
                  "mt-1 shrink-0 rounded-full px-2.5 py-1 text-micro font-semibold backdrop-blur-sm",
                  unit.isActive
                    ? "bg-on-hero/15 text-on-hero"
                    : "bg-on-hero/10 text-on-hero/70",
                )}
              >
                {unit.isActive ? "فعال" : "غیرفعال"}
              </span>
            </div>

            <DrawerDescription className="mt-2 text-caption text-on-hero/75">
              {unit.linkedUserName ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="flex size-6 items-center justify-center rounded-full bg-on-hero/18 text-micro font-bold text-on-hero"
                  >
                    {unit.linkedUserName.trim().charAt(0) || "س"}
                  </span>
                  ساکن: {unit.linkedUserName}
                </span>
              ) : (
                "ساکن هنوز متصل نشده"
              )}
            </DrawerDescription>

            <div className="mt-4">
              <p className="text-caption text-on-hero/65">
                {settled
                  ? "وضعیت وصول"
                  : expectedYtd <= 0
                    ? "شارژ ماهانه"
                    : "بدهی معوق"}
              </p>
              <p className="mt-1 text-on-hero">
                {settled ? (
                  <span className="text-display font-bold leading-none tracking-tight">
                    تسویه
                  </span>
                ) : expectedYtd <= 0 ? (
                  <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-display font-bold leading-none tabular-nums tracking-tight">
                      {formatMoney(unit.monthlyCharge)}
                    </span>
                    <span className="text-body-sm font-semibold text-on-hero/70">
                      {unitLabel}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-display font-bold leading-none tabular-nums tracking-tight">
                      {formatMoney(heroAmount ?? 0)}
                    </span>
                    <span className="text-body-sm font-semibold text-on-hero/70">
                      {unitLabel}
                    </span>
                  </span>
                )}
              </p>
            </div>

            {expectedYtd > 0 ? (
              <div className="mt-4">
                <div className="flex items-baseline justify-between gap-2 text-micro text-on-hero/70">
                  <span>
                    وصول {formatMoney(unit.collected)} از{" "}
                    {formatMoney(expectedYtd)}
                  </span>
                  <span className="tabular-nums font-semibold text-on-hero">
                    {faDigits(collectionPct)}٪
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-on-hero/15"
                  role="progressbar"
                  aria-valuenow={collectionPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="درصد وصول تا امروز"
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
                      settled || collectionPct >= 100
                        ? "bg-emerald-300"
                        : collectionPct >= 50
                          ? "bg-on-hero"
                          : "bg-amber-200",
                    )}
                    style={{ width: `${collectionPct}%` }}
                  />
                </div>
              </div>
            ) : null}
          </DrawerHeader>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4",
            stickyCtaMonth
              ? "pb-[calc(5.25rem+env(safe-area-inset-bottom))]"
              : "pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
          )}
        >
          {/* Compact unit facts */}
          <div className="animate-fade-up flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-border/50 bg-card px-3.5 py-3 text-caption text-muted-foreground shadow-sm">
            <span>
              متراژ{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {unit.area != null ? `${faDigits(unit.area)} م²` : "—"}
              </span>
            </span>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span>
              ضریب{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {multiplierLabel(unit.multiplier)}
              </span>
            </span>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span>
              ماهانه{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatCurrency(unit.monthlyCharge, currency)}
              </span>
            </span>
          </div>

          {/* Snapshot chips */}
          {expectedYtd > 0 ? (
            <div className="animate-fade-up grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-card px-2.5 py-2.5 text-center shadow-sm ring-1 ring-border/45">
                <p className="text-micro text-muted-foreground">مقرر تا الان</p>
                <p className="mt-1 text-caption font-bold tabular-nums text-foreground">
                  {formatMoney(expectedYtd)}
                </p>
                <p className="text-[10px] text-muted-foreground">{unitLabel}</p>
              </div>
              <div className="rounded-2xl bg-success-soft/70 px-2.5 py-2.5 text-center shadow-sm ring-1 ring-success/20">
                <p className="text-micro text-success/80">وصول‌شده</p>
                <p className="mt-1 text-caption font-bold tabular-nums text-success">
                  {formatMoney(unit.collected)}
                </p>
                <p className="text-[10px] text-success/70">{unitLabel}</p>
              </div>
              <div
                className={cn(
                  "rounded-2xl px-2.5 py-2.5 text-center shadow-sm ring-1",
                  unit.arrears > 0
                    ? "bg-destructive-soft/80 ring-destructive/25"
                    : "bg-success-soft/50 ring-success/15",
                )}
              >
                <p
                  className={cn(
                    "text-micro",
                    unit.arrears > 0
                      ? "text-destructive/80"
                      : "text-success/80",
                  )}
                >
                  معوق
                </p>
                <p
                  className={cn(
                    "mt-1 text-caption font-bold tabular-nums",
                    unit.arrears > 0 ? "text-destructive" : "text-success",
                  )}
                >
                  {formatMoney(unit.arrears)}
                </p>
                <p
                  className={cn(
                    "text-[10px]",
                    unit.arrears > 0
                      ? "text-destructive/65"
                      : "text-success/65",
                  )}
                >
                  {unitLabel}
                </p>
              </div>
            </div>
          ) : null}

          {/* Year calendar — glanceable */}
          <section className="animate-fade-up">
            <div className="mb-2 flex items-end justify-between gap-2">
              <h3 className="text-body-sm font-semibold text-foreground">
                تقویم {formatJalaliYear(unit.year)}
              </h3>
              <p className="text-micro text-muted-foreground">
                {canMutate ? "برای ثبت وصول بزنید" : "وضعیت ماه‌ها"}
              </p>
            </div>

            <ul className="grid grid-cols-4 gap-1.5">
              {months.map((m) => {
                const payment = unit.months[m];
                const st = monthStatus(payment, m, unit.throughMonth);
                const interactive =
                  canMutate && st !== "FUTURE" && Boolean(onRecordPayment);
                const isCurrent = m === unit.throughMonth;
                return (
                  <li key={m}>
                    <button
                      type="button"
                      disabled={!interactive}
                      onClick={() => onRecordPayment?.(unit.id, m)}
                      aria-label={`${MONTH_LABELS_FA[m]} · ${statusLabel(st)}`}
                      className={cn(
                        "flex h-full min-h-17 w-full flex-col items-stretch justify-between rounded-2xl border px-2 py-2 text-start transition-[transform,box-shadow,border-color] duration-150 ease-out",
                        monthCellTone(st),
                        interactive &&
                          "hover:shadow-sm active:scale-[0.97] motion-reduce:active:scale-100",
                        !interactive && "cursor-default opacity-90",
                        isCurrent && "ring-2 ring-primary/35 ring-offset-1 ring-offset-sheet",
                      )}
                    >
                      <span className="flex items-center justify-between gap-1">
                        <span className="text-caption font-bold">
                          {shortMonthLabel(m)}
                        </span>
                        <span
                          aria-hidden
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            monthDotTone(st),
                          )}
                        />
                      </span>
                      <span className="text-[10px] font-semibold leading-tight">
                        {statusLabel(st)}
                      </span>
                      {st !== "FUTURE" ? (
                        <span className="truncate text-[10px] tabular-nums opacity-80">
                          {payment &&
                          (payment.status === "PAID" ||
                            payment.status === "PARTIAL")
                            ? formatMoney(payment.amount)
                            : st === "MISSING" || st === "DUE"
                              ? formatMoney(unit.monthlyCharge)
                              : payment?.status === "WAIVED"
                                ? "معاف"
                                : "—"}
                        </span>
                      ) : (
                        <span className="text-[10px] opacity-50">—</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-micro text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                پرداخت‌شده
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-rose-500" />
                بدهکار
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber-500" />
                جزئی
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-muted-foreground/35" />
                آینده
              </li>
            </ul>
          </section>
        </div>

        {stickyCtaMonth ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-sheet via-sheet/95 to-transparent px-5 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-8">
            <Button
              type="button"
              className="pointer-events-auto h-12 w-full rounded-2xl text-body-sm font-semibold shadow-fab transition-transform duration-150 active:scale-[0.98] motion-reduce:active:scale-100"
              onClick={() => onRecordPayment?.(unit.id, stickyCtaMonth)}
            >
              ثبت وصول {MONTH_LABELS_FA[stickyCtaMonth]}
            </Button>
          </div>
        ) : null}
    </>
  );
}
