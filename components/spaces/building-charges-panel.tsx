"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  upsertChargePayment,
  type AnnualChargeCalendarDTO,
  type BuildingDashboardDTO,
  type BuildingUnitRow,
  type ChargePaymentDTO,
  type ChargePaymentProofDTO,
  type UnitDTO,
} from "@/app/actions/building";
import { BuildingAnnualCalendar } from "@/components/spaces/building-annual-calendar";
import { BuildingExportButtons } from "@/components/spaces/building-export-buttons";
import { BuildingProofsInbox } from "@/components/spaces/building-proofs-inbox";
import {
  BuildingUnitDetailDrawer,
  type UnitDetailModel,
} from "@/components/spaces/building-unit-detail-drawer";
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
import { useUnsavedCloseGuard } from "@/components/ui/unsaved-close-guard";
import {
  CHARGE_STATUS_LABELS,
  defaultChargePaymentIso,
  formatJalaliYear,
  monthLabelFa,
  type ChargeStatusValue,
} from "@/lib/building";
import {
  currencyLabel,
  formatMoney,
  type SpaceCurrency,
} from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

type PayDraftBaseline = {
  amount: number;
  status: ChargeStatusValue;
  note: string;
  date: string;
};

type ChargesView = "month" | "cal-month" | "cal-year";

function readChargesView(): ChargesView {
  if (typeof window === "undefined") return "month";
  const v = new URL(window.location.href).searchParams.get("cview");
  if (v === "cal" || v === "calendar") return "cal-month";
  if (v === "year" || v === "grid") return "cal-year";
  return "month";
}

function readChargesMonth(fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const n = Number(
    new URL(window.location.href).searchParams.get("cmonth"),
  );
  if (Number.isInteger(n) && n >= 1 && n <= 12) return n;
  return fallback;
}

/** Deep-link month/view on the charges tab (`?cview=&cmonth=`). */
function syncChargesQuery(view: ChargesView, month: number) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const prev = `${url.pathname}${url.search}`;
  if (view === "month") url.searchParams.set("cview", "month");
  else if (view === "cal-month") url.searchParams.set("cview", "cal");
  else url.searchParams.set("cview", "year");
  url.searchParams.set("cmonth", String(month));
  const next = `${url.pathname}${url.search}`;
  if (prev !== next) window.history.replaceState(null, "", next);
  window.dispatchEvent(
    new CustomEvent("superhesab:charges-view", { detail: { view } }),
  );
}

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
  unitsHref: string;
  dashboard: BuildingDashboardDTO;
  calendar: AnnualChargeCalendarDTO | null;
  currency: SpaceCurrency;
  canMutate: boolean;
  isOwner: boolean;
  chargeProofs?: ChargePaymentProofDTO[];
  buildingUnits?: BuildingUnitRow[];
};

