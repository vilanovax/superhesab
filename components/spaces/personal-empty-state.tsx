"use client";

import type { ReactNode } from "react";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

type PersonalEmptyStateProps = {
  canMutate: boolean;
  /** خانه / FAMILY — copy and mark for shared household ledger. */
  household?: boolean;
  /** Solo household owner: quiet invite, never a competing primary CTA. */
  inviteSlot?: ReactNode;
};

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 12.5V3.5M8 3.5 4.5 7M8 3.5 11.5 7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 3.5v9M8 12.5 4.5 9M8 12.5 11.5 9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HouseholdMark() {
  return (
    <svg
      viewBox="0 0 48 48"
      className="size-7"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 22.5 24 10l16 12.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinejoin="round"
      />
      <path
        d="M12 21.5V36a3 3 0 0 0 3 3h18a3 3 0 0 0 3-3V21.5"
        stroke="currentColor"
        strokeWidth="2.25"
      />
      <rect
        x="18"
        y="25"
        width="12"
        height="14"
        rx="2"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M21 29h6M21 33h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LedgerMark() {
  return (
    <svg
      viewBox="0 0 48 48"
      className="size-7"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="10"
        y="12"
        width="28"
        height="24"
        rx="5"
        stroke="currentColor"
        strokeWidth="2.25"
        opacity="0.9"
      />
      <path
        d="M16 20h16M16 26h10"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <circle cx="33" cy="14" r="7" fill="var(--card)" />
      <circle cx="33" cy="14" r="6" fill="currentColor" opacity="0.15" />
      <path
        d="M33 11v6M30 14h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EntryTile({
  kind,
  onClick,
  delayMs,
}: {
  kind: "INCOME" | "EXPENSE";
  onClick: () => void;
  delayMs: number;
}) {
  const isIncome = kind === "INCOME";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "animate-fade-up min-h-24 rounded-2xl px-3.5 py-3.5 text-start",
        "transition-[transform,background-color,box-shadow] duration-150 ease-out",
        "active:scale-[0.97] motion-reduce:animate-none motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "touch-manipulation [-webkit-tap-highlight-color:transparent]",
        isIncome
          ? "bg-success-soft text-success ring-1 ring-success/20 hover:bg-success-soft/80 focus-visible:ring-success/40"
          : "bg-destructive-soft text-destructive ring-1 ring-destructive/20 hover:bg-destructive-soft/80 focus-visible:ring-destructive/40",
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-xl",
          isIncome ? "bg-success/15" : "bg-destructive/15",
        )}
      >
        {isIncome ? (
          <ArrowUpIcon className="size-4" />
        ) : (
          <ArrowDownIcon className="size-4" />
        )}
      </span>
      <span className="mt-2.5 block text-body-sm font-bold">
        {isIncome ? "درآمد" : "هزینه"}
      </span>
      <span
        className={cn(
          "mt-0.5 block text-caption",
          isIncome ? "text-success/80" : "text-destructive/80",
        )}
      >
        {isIncome ? "حقوق، واریز، …" : "خرید، قبض، …"}
      </span>
    </button>
  );
}

export function PersonalEmptyState({
  canMutate,
  household = false,
  inviteSlot,
}: PersonalEmptyStateProps) {
  const openExpenseForm = useUiStore((s) => s.openExpenseForm);

  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm">
      <div className="relative px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-start gap-3 text-start">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/12">
            {household ? <HouseholdMark /> : <LedgerMark />}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-pretty text-body font-semibold text-foreground">
              {household
                ? "خرج خانه از همین‌جا شروع می‌شود"
                : "دفتر ماه آماده‌ست"}
            </p>
            <p className="mt-1 text-pretty text-body-sm leading-relaxed text-muted-foreground">
              {canMutate
                ? household
                  ? "اولین درآمد یا هزینه را بزنید — بدون دنگ‌ودونگ بین اعضا."
                  : "اولین درآمد یا هزینه را بزنید تا خلاصه بالا زنده شود."
                : "هنوز تراکنشی ثبت نشده."}
            </p>
          </div>
        </div>

        {canMutate ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <EntryTile
              kind="INCOME"
              delayMs={40}
              onClick={() => openExpenseForm({ transactionType: "INCOME" })}
            />
            <EntryTile
              kind="EXPENSE"
              delayMs={90}
              onClick={() => openExpenseForm({ transactionType: "EXPENSE" })}
            />
          </div>
        ) : null}

        {canMutate && inviteSlot ? (
          <div className="mt-3 border-t border-border/50 pt-3">{inviteSlot}</div>
        ) : null}
      </div>
    </div>
  );
}
