"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { settleDebt } from "@/app/actions/settlement";
import type { SimplifiedSettlement } from "@/lib/debtSimplification";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { payerName } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { maybeCeilToThousand } from "@/lib/money";
import { cn } from "@/lib/utils";

export type BalanceMember = {
  userId: string;
  name: string | null;
  phone: string;
  isVirtual?: boolean;
};

type SpaceBalancesProps = {
  spaceId: string;
  currentUserId?: string;
  members: BalanceMember[];
  balances: Record<string, number>;
  suggestions: SimplifiedSettlement[];
  roundUpToThousand?: boolean;
};

function personName(member: BalanceMember, currentUserId?: string): string {
  return payerName(member, {
    isCurrentUser: Boolean(
      currentUserId && member.userId === currentUserId,
    ),
  });
}

function BalanceAmount({ amount }: { amount: number }) {
  if (amount === 0) {
    return <span className="text-[13px] text-muted-foreground">صفر</span>;
  }
  if (amount > 0) {
    return (
      <span className="text-[13px] font-semibold tabular-nums text-success">
        +{formatCurrency(amount)}
      </span>
    );
  }
  return (
    <span className="text-[13px] font-semibold tabular-nums text-destructive">
      −{formatCurrency(Math.abs(amount))}
    </span>
  );
}

