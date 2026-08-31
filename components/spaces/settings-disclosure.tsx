"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SettingsDisclosureProps = {
  title: string;
  summary?: string;
  /** When true, section starts expanded. */
  defaultOpen?: boolean;
  /** Force open (e.g. after an error in the section). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
};

/**
 * Compact accordion for long space-settings blocks (خانه / شخصی).
 * Keeps the first viewport focused on primary settings.
 */
export function SettingsDisclosure({
  title,
  summary,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  children,
  className,
}: SettingsDisclosureProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;

  function setOpen(next: boolean) {
    onOpenChange?.(next);
    if (openProp === undefined) setUncontrolled(next);
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-start transition-colors hover:bg-muted/30 active:bg-muted/40"
      >
        <div className="min-w-0 flex-1">
          <p className="text-caption font-bold text-foreground">{title}</p>
          {summary ? (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {summary}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        >
          <ChevronDownIcon className="size-4" />
        </span>
      </button>
      {open ? (
        <div className="border-t border-border/40 px-3.5 pb-3.5 pt-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
