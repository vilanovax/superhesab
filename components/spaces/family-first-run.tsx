"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared first-run shell for FAMILY tabs — identity + one action, no dashed voids. */
export function FamilyFirstRun({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm">
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3 text-start">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/12">
            {icon}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-pretty text-body font-semibold text-foreground">
              {title}
            </p>
            <p className="mt-1 text-pretty text-body-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  );
}

export function FamilyFirstRunTile({
  label,
  hint,
  onClick,
  tone = "default",
}: {
  label: string;
  hint: string;
  onClick: () => void;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-24 rounded-2xl px-3.5 py-3.5 text-start",
        "transition-[transform,background-color] duration-150 ease-out active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "touch-manipulation [-webkit-tap-highlight-color:transparent]",
        tone === "success" &&
          "bg-success-soft text-success ring-1 ring-success/20 hover:bg-success-soft/80 focus-visible:ring-success/40",
        tone === "danger" &&
          "bg-destructive-soft text-destructive ring-1 ring-destructive/20 hover:bg-destructive-soft/80 focus-visible:ring-destructive/40",
        tone === "default" &&
          "bg-primary/8 text-primary ring-1 ring-primary/15 hover:bg-primary/12 focus-visible:ring-primary/40",
      )}
    >
      <span className="block text-body-sm font-bold">{label}</span>
      <span
        className={cn(
          "mt-0.5 block text-caption",
          tone === "success" && "text-success/80",
          tone === "danger" && "text-destructive/80",
          tone === "default" && "text-primary/75",
        )}
      >
        {hint}
      </span>
    </button>
  );
}
