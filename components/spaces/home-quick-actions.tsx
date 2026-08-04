/**
 * Home quick actions — the two things a returning user actually does.
 * Both are real deep links: «ثبت خرج» opens the most recently used space's
 * ledger, «تسویه» jumps to the balances tab of the space with the largest
 * outstanding position. Rendered only when the target exists.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SettleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </svg>
  );
}

function Action({
  href,
  icon,
  label,
  hint,
  tone = "muted",
}: {
  href: string;
  icon: ReactNode;
  label: string;
  hint?: string;
  tone?: "primary" | "muted";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-1 items-center gap-2.5 rounded-2xl border px-3.5 py-2.5",
        "transition-[box-shadow,border-color,transform] duration-150 ease-out",
        "hover:shadow-md active:scale-[0.98]",
        tone === "primary"
          ? "border-primary/25 bg-primary text-primary-foreground hover:border-primary/40"
          : "border-border/50 bg-card text-foreground hover:border-primary/25",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-xl",
          tone === "primary"
            ? "bg-on-hero-soft text-primary-foreground"
            : "bg-secondary text-primary",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-body-sm font-semibold leading-tight">
          {label}
        </span>
        {hint ? (
          <span
            className={cn(
              "block truncate text-caption leading-tight",
              tone === "primary"
                ? "text-primary-foreground/70"
                : "text-muted-foreground",
            )}
          >
            {hint}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function HomeQuickActions({
  recentSpace,
  settleSpace,
}: {
  recentSpace?: { id: string; name: string } | null;
  settleSpace?: { id: string; name: string } | null;
}) {
  if (!recentSpace && !settleSpace) return null;

  return (
    <nav
      className="animate-fade-up mb-4 flex gap-2"
      aria-label="میانبرهای سریع"
    >
      {recentSpace ? (
        <Action
          href={`/spaces/${recentSpace.id}?tab=expenses`}
          icon={<PlusIcon className="size-4" />}
          label="ثبت خرج"
          hint={recentSpace.name}
          tone="primary"
        />
      ) : null}
      {settleSpace ? (
        <Action
          href={`/spaces/${settleSpace.id}?tab=balances`}
          icon={<SettleIcon className="size-4" />}
          label="تسویه"
          hint={settleSpace.name}
        />
      ) : null}
    </nav>
  );
}
