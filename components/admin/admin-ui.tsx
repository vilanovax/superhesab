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
      <header className="mb-3">
        <h2 className="text-body-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-caption leading-relaxed text-muted-foreground">
            {description}
          </p>
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
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warn" | "primary";
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-3.5 shadow-sm",
        "transition-[border-color,box-shadow] duration-150",
        tone === "default" && "border-border/50",
        tone === "success" && "border-success/30",
        tone === "warn" && "border-destructive/25",
        tone === "primary" && "border-primary/25",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-3 start-0 w-[3px] rounded-full",
          tone === "success" && "bg-success",
          tone === "warn" && "bg-destructive",
          tone === "primary" && "bg-primary",
          tone === "default" && "bg-primary/35",
        )}
      />
      <p className="ps-2 text-[11px] font-semibold text-foreground/65">
        {label}
      </p>
      <p className="mt-1 ps-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 ps-2 text-[11px] leading-snug text-foreground/55">
          {hint}
        </p>
      ) : null}
    </div>
  );
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
    <div className="mb-3 space-y-2">
      <div className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-card/80 p-2 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
        {children}
      </div>
      {countLabel ? (
        <p className="px-0.5 text-caption text-muted-foreground">{countLabel}</p>
      ) : null}
    </div>
  );
}

export const adminFieldClass =
  "h-10 flex-1 rounded-xl border border-border/60 bg-background px-3 text-sm shadow-none outline-none transition-[border-color,box-shadow] focus-visible:border-primary/35 focus-visible:ring-2 focus-visible:ring-ring/40";

export const adminSelectClass =
  "h-10 rounded-xl border border-border/60 bg-background px-3 text-sm font-medium shadow-none outline-none transition-[border-color,box-shadow] focus-visible:border-primary/35 focus-visible:ring-2 focus-visible:ring-ring/40";

export const adminFilterBtnClass =
  "h-10 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]";
