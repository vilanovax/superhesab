"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  assignFundTurn,
  setFundPayment,
  type FundDashboardDTO,
  type FundPaymentProofDTO,
} from "@/app/actions/fund";
import { FundProofsInbox } from "@/components/spaces/fund-member-proof";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
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
  proofs?: FundPaymentProofDTO[];
};

export function FundDashboardPanel({
  spaceId,
  dashboard,
  currency,
  canMutate,
  isOwner,
  settingsHref,
  proofs = [],
}: FundDashboardPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const activePeriodRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    activePeriodRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [dashboard.periodIndex]);

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
  const shortfall =
    dashboard.periodReport?.shortfall ??
    Math.max(0, dashboard.expectedTotal - dashboard.collectedTotal);
  const hasWinner = Boolean(dashboard.winnerMemberId);
  const prevPeriod =
    dashboard.periodIndex > 1 ? dashboard.periodIndex - 1 : null;
  const nextPeriod =
    dashboard.plan && dashboard.periodIndex < dashboard.plan.periodCount
      ? dashboard.periodIndex + 1
      : null;

  if (!dashboard.plan) {
    return (
      <div className="animate-fade-up">
        <section className="rounded-2xl border border-dashed border-border/70 bg-card/80 p-5 text-center shadow-sm">
          <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <PlanIcon className="size-5" />
          </div>
          <h2 className="mt-3 text-pretty text-body font-semibold text-foreground">
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
    <div className="animate-fade-up space-y-3 pb-6">
      {error ? (
        <p
          className="rounded-xl bg-destructive-soft px-3 py-2 text-body-sm text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}

      {canMutate ? (
        <FundProofsInbox
          spaceId={spaceId}
          proofs={proofs}
          canReview={canMutate}
        />
      ) : null}

      {/* One command card: period + winner + collection */}
      <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <div className="flex items-center justify-between gap-2 px-3.5 pb-2 pt-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground">
              دوره جاری
            </p>
            <p className="mt-0.5 text-lg font-bold leading-none tabular-nums tracking-tight text-foreground">
              {dashboard.periodIndex.toLocaleString("fa-IR")}
              <span className="ms-1 text-[11px] font-semibold text-muted-foreground">
                / {dashboard.plan.periodCount.toLocaleString("fa-IR")}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {prevPeriod != null ? (
              <Link
                href={`/spaces/${spaceId}?period=${prevPeriod}`}
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`دوره ${prevPeriod}`}
              >
                ›
              </Link>
            ) : (
              <span className="size-8" aria-hidden />
            )}
            <span className="rounded-lg bg-muted/70 px-2 py-1 text-[11px] tabular-nums text-muted-foreground">
              {paidCount.toLocaleString("fa-IR")}/
              {memberCount.toLocaleString("fa-IR")} پرداخت
            </span>
            {nextPeriod != null ? (
              <Link
                href={`/spaces/${spaceId}?period=${nextPeriod}`}
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`دوره ${nextPeriod}`}
              >
                ‹
              </Link>
            ) : (
              <span className="size-8" aria-hidden />
            )}
          </div>
        </div>

        <div
          role="navigation"
          aria-label="دوره‌های صندوق"
          className="overflow-x-auto px-3.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max gap-1">
            {dashboard.periods.map((p) => {
              const active = p.periodIndex === dashboard.periodIndex;
              const assigned = p.status === "ASSIGNED";
              return (
                <Link
                  key={p.periodIndex}
                  ref={active ? activePeriodRef : undefined}
                  href={`/spaces/${spaceId}?period=${p.periodIndex}`}
                  aria-current={active ? "page" : undefined}
                  aria-label={
                    p.winnerName
                      ? `دوره ${p.periodIndex} · ${p.winnerName}`
                      : `دوره ${p.periodIndex}`
                  }
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
        <p className="px-3.5 pb-2.5 text-[10px] text-muted-foreground">
          آبی = این دوره · سبز = نوبت تعیین‌شده · خاکستری = باز
        </p>

        <div className="space-y-3 border-t border-border/40 px-3.5 py-3">
          {/* Winner */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                برنده این دوره
              </p>
              {hasWinner ? (
                <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-[0.65rem] font-bold text-success">
                  تعیین‌شده
                </span>
              ) : (
                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[0.65rem] font-bold text-amber-800 dark:text-amber-200">
                  نیاز به انتخاب
                </span>
              )}
            </div>
            {canMutate ? (
              hasWinner ? (
                <div className="mt-1.5 space-y-1.5">
                  <p className="truncate text-body font-bold text-foreground">
                    {dashboard.winnerName}
                  </p>
                  <Select
                    value={dashboard.winnerMemberId ?? "__none__"}
                    onValueChange={(v) =>
                      onAssignWinner(v === "__none__" ? null : v)
                    }
                    disabled={pending}
                  >
                    <SelectTrigger
                      className="h-9 rounded-xl text-caption"
                      aria-label="تغییر برنده دوره"
                    >
                      <SelectValue placeholder="تغییر برنده…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— حذف برنده —</SelectItem>
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
                </div>
              ) : (
                <Select
                  value="__none__"
                  onValueChange={(v) =>
                    onAssignWinner(v === "__none__" ? null : v)
                  }
                  disabled={pending}
                >
                  <SelectTrigger
                    className="mt-1.5 h-11 rounded-xl border-primary/35 bg-primary/5 font-semibold"
                    aria-label="انتخاب برنده دوره"
                  >
                    <SelectValue placeholder="انتخاب برنده این دوره…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled>
                      انتخاب برنده این دوره…
                    </SelectItem>
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
              )
            ) : (
              <p className="mt-1 truncate text-body-sm font-semibold text-foreground">
                {dashboard.winnerName ?? "هنوز تعیین نشده"}
              </p>
            )}
          </div>

          {/* Collection */}
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">وصول</p>
              <p className="text-caption font-semibold tabular-nums text-foreground">
                {formatCurrency(dashboard.collectedTotal, currency)}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  / {formatCurrency(dashboard.expectedTotal, currency)}
                </span>
              </p>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="پیشرفت وصول دوره"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300 ease-out",
                  progress >= 100 ? "bg-success" : "bg-primary",
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
              <p className="text-[11px] tabular-nums text-muted-foreground">
                سهم پایه:{" "}
                <span className="font-medium text-foreground/80">
                  {formatCurrency(dashboard.plan.shareAmount, currency)}
                </span>
              </p>
              {shortfall > 0 ? (
                <p className="text-[11px] font-semibold tabular-nums text-destructive">
                  کسری {formatCurrency(shortfall, currency)}
                </p>
              ) : (
                <p className="text-[11px] font-semibold text-success">
                  وصول کامل
                </p>
              )}
            </div>
            {paidCount === 0 && memberCount > 0 ? (
              <p className="mt-2 rounded-xl bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                هنوز پرداختی ثبت نشده — از لیست پایین شروع کنید.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Integrity warning only when broken */}
      {dashboard.cycleIntegrity &&
      dashboard.cycleIntegrity.duplicateWinnerPeriods.length > 0 ? (
        <p
          className="rounded-xl bg-destructive-soft px-3 py-2 text-caption text-destructive"
          role="alert"
          aria-live="assertive"
        >
          هشدار: نوبت تکراری در داده‌ها —{" "}
          {dashboard.cycleIntegrity.duplicateWinnerPeriods
            .map((d) => `دوره‌های ${d.periods.join(" و ")}`)
            .join("؛ ")}
        </p>
      ) : null}

      {/* Member payments — primary work surface */}
      <section>
        <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
          <h2 className="text-caption font-bold text-foreground">
            پرداخت اعضا
          </h2>
          <p className="text-[11px] tabular-nums text-muted-foreground">
            دوره {dashboard.periodIndex.toLocaleString("fa-IR")}
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
                  "flex items-center justify-between gap-3 px-3 py-2.5",
                  i > 0 && "border-t border-border/40",
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <UserAvatar
                    phone={m.phone}
                    name={m.name}
                    avatarUrl={m.avatarUrl}
                    size={32}
                    className="size-8 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-caption font-semibold text-foreground">
                      {m.name}
                      <span className="ms-1.5 text-[11px] font-normal text-muted-foreground">
                        {m.shareLabel}×
                      </span>
                    </p>
                    <p className="text-[11px] tabular-nums text-muted-foreground">
                      {formatCurrency(m.expectedAmount, currency)}
                    </p>
                  </div>
                </div>
                {canMutate ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={m.paid ? "outline" : "default"}
                    className={cn(
                      "h-9 shrink-0 rounded-xl px-3 text-[11px] font-semibold active:scale-[0.97]",
                      m.paid &&
                        "border-success/35 bg-success-soft text-success hover:bg-success-soft/80",
                    )}
                    disabled={pending}
                    onClick={() => onTogglePaid(m.memberId, !m.paid)}
                  >
                    {m.paid ? "پرداخت شد" : "ثبت"}
                  </Button>
                ) : (
                  <span
                    className={cn(
                      "text-[11px] font-semibold",
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
