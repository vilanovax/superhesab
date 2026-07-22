"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { settleDebt } from "@/app/actions/settlement";
import type { SimplifiedSettlement } from "@/lib/debtSimplification";
import { Button } from "@/components/ui/button";
import { formatMoney, memberLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export type BalanceMember = {
  userId: string;
  name: string | null;
  phone: string;
};

type SpaceBalancesProps = {
  spaceId: string;
  members: BalanceMember[];
  balances: Record<string, number>;
  suggestions: SimplifiedSettlement[];
};

function BalanceAmount({ amount }: { amount: number }) {
  if (amount === 0) {
    return <span className="text-sm font-medium text-muted-foreground">Settled</span>;
  }
  if (amount > 0) {
    return (
      <span className="text-sm font-semibold text-success" dir="ltr">
        +{formatMoney(amount)}
      </span>
    );
  }
  return (
    <span className="text-sm font-semibold text-destructive" dir="ltr">
      {formatMoney(amount)}
    </span>
  );
}

function SuggestionCard({
  spaceId,
  suggestion,
  membersById,
}: {
  spaceId: string;
  suggestion: SimplifiedSettlement;
  membersById: Record<string, BalanceMember>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const from = membersById[suggestion.fromUserId];
  const to = membersById[suggestion.toUserId];

  function onMarkPaid() {
    startTransition(async () => {
      const result = await settleDebt(
        spaceId,
        suggestion.fromUserId,
        suggestion.toUserId,
        suggestion.amount,
      );
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <li className="rounded-lg border border-border bg-card p-4 shadow-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-foreground">
            <span className="font-medium">
              {from ? memberLabel(from) : suggestion.fromUserId}
            </span>{" "}
            <span className="text-muted-foreground">بدهکار است به</span>{" "}
            <span className="font-medium">
              {to ? memberLabel(to) : suggestion.toUserId}
            </span>
          </p>
          <p className="text-base font-semibold text-foreground" dir="ltr">
            {formatMoney(suggestion.amount)}
          </p>
        </div>
        <Button
          type="button"
          className="h-12 w-full shrink-0 sm:w-auto"
          disabled={pending}
          onClick={onMarkPaid}
        >
          {pending ? "در حال ثبت…" : "Mark as Paid"}
        </Button>
      </div>
    </li>
  );
}

export function SpaceBalances({
  spaceId,
  members,
  balances,
  suggestions,
}: SpaceBalancesProps) {
  const membersById = Object.fromEntries(
    members.map((m) => [m.userId, m]),
  ) as Record<string, BalanceMember>;

  const sortedMembers = [...members].sort((a, b) => {
    const ba = balances[a.userId] ?? 0;
    const bb = balances[b.userId] ?? 0;
    return Math.abs(bb) - Math.abs(ba);
  });

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">مانده اعضا</h2>
        <ul className="space-y-2">
          {sortedMembers.map((member) => {
            const amount = balances[member.userId] ?? 0;
            return (
              <li
                key={member.userId}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-none",
                  amount > 0 && "border-success/20",
                  amount < 0 && "border-destructive/20",
                )}
              >
                <span className="truncate text-sm font-medium text-foreground">
                  {memberLabel(member)}
                </span>
                <BalanceAmount amount={amount} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">
            تسویه‌های پیشنهادی
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            کمترین تعداد پرداخت برای صاف شدن حساب‌ها
          </p>
        </div>
        {suggestions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              همه حساب‌ها تسویه است.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={`${suggestion.fromUserId}-${suggestion.toUserId}-${suggestion.amount}`}
                spaceId={spaceId}
                suggestion={suggestion}
                membersById={membersById}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
