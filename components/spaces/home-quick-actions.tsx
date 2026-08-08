/**
 * Home quick actions — the two things a returning user actually does.
 * Both are real deep links: «ثبت خرج» opens the most recently used space's
 * ledger, «تسویه» jumps to the balances tab of the space with the largest
 * outstanding position. Rendered only when the target exists.
 *
 * Icons deliberately avoid a bare «+» so this CTA never collides with
 * «دفتر جدید» elsewhere on the page.
 */

import type { ReactNode } from "react";
import { PrefetchSpaceLink } from "@/components/spaces/prefetch-space-link";
import { cn } from "@/lib/utils";

function ExpenseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 4.5h8.5A2.5 2.5 0 0 1 18 7v12.5H8.5A2.5 2.5 0 0 1 6 17z" />
      <path d="M6 4.5V17a2.5 2.5 0 0 0 2.5 2.5" />
      <path d="M10 9.5h5M10 13h3.5" />
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
      strokeWidth="1.85"
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
    <PrefetchSpaceLink
      href={href}
      className={cn(
        "group flex min-h-14 flex-1 cursor-pointer items-center gap-3 rounded-[1.15rem] px-3.5 py-3",
        "transition-[box-shadow,background-color,border-color,transform] duration-200 ease-out",
        "active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        tone === "primary"
          ? "bg-primary text-primary-foreground shadow-md hover:brightness-[0.96]"
          : "border border-border/55 bg-card text-foreground shadow-sm hover:border-primary/25 hover:shadow-md",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-2xl",
          tone === "primary"
            ? "bg-on-hero/15 text-primary-foreground"
            : "bg-secondary text-primary",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-semibold leading-tight">
          {label}
        </span>
        {hint ? (
          <span
            className={cn(
              "mt-0.5 block truncate text-caption leading-tight",
              tone === "primary"
                ? "text-primary-foreground/72"
                : "text-muted-foreground",
            )}
          >
            {hint}
          </span>
        ) : null}
      </span>
      <svg
        viewBox="0 0 24 24"
        className={cn(
          "size-4 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5",
          tone === "primary"
            ? "text-primary-foreground/55"
            : "text-muted-foreground/45",
        )}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </PrefetchSpaceLink>
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

  /**
   * When only «ثبت خرج» shows, keep it as a card (not a second blue bar)
   * so it doesn't compete with the hero summary above.
   */
  const expenseTone = settleSpace ? "primary" : "muted";

  return (
    <nav
      className="animate-fade-up mb-5 flex gap-2.5"
      aria-label="میانبرهای سریع"
      style={{ animationDelay: "40ms" }}
    >
      {recentSpace ? (
        <Action
          href={`/spaces/${recentSpace.id}?tab=expenses`}
          icon={<ExpenseIcon className="size-[1.15rem]" />}
          label="ثبت خرج"
          hint={recentSpace.name}
          tone={expenseTone}
        />
      ) : null}
      {settleSpace ? (
        <Action
          href={`/spaces/${settleSpace.id}?tab=balances`}
          icon={<SettleIcon className="size-[1.15rem]" />}
          label="تسویه"
          hint={settleSpace.name}
        />
      ) : null}
    </nav>
  );
}
