"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { settleDebt } from "@/app/actions/settlement";
import type { SimplifiedSettlement } from "@/lib/debtSimplification";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { payerName, type SpaceCurrency } from "@/lib/format";
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
  currency?: SpaceCurrency;
  roundUpToThousand?: boolean;
  /** Partner shell: one bold rolling balance + settle up */
  variant?: "default" | "partner";
  canMutate?: boolean;
};

function personName(member: BalanceMember, currentUserId?: string): string {
  return payerName(member, {
    isCurrentUser: Boolean(
      currentUserId && member.userId === currentUserId,
    ),
  });
}

function BalanceAmount({ amount, currency = "TOMAN" }: { amount: number; currency?: SpaceCurrency }) {
  if (amount === 0) {
    return <span className="text-[11px] text-muted-foreground">صفر</span>;
  }
  if (amount > 0) {
    return (
      <span className="text-caption font-bold tabular-nums text-success">
        +{formatCurrency(amount, currency)}
      </span>
    );
  }
  return (
    <span className="text-caption font-bold tabular-nums text-destructive">
      −{formatCurrency(Math.abs(amount), currency)}
    </span>
  );
}

function SettleConfirmDialog({
  open,
  onOpenChange,
  fromName,
  toName,
  amount,
  currency = "TOMAN",
  pending,
  error,
  onConfirm,
  roundUpToThousand,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromName: string;
  toName: string;
  amount: number;
  currency?: SpaceCurrency;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  roundUpToThousand: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border/60 p-0 sm:max-w-sm">
        <DialogHeader className="space-y-1.5 px-5 pb-3 pt-5 text-start">
          <DialogTitle className="text-pretty text-base font-bold">
            تأیید پرداخت
          </DialogTitle>
          <DialogDescription className="text-body-sm leading-relaxed text-muted-foreground">
            این تسویه ثبت می‌شود و از مانده‌ها کم می‌گردد.
            {roundUpToThousand ? " مبلغ به‌صورت رند‌شده ثبت می‌شود." : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="mx-5 mb-4 rounded-2xl border border-border/55 bg-sheet-muted px-4 py-3.5">
          <p className="text-body-sm text-foreground">
            <span className="font-semibold">{fromName}</span>
            {" به "}
            <span className="font-semibold">{toName}</span>
            {" پرداخت کرد"}
          </p>
          <p className="mt-1.5 text-lg font-bold tabular-nums text-ink">
            {formatCurrency(amount, currency)}
          </p>
        </div>

        {error ? (
          <p
            className="px-5 pb-2 text-label text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-row gap-2 border-t border-border/50 bg-muted/30 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            انصراف
          </Button>
          <Button
            type="button"
            className="h-11 flex-1 rounded-xl"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "در حال ثبت…" : "بله، پرداخت شد"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SuggestionCard({
  spaceId,
  suggestion,
  membersById,
  currentUserId,
  currency = "TOMAN",
  roundUpToThousand,
  canMutate,
}: {
  spaceId: string;
  suggestion: SimplifiedSettlement;
  membersById: Record<string, BalanceMember>;
  currentUserId?: string;
  currency?: SpaceCurrency;
  roundUpToThousand: boolean;
  canMutate: boolean;
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
  const amount = maybeCeilToThousand(suggestion.amount, roundUpToThousand);

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

  const involvesMe =
    Boolean(currentUserId) &&
    (suggestion.fromUserId === currentUserId ||
      suggestion.toUserId === currentUserId);
  const iPay =
    Boolean(currentUserId) && suggestion.fromUserId === currentUserId;

  return (
    <li className="flex items-center gap-2.5 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-caption text-foreground">
          {iPay ? (
            <>
              شما به <span className="font-semibold">{toName}</span> بدهید
            </>
          ) : suggestion.toUserId === currentUserId ? (
            <>
              <span className="font-semibold">{fromName}</span> به شما بدهد
            </>
          ) : (
            <>
              <span className="font-semibold">{fromName}</span>
              {" باید به "}
              <span className="font-semibold">{toName}</span>
              {" بدهد"}
            </>
          )}
        </p>
        <p className="mt-0.5 text-caption font-bold tabular-nums text-foreground">
          {formatCurrency(amount, currency)}
        </p>
      </div>
      {canMutate ? (
        <Button
          type="button"
          size="sm"
          variant={involvesMe ? "default" : "outline"}
          className={cn(
            "h-9 shrink-0 rounded-xl px-3 text-[11px] font-semibold",
            involvesMe && "text-primary-foreground",
          )}
          disabled={pending}
          onClick={() => {
            setError(null);
            setConfirmOpen(true);
          }}
        >
          {pending ? "…" : "ثبت"}
        </Button>
      ) : null}

      {canMutate ? (
        <SettleConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          fromName={fromName}
          toName={toName}
          amount={amount}
          currency={currency}
          pending={pending}
          error={error}
          onConfirm={onConfirmPaid}
          roundUpToThousand={roundUpToThousand}
        />
      ) : null}
    </li>
  );
}

function PartnerRollingBalance({
  spaceId,
  currentUserId,
  members,
  balances,
  suggestions,
  currency = "TOMAN",
  roundUpToThousand,
  canMutate,
}: {
  spaceId: string;
  currentUserId: string;
  members: BalanceMember[];
  balances: Record<string, number>;
  suggestions: SimplifiedSettlement[];
  currency?: SpaceCurrency;
  roundUpToThousand: boolean;
  canMutate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rawBalance = balances[currentUserId] ?? 0;
  const myBalance = maybeCeilToThousand(rawBalance, roundUpToThousand);

  const membersById = Object.fromEntries(
    members.map((m) => [m.userId, m]),
  ) as Record<string, BalanceMember>;

  const me = membersById[currentUserId];
  const partner = members.find((m) => m.userId !== currentUserId);
  const partnerName = partner
    ? personName(partner, currentUserId)
    : "طرف مقابل";
  const partnerBalance = partner
    ? maybeCeilToThousand(balances[partner.userId] ?? 0, roundUpToThousand)
    : 0;

  // Prefer a settlement involving the current user; else first suggestion
  const suggestion =
    suggestions.find(
      (s) =>
        s.fromUserId === currentUserId || s.toUserId === currentUserId,
    ) ?? suggestions[0] ?? null;

  const settleAmount = suggestion
    ? maybeCeilToThousand(suggestion.amount, roundUpToThousand)
    : Math.abs(myBalance);

  const from = suggestion ? membersById[suggestion.fromUserId] : undefined;
  const to = suggestion ? membersById[suggestion.toUserId] : undefined;
  const fromName = from
    ? personName(from, currentUserId)
    : suggestion?.fromUserId ?? "";
  const toName = to
    ? personName(to, currentUserId)
    : suggestion?.toUserId ?? "";

  const iPay =
    Boolean(suggestion) && suggestion!.fromUserId === currentUserId;
  const iReceive =
    Boolean(suggestion) && suggestion!.toUserId === currentUserId;

  function onConfirmPaid() {
    if (!suggestion) return;
    setError(null);
    startTransition(async () => {
      const result = await settleDebt(
        spaceId,
        suggestion.fromUserId,
        suggestion.toUserId,
        settleAmount,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  }

  if (myBalance === 0) {
    return (
      <div className="animate-fade-up space-y-3 pb-6">
        <div className="rounded-2xl border border-success/25 bg-success-soft/50 px-4 py-4 text-center">
          <p className="text-body-sm font-bold text-success">حساب‌ها صاف است</p>
          <p className="mt-1 text-caption text-muted-foreground">
            با {partnerName} بدهی‌ای نیست
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
          <p className="border-b border-border/40 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
            مانده خالص
          </p>
          <ul className="divide-y divide-border/35 px-3">
            {me ? (
              <MemberRow
                member={me}
                currentUserId={currentUserId}
                trailing={
                  <span className="text-[11px] text-muted-foreground">صاف</span>
                }
              />
            ) : null}
            {partner ? (
              <MemberRow
                member={partner}
                currentUserId={currentUserId}
                trailing={
                  <span className="text-[11px] text-muted-foreground">صاف</span>
                }
              />
            ) : null}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-3 pb-6">
      <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <div className="flex items-baseline justify-between gap-2 border-b border-border/40 px-3 py-2">
          <h2 className="text-caption font-bold text-foreground">برای تسویه</h2>
          {roundUpToThousand ? (
            <span className="text-[11px] text-muted-foreground">رند به هزار</span>
          ) : null}
        </div>

        <div className="space-y-3 px-3 py-3.5">
          {from && to ? (
            <div className="flex items-center justify-center gap-2.5">
              <div className="flex flex-col items-center gap-1">
                <UserAvatar
                  phone={from.phone}
                  name={from.name}
                  size={36}
                  className="size-9 bg-secondary"
                />
                <span className="max-w-[5.5rem] truncate text-[11px] font-medium text-foreground">
                  {fromName}
                </span>
              </div>
              <span
                className="pb-4 text-caption text-muted-foreground"
                aria-hidden
              >
                ←
              </span>
              <div className="flex flex-col items-center gap-1">
                <UserAvatar
                  phone={to.phone}
                  name={to.name}
                  size={36}
                  className="size-9 bg-secondary"
                />
                <span className="max-w-[5.5rem] truncate text-[11px] font-medium text-foreground">
                  {toName}
                </span>
              </div>
            </div>
          ) : null}

          <div className="text-center">
            <p className="text-caption text-muted-foreground">
              {iPay ? (
                <>
                  شما به{" "}
                  <span className="font-semibold text-foreground">{toName}</span>{" "}
                  بدهید
                </>
              ) : iReceive ? (
                <>
                  <span className="font-semibold text-foreground">
                    {fromName}
                  </span>{" "}
                  به شما بدهد
                </>
              ) : myBalance > 0 ? (
                <>
                  {partnerName} به شما بدهد
                </>
              ) : (
                <>
                  شما به {partnerName} بدهید
                </>
              )}
            </p>
            <p
              className={cn(
                "mt-1.5 text-2xl font-bold tabular-nums tracking-tight",
                myBalance > 0 ? "text-success" : "text-destructive",
              )}
            >
              {formatCurrency(settleAmount, currency)}
            </p>
          </div>

          {canMutate && suggestion ? (
            <Button
              type="button"
              className="h-11 w-full rounded-xl text-caption font-semibold"
              disabled={pending}
              onClick={() => {
                setError(null);
                setConfirmOpen(true);
              }}
            >
              {pending ? "در حال ثبت…" : iPay ? "پرداخت کردم" : "ثبت تسویه"}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <p className="border-b border-border/40 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
          مانده خالص
        </p>
        <ul className="divide-y divide-border/35 px-3">
          {me ? (
            <MemberRow
              member={me}
              currentUserId={currentUserId}
              trailing={
                <BalanceAmount currency={currency} amount={myBalance} />
              }
            />
          ) : null}
          {partner ? (
            <MemberRow
              member={partner}
              currentUserId={currentUserId}
              trailing={
                <BalanceAmount currency={currency} amount={partnerBalance} />
              }
            />
          ) : null}
        </ul>
      </section>

      {canMutate && suggestion ? (
        <SettleConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          fromName={fromName}
          toName={toName}
          amount={settleAmount}
          currency={currency}
          pending={pending}
          error={error}
          onConfirm={onConfirmPaid}
          roundUpToThousand={roundUpToThousand}
        />
      ) : null}
    </div>
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
    <li className="flex items-center justify-between gap-3 py-2 first:pt-0.5 last:pb-0.5">
      <div className="flex min-w-0 items-center gap-2">
        <UserAvatar
          phone={member.phone}
          name={member.name}
          size={28}
          className="size-7 bg-secondary"
        />
        <span className="truncate text-caption font-medium text-foreground">
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
  currency = "TOMAN",
  roundUpToThousand = false,
  variant = "default",
  canMutate = true,
}: SpaceBalancesProps) {
  if (variant === "partner" && currentUserId) {
    return (
      <PartnerRollingBalance
        spaceId={spaceId}
        currentUserId={currentUserId}
        members={members}
        balances={balances}
        suggestions={suggestions}
        currency={currency}
        roundUpToThousand={roundUpToThousand}
        canMutate={canMutate}
      />
    );
  }

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
      <div className="animate-fade-up space-y-3 pb-6">
        <div className="rounded-2xl border border-success/25 bg-success-soft/50 px-4 py-4 text-center">
          <p className="text-body-sm font-bold text-success">حساب‌ها صاف است</p>
          <p className="mt-1 text-caption text-muted-foreground">
            بعد از ثبت هزینه، مانده‌ها اینجا می‌آید
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
          <p className="border-b border-border/40 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
            {members.length.toLocaleString("fa-IR")} عضو · همه صاف
          </p>
          <ul className="divide-y divide-border/35 px-3">
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
    <div className="animate-fade-up space-y-3 pb-6">
      <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <div className="flex items-baseline justify-between gap-2 border-b border-border/40 px-3 py-2">
          <h2 className="text-caption font-bold text-foreground">برای تسویه</h2>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {suggestions.length.toLocaleString("fa-IR")} پرداخت
            {roundUpToThousand ? " · رند" : ""}
          </span>
        </div>
        {suggestions.length === 0 ? (
          <p className="px-3 py-3.5 text-caption text-muted-foreground">
            پیشنهاد پرداختی نیست — مانده‌ها را پایین ببین.
          </p>
        ) : (
          <ul className="divide-y divide-border/35">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={`${suggestion.fromUserId}-${suggestion.toUserId}-${suggestion.amount}`}
                spaceId={spaceId}
                suggestion={suggestion}
                membersById={membersById}
                currentUserId={currentUserId}
                currency={currency}
                roundUpToThousand={roundUpToThousand}
                canMutate={canMutate}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <div className="flex items-baseline justify-between gap-2 border-b border-border/40 px-3 py-2">
          <h2 className="text-caption font-bold text-foreground">مانده خالص</h2>
          {roundUpToThousand ? (
            <span className="text-[11px] text-muted-foreground">رند به هزار</span>
          ) : null}
        </div>
        {debtors.length > 0 ? (
          <div
            className={cn(
              "px-3 pb-1 pt-2",
              creditors.length > 0 && "border-b border-border/40",
            )}
          >
            <p className="mb-0.5 text-[11px] font-semibold text-destructive">
              بدهکار
            </p>
            <ul className="divide-y divide-border/30">
              {debtors.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  currentUserId={currentUserId}
                  trailing={
                    <BalanceAmount
                      currency={currency}
                      amount={displayBalances[member.userId] ?? 0}
                    />
                  }
                />
              ))}
            </ul>
          </div>
        ) : null}

        {creditors.length > 0 ? (
          <div className="px-3 pb-1 pt-2">
            <p className="mb-0.5 text-[11px] font-semibold text-success">
              طلبکار
            </p>
            <ul className="divide-y divide-border/30">
              {creditors.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  currentUserId={currentUserId}
                  trailing={
                    <BalanceAmount
                      currency={currency}
                      amount={displayBalances[member.userId] ?? 0}
                    />
                  }
                />
              ))}
            </ul>
          </div>
        ) : null}

        {debtors.length === 0 && creditors.length === 0 ? (
          <p className="px-3 py-4 text-center text-caption text-muted-foreground">
            مانده‌ای نیست
          </p>
        ) : null}
      </section>
    </div>
  );
}
