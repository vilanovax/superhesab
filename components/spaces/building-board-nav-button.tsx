import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function BoardIcon({ className }: { className?: string }) {
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
      <path d="M4 5.5h16v11H4z" />
      <path d="M8 20h8M12 16.5V20" />
      <path d="M7.5 9h4M7.5 12h9" />
    </svg>
  );
}

function faDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

type BuildingBoardNavButtonProps = {
  spaceId: string;
  /** Open / in-progress suggestions — shown as badge. */
  badgeCount?: number;
  className?: string;
};

/** Header shortcut to manager community board (announcements + suggestions). */
export function BuildingBoardNavButton({
  spaceId,
  badgeCount = 0,
  className,
}: BuildingBoardNavButtonProps) {
  const showBadge = badgeCount > 0;
  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className={cn(
        "relative size-10 shrink-0 rounded-2xl border-border/55 bg-card shadow-none",
        className,
      )}
      aria-label={
        showBadge
          ? `برد ساختمان · ${badgeCount} پیشنهاد باز`
          : "برد ساختمان"
      }
    >
      <Link href={`/spaces/${spaceId}/board`}>
        <BoardIcon className="size-4" />
        {showBadge ? (
          <span className="absolute -start-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold leading-none text-primary-foreground ring-2 ring-background">
            {badgeCount > 9 ? "۹+" : faDigits(badgeCount)}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
