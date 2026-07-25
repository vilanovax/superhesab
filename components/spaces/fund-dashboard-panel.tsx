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
      <div className="animate-fade-up space-y-3">
        <section className="rounded-2xl border border-dashed border-border/70 bg-card/80 p-5 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <PlanIcon className="size-6" />
          </div>
          <h2 className="mt-3 text-body font-semibold text-foreground">
            پلن صندوق هنوز تعریف نشده
          </h2>
          <p className="mt-1.5 text-caption leading-relaxed text-muted-foreground">
            مبلغ سهم پایه و تعداد دوره‌ها را در تنظیمات مشخص کنید تا نوبت‌ها
            ساخته شوند.
          </p>
          {isOwner ? (
            <Button
              asChild
              className="mt-4 h-11 w-full rounded-xl active:scale-[0.98]"
            >
              <Link href={settingsHref}>رفتن به تنظیمات پلن</Link>
            </Button>
          ) : (
            <p className="mt-4 text-body-sm text-muted-foreground">
              منتظر تعریف پلن توسط مالک باشید.
            </p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-3.5">
      {error ? (
        <p
          className="rounded-xl bg-destructive-soft px-3 py-2 text-body-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm">
        <div className="flex items-end justify-between gap-3 border-b border-border/40 px-4 pb-3 pt-4">
          <div>
            <p className="text-caption text-muted-foreground">دوره</p>
            <p className="mt-0.5 text-[1.35rem] font-bold leading-none tabular-nums tracking-tight text-foreground">
              {dashboard.periodIndex}
              <span className="ms-1 text-body-sm font-semibold text-muted-foreground">
                از {dashboard.plan.periodCount}
              </span>
            </p>
          </div>
          <Link
            href={settingsHref}
            className="inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.96]"
            aria-label="تنظیمات پلن"
            title="تنظیمات پلن"
          >
            <GearMiniIcon className="size-4" />
          </Link>
        </div>

        <div className="-mx-0 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-1.5">
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
                    "flex size-9 shrink-0 items-center justify-center rounded-full text-caption font-bold tabular-nums transition-[transform,background-color,color] active:scale-95",
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

        <div className="space-y-3 border-t border-border/40 px-4 py-4">
          <div className="rounded-xl bg-muted/45 px-3.5 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-caption text-muted-foreground">
                  وام / نوبت این دوره
                </p>
                <p className="mt-1 truncate text-body font-semibold text-foreground">
                  {dashboard.winnerName ?? "هنوز تعیین نشده"}
                </p>
              </div>
              {dashboard.turnStatus === "ASSIGNED" ? (
                <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-[0.65rem] font-bold text-success">
                  تعیین‌شده
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-bold text-muted-foreground">
                  باز
                </span>
              )}
            </div>
            {canMutate ? (
              <div className="mt-2.5">
                <Select
                  value={dashboard.winnerMemberId ?? "__none__"}
                  onValueChange={(v) =>
                    onAssignWinner(v === "__none__" ? null : v)
                  }
                  disabled={pending}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="انتخاب برنده" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— بدون برنده —</SelectItem>
                    {dashboard.members.map((m) => (
                      <SelectItem key={m.memberId} value={m.memberId}>
                        {m.name} ({m.shareLabel}×)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-caption text-muted-foreground">وصول دوره</p>
              <p className="text-caption font-semibold tabular-nums text-foreground">
                {formatCurrency(dashboard.collectedTotal, currency)}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  / {formatCurrency(dashboard.expectedTotal, currency)}
                </span>
              </p>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300 ease-out",
                  progress >= 100 ? "bg-success" : "bg-primary",
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
              <span>
                سهم پایه ۱×:{" "}
                <span className="font-medium tabular-nums text-foreground/80">
                  {formatCurrency(dashboard.plan.shareAmount, currency)}
                </span>
              </span>
              <span className="tabular-nums">
                {paidCount} از {memberCount} پرداخت
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/55 bg-card p-4 shadow-sm">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-body-sm font-semibold text-foreground">
            پرداخت اعضا
          </h2>
          <p className="text-caption text-muted-foreground">
            دوره {dashboard.periodIndex}
          </p>
        </div>

        {memberCount === 0 ? (
          <p className="mt-3 text-body-sm text-muted-foreground">
            هنوز عضوی اضافه نشده. از دکمه دعوت در بالای صفحه استفاده کنید.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border/40">
            {dashboard.members.map((m) => (
              <li
                key={m.memberId}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      m.paid ? "bg-success" : "bg-border",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium text-foreground">
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
                      "h-9 shrink-0 rounded-xl px-3 active:scale-[0.97]",
                      m.paid &&
                        "bg-success text-success-foreground hover:bg-success/90",
                    )}
                    disabled={pending}
                    onClick={() => onTogglePaid(m.memberId, !m.paid)}
                  >
                    {m.paid ? "پرداخت شد" : "ثبت پرداخت"}
                  </Button>
                ) : (
                  <span
                    className={cn(
                      "text-caption font-semibold",
                      m.paid ? "text-success" : "text-muted-foreground",
                    )}
                  >
                    {m.paid ? "پرداخت‌شده" : "پرداخت‌نشده"}
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
