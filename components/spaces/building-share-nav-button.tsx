import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function ShareReportIcon({ className }: { className?: string }) {
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
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" />
    </svg>
  );
}

type BuildingShareNavButtonProps = {
  spaceId: string;
  className?: string;
};

/** Header shortcut to building public-report settings. */
export function BuildingShareNavButton({
  spaceId,
  className,
}: BuildingShareNavButtonProps) {
  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className={cn(
        "relative size-11 shrink-0 rounded-2xl border-border/55 bg-card shadow-none",
        className,
      )}
      aria-label="گزارش عمومی همسایه‌ها"
    >
      <Link href={`/spaces/${spaceId}/settings#building-share`}>
        <ShareReportIcon className="size-4" />
      </Link>
    </Button>
  );
}