export function BuildingChargesPanel({
  spaceId,
  settingsHref,
  unitsHref,
  dashboard,
  calendar,
  currency,
  canMutate,
  isOwner,
  chargeProofs = [],
  buildingUnits = [],
}: BuildingChargesPanelProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const defaultMonth = Math.max(1, dashboard.throughMonth || 1);
  const [view, setView] = useState<ChargesView>(readChargesView);
  const [month, setMonth] = useState(() => readChargesMonth(defaultMonth));
  const [debtorsOpen, setDebtorsOpen] = useState(
    () => dashboard.debtors.length > 0 && dashboard.debtors.length <= 6,
  );
  const [settledOpen, setSettledOpen] = useState(false);

  function selectView(next: ChargesView) {
    setView(next);
    syncChargesQuery(next, month);
  }

  // Announce initial view so FAB can hide on calendar/year deep-links.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("superhesab:charges-view", {
        detail: { view: readChargesView() },
      }),
    );
  }, []);

  function selectMonth(next: number) {
    setMonth(next);
    syncChargesQuery(view, next);
  }
  const [payUnit, setPayUnit] = useState<UnitDTO | null>(null);
  /** Separate from payUnit so the title stays during the close animation. */
  const [payOpen, setPayOpen] = useState(false);
  const payClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [amount, setAmount] = useState(0);
  const [status, setStatus] = useState<ChargeStatusValue>("PAID");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() =>
    defaultChargePaymentIso(dashboard.year, defaultMonth),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [detailUnit, setDetailUnit] = useState<UnitDetailModel | null>(null);
  const payBaseline = useRef<PayDraftBaseline | null>(null);

  const unitLabel = currencyLabel(currency);

  const payDirty = Boolean(
    payUnit &&
      payBaseline.current &&
      (amount !== payBaseline.current.amount ||
        status !== payBaseline.current.status ||
        note !== payBaseline.current.note ||
        date !== payBaseline.current.date),
  );
  const { requestOpenChange, discardConfirm } = useUnsavedCloseGuard(
    payDirty || pending,
  );

  useEffect(() => {
    if (!payDirty && !pending) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [payDirty, pending]);

  function clearPayClearTimer() {
    if (payClearTimer.current) {
      clearTimeout(payClearTimer.current);
      payClearTimer.current = null;
    }
  }

  useEffect(() => () => clearPayClearTimer(), []);

  function finishClosePayDrawer() {
    setPayOpen(false);
    payBaseline.current = null;
    setError(null);
    setNoteOpen(false);
    clearPayClearTimer();
    // Keep payUnit until exit animation ends so title doesn't flash empty.
    payClearTimer.current = setTimeout(() => {
      setPayUnit(null);
      payClearTimer.current = null;
    }, 450);
  }

  function closePayDrawer() {
    requestOpenChange(false, (next) => {
      if (!next) finishClosePayDrawer();
    });
  }

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

  const monthStats = useMemo(() => {
    let expected = 0;
    let collected = 0;
    for (const u of activeUnits) {
      expected += u.monthlyCharge;
      const p = paymentByUnit.get(u.id);
      if (p && (p.status === "PAID" || p.status === "PARTIAL" || p.status === "WAIVED")) {
        collected += p.amount;
      }
    }
    const unsettled = activeUnits.length - paidThisMonth;
    return { expected, collected, unsettled };
  }, [activeUnits, paymentByUnit, paidThisMonth]);

  /** Unsettled first, then by name — action queue for managers. */
  const monthUnits = useMemo(() => {
    return [...activeUnits].sort((a, b) => {
      const sa = paymentByUnit.get(a.id)?.status;
      const sb = paymentByUnit.get(b.id)?.status;
      const aOk = sa === "PAID" || sa === "WAIVED";
      const bOk = sb === "PAID" || sb === "WAIVED";
      if (aOk !== bOk) return aOk ? 1 : -1;
      return a.name.localeCompare(b.name, "fa");
    });
  }, [activeUnits, paymentByUnit]);

  const { unsettledUnits, settledUnits } = useMemo(() => {
    const unsettled: UnitDTO[] = [];
    const settled: UnitDTO[] = [];
    for (const u of monthUnits) {
      const s = paymentByUnit.get(u.id)?.status;
      if (s === "PAID" || s === "WAIVED") settled.push(u);
      else unsettled.push(u);
    }
    return { unsettledUnits: unsettled, settledUnits: settled };
  }, [monthUnits, paymentByUnit]);

  const collectPct =
    activeUnits.length > 0
      ? Math.round((paidThisMonth / activeUnits.length) * 100)
      : 0;

  function defaultPayDate(forMonth: number = month) {
    return defaultChargePaymentIso(dashboard.year, forMonth);
  }

  function openPay(unit: UnitDTO) {
    const existing = paymentByUnit.get(unit.id);
    const nextAmount = existing?.amount ?? unit.monthlyCharge ?? 0;
    const nextStatus = existing?.status ?? "PAID";
    const nextNote = existing?.note ?? "";
    const nextDate = existing?.date ?? defaultPayDate();
    clearPayClearTimer();
    setPayUnit(unit);
    setPayOpen(true);
    setAmount(nextAmount);
    setStatus(nextStatus);
    setNote(nextNote);
    setNoteOpen(Boolean(existing?.note));
    setDate(nextDate);
    setError(null);
    payBaseline.current = {
      amount: nextAmount,
      status: nextStatus,
      note: nextNote,
      date: nextDate,
    };
  }

  /** FAB «ثبت وصول» on the charges tab. */
  useEffect(() => {
    if (!canMutate) return;
    const onCollect = () => {
      setView("month");
      syncChargesQuery("month", month);
      const unpaid = monthUnits.find((u) => {
        const s = paymentByUnit.get(u.id)?.status;
        return s !== "PAID" && s !== "WAIVED";
      });
      if (unpaid) {
        openPay(unpaid);
        return;
      }
      showToast("همه واحدهای این ماه تسویه شده‌اند", "success");
    };
    window.addEventListener("superhesab:charges-collect", onCollect);
    return () =>
      window.removeEventListener("superhesab:charges-collect", onCollect);
  }, [canMutate, month, monthUnits, paymentByUnit, showToast]);

  function openPayFromCalendar(args: {
    unitId: string;
    unitName: string;
    month: number;
    monthlyCharge: number;
    payment: ChargePaymentDTO | null;
  }) {
    setDetailUnit(null);
    setMonth(args.month);
    syncChargesQuery(view, args.month);
    const dash = dashboard.units.find((u) => u.id === args.unitId);
    clearPayClearTimer();
    setPayUnit({
      id: args.unitId,
      name: args.unitName,
      area: dash?.area ?? null,
      multiplier: dash?.multiplier ?? 1000,
      isActive: dash?.isActive ?? true,
      monthlyCharge: args.monthlyCharge,
      arrears: dash?.arrears ?? 0,
      collected: dash?.collected ?? 0,
    });
    setPayOpen(true);
    const nextAmount = args.payment?.amount ?? args.monthlyCharge ?? 0;
    const nextStatus = args.payment?.status ?? "PAID";
    const nextNote = args.payment?.note ?? "";
    const nextDate =
      args.payment?.date ?? defaultPayDate(args.month);
    setAmount(nextAmount);
    setStatus(nextStatus);
    setNote(nextNote);
    setNoteOpen(Boolean(args.payment?.note));
    setDate(nextDate);
    setError(null);
    payBaseline.current = {
      amount: nextAmount,
      status: nextStatus,
      note: nextNote,
      date: nextDate,
    };
  }

  function openUnitDetail(unitId: string) {
    const dash = dashboard.units.find((u) => u.id === unitId);
    const meta = buildingUnits.find((u) => u.id === unitId);
    const calUnit = calendar?.units.find((u) => u.id === unitId);
    if (!dash && !calUnit) return;

    const months: UnitDetailModel["months"] = {
      ...(calendar?.byUnitMonth[unitId] ?? {}),
    };

    setDetailUnit({
      id: unitId,
      name: dash?.name ?? calUnit?.name ?? "—",
      area: dash?.area ?? meta?.area ?? null,
      multiplier: dash?.multiplier ?? meta?.multiplier ?? 1000,
      isActive: dash?.isActive ?? meta?.isActive ?? true,
      monthlyCharge:
        dash?.monthlyCharge ?? calUnit?.monthlyCharge ?? 0,
      arrears: dash?.arrears ?? 0,
      collected: dash?.collected ?? 0,
      linkedUserName: meta?.linkedUserName ?? null,
      year: calendar?.year ?? dashboard.year,
      throughMonth: calendar?.throughMonth ?? dashboard.throughMonth,
      months,
    });
  }

  function recordPaymentFromDetail(unitId: string, monthNum: number) {
    const dash = dashboard.units.find((u) => u.id === unitId);
    const calUnit = calendar?.units.find((u) => u.id === unitId);
    if (!dash && !calUnit) return;
    const payment =
      calendar?.byUnitMonth[unitId]?.[monthNum] ??
      dashboard.payments.find(
        (p) => p.unitId === unitId && p.month === monthNum,
      ) ??
      null;
    openPayFromCalendar({
      unitId,
      unitName: dash?.name ?? calUnit?.name ?? "—",
      month: monthNum,
      monthlyCharge:
        dash?.monthlyCharge ?? calUnit?.monthlyCharge ?? 0,
      payment,
    });
  }

  function onSavePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payUnit || pending) return;
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

    const savedUnitId = payUnit.id;
    const savedStatus = status;

    startTransition(async () => {
      const result = await upsertChargePayment(payload);
      if (!result.ok) {
        const msg = result.error || "خطا در ثبت اطلاعات";
        setError(msg);
        showToast(msg, "error");
        return;
      }
      showToast("ثبت شد");
      payBaseline.current = null;

      const settledOk = savedStatus === "PAID" || savedStatus === "WAIVED";
      if (settledOk) {
        const next = monthUnits.find((u) => {
          if (u.id === savedUnitId) return false;
          const s = paymentByUnit.get(u.id)?.status;
          return s !== "PAID" && s !== "WAIVED";
        });
        if (next) {
          openPay(next);
          router.refresh();
          return;
        }
      }

      setPayOpen(false);
      clearPayClearTimer();
      payClearTimer.current = setTimeout(() => {
        setPayUnit(null);
        payClearTimer.current = null;
      }, 450);
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
            <Link href={unitsHref}>افزودن واحد</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  const viewOptions = [
    {
      value: "month" as const,
      label: "وصول ماهانه",
      panelId: "charges-panel-month",
      tabId: "charges-tab-month",
    },
    {
      value: "cal-month" as const,
      label: "تقویم ماه",
      panelId: "charges-panel-calendar",
      tabId: "charges-tab-cal-month",
    },
    {
      value: "cal-year" as const,
      label: "نمای سال",
      panelId: "charges-panel-calendar",
      tabId: "charges-tab-cal-year",
    },
  ] as const;

  return (
    <div className="space-y-3 pb-24">
      {canMutate ? (
        <BuildingProofsInbox
          spaceId={spaceId}
          proofs={chargeProofs}
          currency={currency}
          canReview={canMutate}
        />
      ) : null}

      {/* Single 3-way view — KPIs stay on the building hero */}
      <div
        role="tablist"
        aria-label="نمای شارژ"
        className="grid grid-cols-3 gap-1 rounded-[1.15rem] border border-border/45 bg-card p-1 shadow-sm"
      >
        {viewOptions.map((opt) => {
          const active = view === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              id={opt.tabId}
              aria-controls={opt.panelId}
              aria-selected={active}
              onClick={() => selectView(opt.value)}
              className={cn(
                "flex h-10 items-center justify-center rounded-xl px-1.5 text-center transition-colors active:scale-[0.99]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <span className="text-[11px] font-semibold leading-tight sm:text-caption">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {view === "cal-month" || view === "cal-year" ? (
        <div
          id="charges-panel-calendar"
          role="tabpanel"
          aria-labelledby={
            view === "cal-year"
              ? "charges-tab-cal-year"
              : "charges-tab-cal-month"
          }
          className="rounded-[1.25rem] border border-border/45 bg-card px-3.5 py-3.5 shadow-sm"
        >
          {calendar ? (
            <BuildingAnnualCalendar
              spaceId={spaceId}
              calendar={calendar}
              canMutate={canMutate}
              mode={view === "cal-year" ? "grid" : "month"}
              hideModeSwitch
              hideYearNav
              onCellClick={canMutate ? openPayFromCalendar : undefined}
              onUnitClick={openUnitDetail}
              toolbarEnd={
                <BuildingExportButtons
                  spaceId={spaceId}
                  year={dashboard.year}
                  canExport={canMutate}
                  className="h-8 rounded-lg"
                />
              }
            />
          ) : (
            <p className="py-6 text-center text-body-sm text-muted-foreground">
              بارگذاری تقویم ممکن نیست.
            </p>
          )}
        </div>
      ) : (
        <div
          id="charges-panel-month"
          role="tabpanel"
          aria-labelledby="charges-tab-month"
          className="space-y-3"
        >
          {/* Month chips + one-line progress (hero holds year KPIs) */}
          <div className="flex items-center gap-2">
            <div
              role="radiogroup"
              aria-label="انتخاب ماه"
              className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 scrollbar-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const on = month === m;
                const isCurrent = m === dashboard.throughMonth;
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => selectMonth(m)}
                    className={cn(
                      "relative shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-transform active:scale-95 sm:px-3 sm:text-caption",
                      on
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {monthLabelFa(m)}
                    {isCurrent && !on ? (
                      <span
                        className="absolute inset-x-0 -bottom-1 mx-auto size-1 rounded-full bg-primary/70"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <BuildingExportButtons
              spaceId={spaceId}
              year={dashboard.year}
              canExport={canMutate}
              className="h-8 shrink-0 rounded-lg"
            />
          </div>

          <div
            className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-card px-3 py-2 shadow-sm"
            aria-label="پیشرفت وصول این ماه"
          >
            <div
              className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={collectPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="درصد واحدهای تسویه‌شده این ماه"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300 ease-out",
                  collectPct >= 100
                    ? "bg-success"
                    : collectPct >= 50
                      ? "bg-primary"
                      : "bg-primary/80",
                )}
                style={{ width: `${collectPct}%` }}
              />
            </div>
            <p className="shrink-0 text-[11px] font-bold tabular-nums text-foreground">
              {paidThisMonth.toLocaleString("fa-IR")}/
              {activeUnits.length.toLocaleString("fa-IR")}
            </p>
            <p className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {collectPct.toLocaleString("fa-IR")}٪
            </p>
            {monthStats.unsettled > 0 ? (
              <p className="shrink-0 text-[11px] font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                {monthStats.unsettled.toLocaleString("fa-IR")} باز
              </p>
            ) : (
              <p className="shrink-0 text-[11px] font-semibold text-success">
                کامل
              </p>
            )}
          </div>

          {/* Year arrears glance — like trip «مانده خالص» debtors */}
          {dashboard.debtors.length > 0 ? (
            <section className="overflow-hidden rounded-2xl border border-border/45 bg-card shadow-sm">
              <button
                type="button"
                aria-expanded={debtorsOpen}
                aria-controls="building-debtors-panel"
                onClick={() => setDebtorsOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-start transition-colors active:bg-muted/40"
              >
                <span className="text-caption font-bold text-foreground">
                  معوق سال
                  <span className="ms-1.5 font-normal text-muted-foreground">
                    · {dashboard.debtors.length.toLocaleString("fa-IR")} واحد
                  </span>
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-destructive">
                  {formatMoney(dashboard.totals.arrearsTotal)}
                  <span className="ms-1.5 font-medium text-muted-foreground">
                    {debtorsOpen ? "▴" : "▾"}
                  </span>
                </span>
              </button>
              {debtorsOpen ? (
                <ul
                  id="building-debtors-panel"
                  className="divide-y divide-border/35 border-t border-border/40"
                >
                  {dashboard.debtors.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => openUnitDetail(u.id)}
                        className="flex w-full items-center justify-between gap-2 px-3.5 py-2 text-start transition-colors active:bg-muted/30"
                      >
                        <span className="truncate text-caption font-medium text-foreground">
                          واحد {u.name}
                        </span>
                        <span className="shrink-0 text-caption font-bold tabular-nums text-destructive">
                          −{formatMoney(u.arrears)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {/* Action queue — unsettled first (trip «برای تسویه») */}
          <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
            <div className="flex items-baseline justify-between gap-2 border-b border-border/40 px-3.5 py-2.5">
              <h3 className="text-caption font-bold text-foreground">
                برای وصول
              </h3>
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {unsettledUnits.length > 0
                  ? `${unsettledUnits.length.toLocaleString("fa-IR")} واحد`
                  : "همه تسویه"}
              </p>
            </div>
            {unsettledUnits.length === 0 ? (
              <p className="px-3.5 py-4 text-center text-caption text-success">
                همه واحدهای این ماه تسویه شده‌اند
              </p>
            ) : (
              <ul className="divide-y divide-border/35">
                {unsettledUnits.map((unit) => (
                  <ChargeUnitRow
                    key={unit.id}
                    unit={unit}
                    payment={paymentByUnit.get(unit.id)}
                    canMutate={canMutate}
                    onDetail={() => openUnitDetail(unit.id)}
                    onPay={() => openPay(unit)}
                  />
                ))}
              </ul>
            )}
          </section>

          {settledUnits.length > 0 ? (
            <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/80 shadow-sm">
              <button
                type="button"
                aria-expanded={settledOpen}
                onClick={() => setSettledOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-start transition-colors active:bg-muted/30"
              >
                <h3 className="text-caption font-semibold text-muted-foreground">
                  تسویه‌شده این ماه
                  <span className="ms-1.5 tabular-nums">
                    ({settledUnits.length.toLocaleString("fa-IR")})
                  </span>
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  {settledOpen ? "بستن" : "نمایش"}
                </span>
              </button>
              {settledOpen ? (
                <ul className="divide-y divide-border/30 border-t border-border/35">
                  {settledUnits.map((unit) => (
                    <ChargeUnitRow
                      key={unit.id}
                      unit={unit}
                      payment={paymentByUnit.get(unit.id)}
                      canMutate={canMutate}
                      dimmed
                      onDetail={() => openUnitDetail(unit.id)}
                      onPay={() => openPay(unit)}
                    />
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </div>
      )}

      <Drawer
        open={payOpen}
        onOpenChange={(open) => {
          if (open) return;
          closePayDrawer();
        }}
        repositionInputs={false}
      >
        <DrawerContent className="mt-0! flex max-h-[85dvh] flex-col gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero shrink-0 px-4 pb-2.5 pt-1">
            <DrawerHeader className="space-y-0 p-0 text-start">
              <DrawerTitle className="text-body font-bold text-on-hero">
                وصول — واحد {payUnit?.name}
              </DrawerTitle>
              <DrawerDescription asChild>
                <div className="mt-1 space-y-0.5 text-caption text-on-hero/70">
                  <p>
                    {monthLabelFa(month)} {formatJalaliYear(dashboard.year)}
                  </p>
                  {payUnit ? (
                    <p>
                      مقرر {formatCurrency(payUnit.monthlyCharge, currency)}
                    </p>
                  ) : null}
                </div>
              </DrawerDescription>
            </DrawerHeader>
          </div>

          <form
            onSubmit={onSavePayment}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="surface-sheet-canvas min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
              <div
                role="radiogroup"
                aria-label="وضعیت پرداخت"
                className="grid grid-cols-2 gap-1.5"
              >
                {(
                  ["PAID", "PARTIAL", "DUE", "WAIVED"] as const
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={status === s}
                    onClick={() => {
                      setStatus(s);
                      if (s === "PAID" && payUnit) {
                        setAmount(payUnit.monthlyCharge);
                      } else if (s === "WAIVED" || s === "DUE") {
                        setAmount(0);
                      }
                    }}
                    className={cn(
                      "flex h-11 items-center justify-center rounded-xl px-2 text-caption font-semibold transition-colors",
                      status === s
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {CHARGE_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>

              {status !== "DUE" && status !== "WAIVED" ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="charge-payment-amount"
                      className="text-label text-muted-foreground"
                    >
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
                    id="charge-payment-amount"
                    name="amount"
                    autoComplete="off"
                    value={amount}
                    onValueChange={setAmount}
                    className="h-11 rounded-xl text-base font-bold"
                  />
                </div>
              ) : (
                <p className="rounded-xl bg-muted/50 px-3 py-2.5 text-caption text-muted-foreground">
                  {status === "WAIVED"
                    ? "معاف — مبلغ صفر ثبت می‌شود"
                    : "بدهکار — بدون پرداخت برای این ماه"}
                </p>
              )}

              <div className="space-y-1">
                <label
                  htmlFor="charge-payment-date"
                  className="text-label text-muted-foreground"
                >
                  تاریخ
                </label>
                <JalaliDatePicker
                  id="charge-payment-date"
                  value={date}
                  onChange={setDate}
                  variant="compact"
                />
              </div>

              {noteOpen ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="charge-payment-note"
                      className="text-label text-muted-foreground"
                    >
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
                    id="charge-payment-note"
                    name="note"
                    autoComplete="off"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="اختیاری…"
                    className="h-11 rounded-xl"
                    maxLength={200}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setNoteOpen(true)}
                  className="flex h-10 w-full items-center justify-center rounded-xl border border-dashed border-border/60 text-caption font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
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
                  aria-live="assertive"
                >
                  {error}
                </p>
              ) : null}
              {/* Save first in DOM → right side under RTL */}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="h-11 flex-[1.4] rounded-xl text-primary-foreground"
                  disabled={pending}
                >
                  {pending ? "در حال ذخیره…" : "ذخیره"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-xl"
                  disabled={pending}
                  onClick={closePayDrawer}
                >
                  انصراف
                </Button>
              </div>
            </div>
          </form>
        </DrawerContent>
      </Drawer>

      <BuildingUnitDetailDrawer
        open={Boolean(detailUnit)}
        onOpenChange={(open) => {
          if (!open) setDetailUnit(null);
        }}
        unit={detailUnit}
        currency={currency}
        canMutate={canMutate}
        onRecordPayment={canMutate ? recordPaymentFromDetail : undefined}
      />

      {discardConfirm}
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

function ChargeUnitRow({
  unit,
  payment,
  canMutate,
  dimmed,
  onDetail,
  onPay,
}: {
  unit: UnitDTO;
  payment?: ChargePaymentDTO;
  canMutate: boolean;
  dimmed?: boolean;
  onDetail: () => void;
  onPay: () => void;
}) {
  const payStatus = payment?.status;
  const isSettled = payStatus === "PAID" || payStatus === "WAIVED";
  const hasArrears = unit.arrears > 0;
  const monthAmount = isSettled
    ? (payment?.amount ?? unit.monthlyCharge)
    : unit.monthlyCharge;

  return (
    <li
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 [content-visibility:auto] [contain-intrinsic-size:auto_3.25rem]",
        dimmed && "opacity-80",
      )}
    >
      <button
        type="button"
        onClick={onDetail}
        aria-label={`جزئیات واحد ${unit.name}`}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold transition-transform active:scale-95",
          isSettled
            ? "bg-success-soft text-success"
            : hasArrears
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
        )}
      >
        {unit.name}
      </button>
      <button
        type="button"
        onClick={() => (canMutate && !isSettled ? onPay() : onDetail())}
        className="min-w-0 flex-1 text-start"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-caption font-semibold text-foreground">
            واحد {unit.name}
          </span>
          {payStatus ? (
            <StatusPill status={payStatus} />
          ) : (
            <span className="rounded-md bg-amber-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-200">
              باز
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
          {isSettled ? "پرداخت" : "مقرر"}{" "}
          <span
            className={cn(
              "font-semibold",
              isSettled ? "text-success" : "text-foreground",
            )}
          >
            {formatMoney(monthAmount)}
          </span>
          {hasArrears ? (
            <span className="text-destructive">
              {" "}
              · معوق {formatMoney(unit.arrears)}
            </span>
          ) : null}
          {payment && !isSettled && payStatus === "PARTIAL" ? (
            <span> · جز {formatMoney(payment.amount)}</span>
          ) : null}
        </p>
      </button>
      {canMutate ? (
        <Button
          type="button"
          variant={isSettled ? "outline" : "default"}
          size="sm"
          className={cn(
            "h-9 shrink-0 rounded-xl px-3 text-[11px] font-semibold",
            !isSettled && "text-primary-foreground",
          )}
          onClick={onPay}
        >
          {isSettled ? "ویرایش" : payment ? "ادامه" : "ثبت"}
        </Button>
      ) : null}
    </li>
  );
}

