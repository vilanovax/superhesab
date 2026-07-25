"use client";

import Link from "next/link";
import {
  FundMemberProof,
} from "@/components/spaces/fund-member-proof";
import type { FundMemberPortalDTO } from "@/app/actions/fund";
import type { SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type FundMemberPortalProps = {
  portal: FundMemberPortalDTO;
};

export function FundMemberPortal({ portal }: FundMemberPortalProps) {
  const currency = portal.currency as SpaceCurrency;

  return (
    <div className="animate-fade-up space-y-3.5">
      <section className="overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm">
        <div className="px-4 pb-3 pt-4">
          <p className="text-caption text-muted-foreground">صندوق نوبتی</p>
          <h1 className="mt-0.5 truncate text-lg font-bold text-foreground">
            {portal.spaceName}
          </h1>
          <p className="mt-1 text-caption text-muted-foreground">
            {portal.memberName} · ضریب {portal.shareLabel}×
          </p>
        </div>

        {!portal.plan ? (
          <p className="border-t border-border/40 px-4 py-4 text-body-sm text-muted-foreground">
            پلن هنوز توسط مالک تعریف نشده است.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-1">
                {portal.periods.map((p) => {
                  const active = p.periodIndex === portal.periodIndex;
                  return (
                    <Link
                      key={p.periodIndex}
                      href={`/spaces/${portal.spaceId}/member?period=${p.periodIndex}`}
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold tabular-nums",
                        active
                          ? "bg-primary text-primary-foreground"
                          : p.paid
                            ? "bg-success-soft text-success"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {p.periodIndex}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-border/40 px-4 py-3.5">
              <div className="rounded-xl bg-muted/45 px-3 py-2.5">
                <p className="text-[0.65rem] text-muted-foreground">دوره</p>
                <p className="mt-0.5 text-body font-bold tabular-nums text-foreground">
                  {portal.periodIndex}
                  <span className="text-caption font-semibold text-muted-foreground">
                    /{portal.plan.periodCount}
                  </span>
                </p>
              </div>
              <div className="rounded-xl bg-muted/45 px-3 py-2.5">
                <p className="text-[0.65rem] text-muted-foreground">وضعیت من</p>
                <p
                  className={cn(
                    "mt-0.5 text-body-sm font-bold",
                    portal.paid ? "text-success" : "text-foreground",
                  )}
                >
                  {portal.paid ? "پرداخت‌شده" : "پرداخت‌نشده"}
                </p>
              </div>
              <div className="rounded-xl bg-muted/45 px-3 py-2.5">
                <p className="text-[0.65rem] text-muted-foreground">سهم من</p>
                <p className="mt-0.5 text-caption font-semibold tabular-nums text-foreground">
                  {formatCurrency(portal.expectedAmount, currency)}
                </p>
              </div>
              <div className="rounded-xl bg-muted/45 px-3 py-2.5">
                <p className="text-[0.65rem] text-muted-foreground">نوبت دوره</p>
                <p className="mt-0.5 truncate text-caption font-semibold text-foreground">
                  {portal.winnerName ?? "—"}
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
