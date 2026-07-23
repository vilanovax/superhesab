import type { ReactNode } from "react";
import type { ExpenseCategory } from "@/lib/categorizer";
import { CATEGORY_LABELS } from "@/lib/categorizer";
import { cn } from "@/lib/utils";

type CategoryIconProps = {
  category: ExpenseCategory;
  className?: string;
};

function IconShell({
  className,
  tone,
  children,
  label,
}: {
  className?: string;
  tone: string;
  children: ReactNode;
  label: string;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-xl",
        tone,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CategoryIcon({ category, className }: CategoryIconProps) {
  const label = CATEGORY_LABELS[category];

  switch (category) {
    case "FOOD":
      return (
        <IconShell
          className={className}
          label={label}
          tone="bg-amber-500/15 text-amber-700"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
            <path
              d="M8 3v8M8 11v10M6 3c0 2.5 2 4 2 8M10 3c0 2.5-2 4-2 8M16 3v7a3 3 0 0 1-3 3v8"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconShell>
      );
    case "TRANSPORT":
      return (
        <IconShell
          className={className}
          label={label}
          tone="bg-sky-500/15 text-sky-700"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
            <path
              d="M5 16h14l-1.2-6.5A3 3 0 0 0 14.9 7H9.1a3 3 0 0 0-2.9 2.5L5 16ZM7 16v2M17 16v2M6 12h12"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconShell>
      );
    case "ACCOMMODATION":
      return (
        <IconShell
          className={className}
          label={label}
          tone="bg-emerald-500/15 text-emerald-700"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
            <path
              d="M4 20V10l8-6 8 6v10M9 20v-6h6v6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconShell>
      );
    case "ENTERTAINMENT":
      return (
        <IconShell
          className={className}
          label={label}
          tone="bg-violet-500/15 text-violet-700"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
            <path
              d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8ZM8 8V6a4 4 0 0 1 8 0v2"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconShell>
      );
    case "SHOPPING":
      return (
        <IconShell
          className={className}
          label={label}
          tone="bg-rose-500/15 text-rose-700"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
            <path
              d="M6 8h12l-1 12H7L6 8ZM9 8a3 3 0 0 1 6 0"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconShell>
      );
    default:
      return (
        <IconShell
          className={className}
          label={label}
          tone="bg-muted text-muted-foreground"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
            <path
              d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconShell>
      );
  }
}
