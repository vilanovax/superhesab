"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { FundMemberProof } from "@/components/spaces/fund-member-proof";
import type { FundMemberPortalDTO } from "@/app/actions/fund";
import type { SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type FundMemberPortalProps = {
  portal: FundMemberPortalDTO;
};

export function FundMemberPortal({ portal }: FundMemberPortalProps) {
  const currency = portal.currency as SpaceCurrency;
  const activePeriodRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    activePeriodRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [portal.periodIndex]);

  return (
    <div className="animate-fade-up space-y-3 pb-6">
      <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <div className="px-3.5 pb-2.5 pt-3.5">
          <p className="text-[11px] font-semibold text-muted-foreground">
            صندوق نوبتی
          </p>
          <h1 className="mt-0.5 truncate text-pretty text-lg font-bold text-foreground">
            {portal.spaceName}
          </h1>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {portal.memberName} · ضریب {portal.shareLabel}×
          </p>
        </div>

        {!portal.plan ? (
          <p className="border-t border-border/40 px-3.5 py-4 text-caption text-muted-foreground">
            پلن هنوز توسط مالک تعریف نشده است.
          </p>
        ) : (
          <>
            <div
              role="navigation"
              aria-label="دوره‌های صندوق"
              className="overflow-x-auto px-3.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex w-max gap-1">
                {portal.periods.map((p) => {
                  const active = p.periodIndex === portal.periodIndex;
                  return (
                    <Link
                      key={p.periodIndex}
                      ref={active ? activePeriodRef : undefined}
                      href={`/spaces/${portal.spaceId}/member?period=${p.periodIndex}`}
                      aria-current={active ? "page" : undefined}
                      aria-label={`دوره ${p.periodIndex}${p.paid ? " · پرداخت‌شده" : ""}`}
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold tabular-nums transition-colors",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : p.paid
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
              آبی = این دوره · سبز = پرداخت‌شده
            </p>

            <div className="space-y-2.5 border-t border-border/40 px-3.5 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">دوره</p>
                <p className="text-caption font-bold tabular-nums text-foreground">
                  {portal.periodIndex.toLocaleString("fa-IR")}
                  <span className="font-semibold text-muted-foreground">
                    {" "}
                    / {portal.plan.periodCount.toLocaleString("fa-IR")}
                  </span>
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">سهم من</p>
                <p className="text-caption font-semibold tabular-nums text-foreground">
                  {formatCurrency(portal.expectedAmount, currency)}
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">وضعیت من</p>
                <p
                  className={cn(
                    "text-caption font-bold",
                    portal.paid ? "text-success" : "text-foreground",
                  )}
                >
                  {portal.paid ? "پرداخت‌شده" : "هنوز پرداخت نشده"}
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">برنده دوره</p>
                <p className="truncate text-caption font-semibold text-foreground">
                  {portal.winnerName ?? "هنوز تعیین نشده"}
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      {portal.plan ? (
        <FundMemberProof
          spaceId={portal.spaceId}
          periodIndex={portal.periodIndex}
          expectedAmount={portal.expectedAmount}
          paid={portal.paid}
          currency={currency}
          proofs={portal.proofs}
          storageReady={portal.storageReady}
        />
      ) : null}
    </div>
  );
}
