import { cn } from "@/lib/utils";

/** Shared pulse placeholder for dynamically loaded space tab panels. */
export function SpacePanelFallback({
  className,
  rows = 4,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-2xl bg-muted/50 ring-1 ring-border/30"
        />
      ))}
    </div>
  );
}
