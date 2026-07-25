"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  assignFundTurn,
  setFundPayment,
  type FundDashboardDTO,
} from "@/app/actions/fund";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type FundDashboardPanelProps = {
  spaceId: string;
  dashboard: FundDashboardDTO;
  currency: SpaceCurrency;
  canMutate: boolean;
  isOwner: boolean;
  settingsHref: string;
};

export function FundDashboardPanel({
  spaceId,
  dashboard,
  currency,
  canMutate,
  isOwner,
  settingsHref,
}: FundDashboardPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onAssignWinner(winnerMemberId: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await assignFundTurn({
        spaceId,
        periodIndex: dashboard.periodIndex,
        winnerMemberId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onTogglePaid(memberId: string, paid: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setFundPayment({
        spaceId,
        periodIndex: dashboard.periodIndex,
        memberId,
        paid,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const progress =
    dashboard.expectedTotal > 0
      ? Math.min(
          100,
          Math.round(
            (dashboard.collectedTotal * 100) / dashboard.expectedTotal,
          ),
        )
      : 0;

  const paidCount = dashboard.members.filter((m) => m.paid).length;
  const memberCount = dashboard.members.length;

  if (!dashboard.plan) {
    return (
      <div className="animate-fade-up">
        <section className="rounded-2xl border border-dashed border-border/70 bg-card/80 p-5 text-center shadow-sm">
          <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <PlanIcon className="size-5" />
          </div>
          <h2 className="mt-3 text-body font-semibold text-foreground">
            پلن صندوق هنوز تعریف نشده
          </h2>
          <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
            مبلغ سهم و تعداد دوره را در تنظیمات مشخص کنید.
          </p>
          {isOwner ? (
            <Button
              asChild
              className="mt-4 h-11 w-full rounded-xl active:scale-[0.98]"
            >
              <Link href={settingsHref}>رفتن به تنظیمات پلن</Link>
            </Button>
          ) : (
            <p className="mt-3 text-body-sm text-muted-foreground">
              منتظر تعریف پلن توسط مالک باشید.
            </p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-3">
      {error ? (
        <p
          className="rounded-xl bg-destructive-soft px-3 py-2 text-body-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 pb-2.5 pt-3.5">
          <div>
            <p className="text-caption text-muted-foreground">دوره جاری</p>
            <p className="mt-0.5 text-[1.25rem] font-bold leading-none tabular-nums tracking-tight text-foreground">
              {dashboard.periodIndex}
              <span className="ms-1 text-caption font-semibold text-muted-foreground">
                / {dashboard.plan.periodCount}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-muted/70 px-2 py-1 text-caption tabular-nums text-muted-foreground">
              {paidCount}/{memberCount} پرداخت
            </span>
            <Link
              href={settingsHref}
              className="inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.96]"
              aria-label="تنظیمات پلن"
              title="تنظیمات پلن"
            >
              <GearMiniIcon className="size-4" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-1">
            {dashboard.periods.map((p) => {
              const active = p.periodIndex === dashboard.periodIndex;
              const assigned = p.status === "ASSIGNED";
              return (
                <Link
                  key={p.periodIndex}
                  href={`/spaces/${spaceId}?period=${p.periodIndex}`}
                  title={
                    p.winnerName
                      ? `دوره ${p.periodIndex} · ${p.winnerName}`
                      : `دوره ${p.periodIndex}`
                  }
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold tabular-nums transition-[transform,background-color,color] active:scale-95",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : assigned
                        ? "bg-success-soft text-success ring-1 ring-success/20"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.periodIndex}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 border-t border-border/40 px-4 py-3.5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-caption font-medium text-muted-foreground">
                نوبت این دوره
              </p>
              {dashboard.turnStatus === "ASSIGNED" ? (
                <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-[0.65rem] font-bold text-success">
                  تعیین‌شده
                </span>
              ) : (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-bold text-muted-foreground">
                  باز
                </span>
              )}
            </div>
            {canMutate ? (
              <Select
                value={dashboard.winnerMemberId ?? "__none__"}
                onValueChange={(v) =>
                  onAssignWinner(v === "__none__" ? null : v)
                }
                disabled={pending}
              >
                <SelectTrigger className="mt-1.5 h-10 rounded-xl">
                  <SelectValue placeholder="انتخاب برنده" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— بدون برنده —</SelectItem>
                  {dashboard.members.map((m) => {
                    const wonAt =
                      dashboard.winnerTakenByMember[m.memberId] ?? null;
                    const blocked =
                      wonAt != null && wonAt !== dashboard.periodIndex;
                    return (
                      <SelectItem
                        key={m.memberId}
                        value={m.memberId}
                        disabled={blocked}
                      >
                        {blocked
                          ? `${m.name} · نوبت ${wonAt}`
                          : `${m.name} (${m.shareLabel}×)`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <p className="mt-1 truncate text-body-sm font-semibold text-foreground">
                {dashboard.winnerName ?? "هنوز تعیین نشده"}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-caption text-muted-foreground">وصول</p>
              <p className="text-caption font-semibold tabular-nums text-foreground">
                {formatCurrency(dashboard.collectedTotal, currency)}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  / {formatCurrency(dashboard.expectedTotal, currency)}
                </span>
              </p>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300 ease-out",
                  progress >= 100 ? "bg-success" : "bg-primary",
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-caption tabular-nums text-muted-foreground">
              سهم ۱×:{" "}
              <span className="font-medium text-foreground/80">
                {formatCurrency(dashboard.plan.shareAmount, currency)}
              </span>
            </p>
          </div>
        </div>
      </section>

      {dashboard.periodReport ? (
        <section className="rounded-2xl border border-border/50 bg-card px-3.5 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-caption font-semibold text-muted-foreground">
              گزارش دوره {dashboard.periodReport.periodIndex}
            </p>
            {dashboard.periodReport.isComplete ? (
              <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-[0.65rem] font-bold text-success">
                کامل
              </span>
            ) : (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-bold tabular-nums text-muted-foreground">
                {dashboard.periodReport.progressPercent}٪
              </span>
            )}
          </div>
          <dl className="mt-2.5 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-muted/45 px-2.5 py-2">
              <dt className="text-[0.65rem] text-muted-foreground">وصول</dt>
              <dd className="mt-0.5 text-caption font-semibold tabular-nums text-foreground">
                {formatCurrency(
                  dashboard.periodReport.collectedTotal,
                  currency,
                )}
              </dd>
            </div>
            <div className="rounded-xl bg-muted/45 px-2.5 py-2">
              <dt className="text-[0.65rem] text-muted-foreground">کسری</dt>
              <dd
                className={cn(
                  "mt-0.5 text-caption font-semibold tabular-nums",
                  dashboard.periodReport.shortfall > 0
                    ? "text-destructive"
                    : "text-foreground",
                )}
              >
                {formatCurrency(dashboard.periodReport.shortfall, currency)}
              </dd>
            </div>
            <div className="rounded-xl bg-muted/45 px-2.5 py-2">
              <dt className="text-[0.65rem] text-muted-foreground">پرداخت</dt>
              <dd className="mt-0.5 text-caption font-semibold tabular-nums text-foreground">
                {dashboard.periodReport.paidCount}/
                {dashboard.periodReport.paidCount +
                  dashboard.periodReport.unpaidCount}
              </dd>
            </div>
          </dl>
          {dashboard.periodReport.unpaidNames.length > 0 ? (
            <p className="mt-2 text-caption leading-relaxed text-muted-foreground">
              باقی‌مانده:{" "}
              <span className="text-foreground/85">
                {dashboard.periodReport.unpaidNames.join("، ")}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-caption text-success">
              همه اعضا سهم این دوره را پرداخت کرده‌اند.
            </p>
          )}
          {dashboard.cycleIntegrity &&
          dashboard.cycleIntegrity.duplicateWinnerPeriods.length > 0 ? (
            <p className="mt-2 text-caption text-destructive" role="alert">
              هشدار: نوبت تکراری در داده‌ها —{" "}
              {dashboard.cycleIntegrity.duplicateWinnerPeriods
                .map((d) => `دوره‌های ${d.periods.join(" و ")}`)
                .join("؛ ")}
            </p>
          ) : dashboard.cycleIntegrity ? (
            <p className="mt-2 text-caption text-muted-foreground">
              چرخه: {dashboard.cycleIntegrity.assignedCount} نوبت تعیین‌شده ·{" "}
              {dashboard.cycleIntegrity.openCount} باز ·{" "}
              {dashboard.cycleIntegrity.uniqueWinners} برندهٔ یکتا
            </p>
          ) : null}
        </section>
      ) : null}

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
          <h2 className="text-caption font-semibold text-muted-foreground">
            پرداخت اعضا
          </h2>
          <p className="text-caption tabular-nums text-muted-foreground">
            دوره {dashboard.periodIndex}
          </p>
        </div>

        {memberCount === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/60 bg-card px-4 py-5 text-center text-body-sm text-muted-foreground">
            هنوز عضوی نیست — از دعوت در بالای صفحه استفاده کنید.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
            {dashboard.members.map((m, i) => (
              <li
                key={m.memberId}
                className={cn(
                  "flex items-center justify-between gap-3 px-3.5 py-2.5",
                  i > 0 && "border-t border-border/40",
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      m.paid ? "bg-success" : "bg-border",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-foreground">
                      {m.name}
                      <span className="ms-1.5 text-caption font-normal text-muted-foreground">
                        {m.shareLabel}×
                      </span>
                    </p>
                    <p className="text-caption tabular-nums text-muted-foreground">
                      {formatCurrency(m.expectedAmount, currency)}
                    </p>
                  </div>
                </div>
                {canMutate ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={m.paid ? "default" : "outline"}
                    className={cn(
                      "h-8 shrink-0 rounded-lg px-2.5 text-caption active:scale-[0.97]",
                      m.paid &&
                        "bg-success text-success-foreground hover:bg-success/90",
                    )}
                    disabled={pending}
                    onClick={() => onTogglePaid(m.memberId, !m.paid)}
                  >
                    {m.paid ? "پرداخت شد" : "ثبت"}
                  </Button>
                ) : (
                  <span
                    className={cn(
                      "text-caption font-semibold",
                      m.paid ? "text-success" : "text-muted-foreground",
                    )}
                  >
                    {m.paid ? "پرداخت‌شده" : "باقی‌مانده"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PlanIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10.5c.5-1 1.5-1.5 2.5-1.5s2 .6 2 1.75-1 1.5-2.5 1.75-2.5.75-2.5 1.75 1 1.75 2.5 1.75 2-.5 2.5-1.5" />
    </svg>
  );
}

function GearMiniIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </svg>
  );
}
