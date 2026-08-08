import Link from "next/link";
import { cn } from "@/lib/utils";

export function AdminSection({
  title,
  description,
  children,
  className,
  tone = "default",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "danger" | "accent";
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm",
        tone === "default" && "border-border/50",
        tone === "danger" && "border-destructive/25",
        tone === "accent" && "border-primary/20",
        className,
      )}
    >
      <header className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 className="text-pretty text-caption font-bold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-[11px] text-muted-foreground">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function AdminKpi({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warn" | "primary";
  /** Optional link target for clickable KPIs. */
  href?: string;
}) {
  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-2.5 start-0 w-[3px] rounded-full",
          tone === "success" && "bg-success",
          tone === "warn" && "bg-destructive",
          tone === "primary" && "bg-primary",
          tone === "default" && "bg-primary/35",
        )}
      />
      <p className="ps-2 text-[11px] font-semibold text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 ps-2 text-xl font-bold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 ps-2 text-[10px] leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </>
  );

  const className = cn(
    "relative overflow-hidden rounded-xl border bg-card px-3 py-2.5 shadow-sm",
    "transition-[border-color,box-shadow,transform] duration-150",
    tone === "default" && "border-border/50",
    tone === "success" && "border-success/30",
    tone === "warn" && "border-destructive/25",
    tone === "primary" && "border-primary/25",
    href &&
      "hover:border-primary/30 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

export function AdminBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "danger" | "primary";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-micro font-semibold",
        tone === "neutral" && "bg-muted text-muted-foreground",
        tone === "success" && "bg-success-soft text-success",
        tone === "danger" && "bg-destructive-soft text-destructive",
        tone === "primary" && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </span>
  );
}

export function AdminFilterBar({
  children,
  countLabel,
}: {
  children: React.ReactNode;
  countLabel?: string;
}) {
  return (
    <div className="mb-2.5 space-y-1.5">
      <div className="flex flex-col gap-1.5 rounded-xl border border-border/50 bg-card p-1.5 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
        {children}
      </div>
      {countLabel ? (
        <p className="px-0.5 text-[11px] tabular-nums text-muted-foreground">
          {countLabel}
        </p>
      ) : null}
    </div>
  );
}

export const adminFieldClass =
  "h-9 min-w-0 flex-1 rounded-lg border border-border/60 bg-background px-2.5 text-caption shadow-none outline-none transition-[border-color,box-shadow] focus-visible:border-primary/35 focus-visible:ring-2 focus-visible:ring-ring/40";

export const adminSelectClass =
  "h-9 shrink-0 rounded-lg border border-border/60 bg-background px-2.5 text-caption font-medium shadow-none outline-none transition-[border-color,box-shadow] focus-visible:border-primary/35 focus-visible:ring-2 focus-visible:ring-ring/40";

export const adminFilterBtnClass =
  "h-9 shrink-0 rounded-lg bg-primary px-3.5 text-caption font-semibold text-primary-foreground transition-transform active:scale-[0.98]";