function SuggestionCard({
  spaceId,
  suggestion,
  membersById,
  currentUserId,
  roundUpToThousand,
}: {
  spaceId: string;
  suggestion: SimplifiedSettlement;
  membersById: Record<string, BalanceMember>;
  currentUserId?: string;
  roundUpToThousand: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = membersById[suggestion.fromUserId];
  const to = membersById[suggestion.toUserId];
  const fromName = from
    ? personName(from, currentUserId)
    : suggestion.fromUserId;
  const toName = to ? personName(to, currentUserId) : suggestion.toUserId;
  const amount = maybeCeilToThousand(
    suggestion.amount,
    roundUpToThousand,
  );

  function onConfirmPaid() {
    setError(null);
    startTransition(async () => {
      const result = await settleDebt(
        spaceId,
        suggestion.fromUserId,
        suggestion.toUserId,
        amount,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <li className="rounded-2xl border border-border/55 bg-white px-3.5 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-foreground">
            <span className="font-semibold">{fromName}</span>
            <span className="mx-1.5 text-muted-foreground/70">←</span>
            <span className="font-semibold">{toName}</span>
          </p>
          <p className="mt-0.5 text-[15px] font-bold tabular-nums text-ink">
            {formatCurrency(amount)}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-10 shrink-0 rounded-xl px-3.5 text-[13px]"
          disabled={pending}
          onClick={() => {
            setError(null);
            setConfirmOpen(true);
          }}
        >
          پرداخت شد
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="gap-0 overflow-hidden border-border/60 p-0 sm:max-w-sm">
          <DialogHeader className="space-y-1.5 px-5 pb-3 pt-5 text-start">
            <DialogTitle className="text-base font-bold">
              تأیید پرداخت
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
              این تسویه ثبت می‌شود و از مانده‌ها کم می‌گردد.
              {roundUpToThousand ? " مبلغ به‌صورت رند‌شده ثبت می‌شود." : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="mx-5 mb-4 rounded-2xl border border-border/55 bg-[#f7fafb] px-4 py-3.5">
            <p className="text-[13px] text-foreground">
              <span className="font-semibold">{fromName}</span>
              <span className="mx-1.5 text-muted-foreground/70">←</span>
              <span className="font-semibold">{toName}</span>
            </p>
            <p className="mt-1.5 text-lg font-bold tabular-nums text-ink">
              {formatCurrency(amount)}
            </p>
          </div>

          {error ? (
            <p className="px-5 pb-2 text-[12px] text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-row gap-2 border-t border-border/50 bg-muted/30 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-xl"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              className="h-11 flex-1 rounded-xl"
              disabled={pending}
              onClick={onConfirmPaid}
            >
              {pending ? "در حال ثبت…" : "بله، پرداخت شد"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </li>
  );
}

function MemberRow({
  member,
  currentUserId,
  trailing,
}: {
  member: BalanceMember;
  currentUserId?: string;
  trailing: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(member.name || member.phone)}`}
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 rounded-full bg-secondary"
        />
        <span className="truncate text-[13px] font-medium text-foreground">
          {personName(member, currentUserId)}
        </span>
      </div>
      {trailing}
    </li>
  );
}

export function SpaceBalances({
  spaceId,
  currentUserId,
  members,
  balances,
  suggestions,
  roundUpToThousand = false,
}: SpaceBalancesProps) {
  const membersById = Object.fromEntries(
    members.map((m) => [m.userId, m]),
  ) as Record<string, BalanceMember>;

  const displayBalances = Object.fromEntries(
    Object.entries(balances).map(([userId, amount]) => [
      userId,
      maybeCeilToThousand(amount, roundUpToThousand),
    ]),
  ) as Record<string, number>;

  const sortedMembers = [...members].sort((a, b) => {
    const ba = displayBalances[a.userId] ?? 0;
    const bb = displayBalances[b.userId] ?? 0;
    return Math.abs(bb) - Math.abs(ba);
  });

  const allSettled =
    suggestions.length === 0 &&
    members.every((m) => (balances[m.userId] ?? 0) === 0);

  const creditors = sortedMembers.filter(
    (m) => (displayBalances[m.userId] ?? 0) > 0,
  );
  const debtors = sortedMembers.filter(
    (m) => (displayBalances[m.userId] ?? 0) < 0,
  );

  if (allSettled) {
    return (
      <div className="animate-fade-up space-y-3.5">
        <div className="rounded-2xl border border-success/25 bg-success-soft/50 px-4 py-5 text-center">
          <p className="text-base font-semibold text-success">حساب‌ها صاف است</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            بعد از ثبت هزینه، مانده‌ها اینجا می‌آید
          </p>
        </div>

        <div className="rounded-2xl border border-border/55 bg-white px-3.5 py-3">
          <p className="mb-1 text-[11px] font-medium text-muted-foreground">
            {members.length} عضو
          </p>
          <ul className="divide-y divide-border/45">
            {sortedMembers.map((member) => (
              <MemberRow
                key={member.userId}
                member={member}
                currentUserId={currentUserId}
                trailing={
                  <span className="text-[11px] text-muted-foreground">صاف</span>
                }
              />
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-4">
      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <h2 className="text-[13px] font-semibold text-foreground">
            برای تسویه
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {suggestions.length} پرداخت
            {roundUpToThousand ? " · رند‌شده" : ""}
          </span>
        </div>
        {suggestions.length === 0 ? (
          <p className="rounded-xl bg-muted/55 px-3 py-3 text-[13px] text-muted-foreground">
            پیشنهاد پرداختی نیست — مانده‌ها را پایین ببین.
          </p>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={`${suggestion.fromUserId}-${suggestion.toUserId}-${suggestion.amount}`}
                spaceId={spaceId}
                suggestion={suggestion}
                membersById={membersById}
                currentUserId={currentUserId}
                roundUpToThousand={roundUpToThousand}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <h2 className="text-[13px] font-semibold text-foreground">
            مانده خالص
          </h2>
          {roundUpToThousand ? (
            <span className="text-[11px] text-muted-foreground">رند به هزار</span>
          ) : null}
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/55 bg-white">
          {debtors.length > 0 ? (
            <div
              className={cn(
                "px-3.5 py-3",
                creditors.length > 0 && "border-b border-border/45",
              )}
            >
              <p className="mb-1 text-[11px] font-medium text-destructive">
                بدهکار
              </p>
              <ul className="divide-y divide-border/40">
                {debtors.map((member) => (
                  <MemberRow
                    key={member.userId}
                    member={member}
                    currentUserId={currentUserId}
                    trailing={
                      <BalanceAmount
                        amount={displayBalances[member.userId] ?? 0}
                      />
                    }
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {creditors.length > 0 ? (
            <div className="px-3.5 py-3">
              <p className="mb-1 text-[11px] font-medium text-success">
                طلبکار
              </p>
              <ul className="divide-y divide-border/40">
                {creditors.map((member) => (
                  <MemberRow
                    key={member.userId}
                    member={member}
                    currentUserId={currentUserId}
                    trailing={
                      <BalanceAmount
                        amount={displayBalances[member.userId] ?? 0}
                      />
                    }
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {debtors.length === 0 && creditors.length === 0 ? (
            <p className="px-3.5 py-4 text-center text-[13px] text-muted-foreground">
              مانده‌ای نیست
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
