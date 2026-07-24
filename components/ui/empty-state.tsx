import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: "expense" | "balance" | "checklist" | "space";
  actionNode?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
};

function IconExpense() {
  return (
    <svg viewBox="0 0 48 48" className="size-8" fill="none" aria-hidden>
      <rect x="8" y="10" width="32" height="28" rx="6" fill="currentColor" opacity="0.12" />
      <path
        d="M16 20h16M16 26h10M16 32h14"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <circle cx="34" cy="14" r="8" fill="currentColor" opacity="0.2" />
      <path
        d="M34 11v6M31 14h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBalance() {
  return (
    <svg viewBox="0 0 48 48" className="size-8" fill="none" aria-hidden>
      <path
        d="M24 10v28M12 18h24"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <path
        d="M12 18c0 6 4 10 12 10s12-4 12-10"
        stroke="currentColor"
        strokeWidth="2.25"
        fill="currentColor"
        fillOpacity="0.1"
      />
    </svg>
  );
}

function IconChecklist() {
  return (
    <svg viewBox="0 0 48 48" className="size-8" fill="none" aria-hidden>
      <rect x="10" y="8" width="28" height="32" rx="6" fill="currentColor" opacity="0.12" />
      <path
        d="M17 18h14M17 24h14M17 30h9"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <path
        d="M16 36l3 3 7-8"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSpace() {
  return (
    <svg viewBox="0 0 48 48" className="size-8" fill="none" aria-hidden>
      <rect x="8" y="12" width="32" height="24" rx="6" fill="currentColor" opacity="0.12" />
      <path
        d="M16 28c2.5-4 5.5-6 8-6s5.5 2 8 6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <circle cx="24" cy="20" r="3.5" stroke="currentColor" strokeWidth="2.25" />
      <path
        d="M12 36h24"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

const icons = {
  expense: IconExpense,
  balance: IconBalance,
  checklist: IconChecklist,
  space: IconSpace,
};

export function EmptyState({
  title,
  description,
  icon = "expense",
  actionNode,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const Icon = icons[icon];
  return (
    <div
      className={cn(
        "animate-fade-up flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card/80 px-5 py-10 text-center",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/8 text-primary">
        <Icon />
      </div>
      <div className="space-y-1">
        <p className="text-body font-semibold text-foreground">{title}</p>
        <p className="mx-auto max-w-[18rem] text-body-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {actionNode || secondaryAction ? (
        <div className="mt-1 flex w-full max-w-sm flex-col items-stretch gap-2">
          {actionNode}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
