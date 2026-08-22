import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function NotesIcon({ className }: { className?: string }) {
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
      <path d="M8 4h8a2 2 0 0 1 2 2v14l-3-1.5L12 20l-3-1.5L6 20V6a2 2 0 0 1 2-2z" />
      <path d="M9.5 9h5M9.5 12.5h5M9.5 16h3" />
    </svg>
  );
}

type SpaceNotesNavButtonProps = {
  spaceId: string;
  className?: string;
};

/** Header shortcut to the shared notes hub (pad + checklist). */
export function SpaceNotesNavButton({
  spaceId,
  className,
}: SpaceNotesNavButtonProps) {
  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className={cn(
        "relative size-11 shrink-0 rounded-2xl border-border/55 bg-card shadow-none",
        className,
      )}
      aria-label="یادداشت"
    >
      <Link href={`/spaces/${spaceId}/notes`}>
        <NotesIcon className="size-4" />
      </Link>
    </Button>
  );
}
