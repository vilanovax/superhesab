import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function ContactsIcon({ className }: { className?: string }) {
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
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.74-1.27a2 2 0 0 1 2.11-.45c.74.34 1.53.57 2.34.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

type BuildingContactsNavButtonProps = {
  spaceId: string;
  className?: string;
};

/** Header shortcut to manager essential-contacts directory. */
export function BuildingContactsNavButton({
  spaceId,
  className,
}: BuildingContactsNavButtonProps) {
  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className={cn(
        "relative size-10 shrink-0 rounded-2xl border-border/55 bg-card shadow-none",
        className,
      )}
      aria-label="شماره‌های ضروری"
    >
      <Link href={`/spaces/${spaceId}/contacts`}>
        <ContactsIcon className="size-4" />
      </Link>
    </Button>
  );
}
