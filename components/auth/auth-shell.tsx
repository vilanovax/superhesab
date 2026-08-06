import Link from "next/link";
import { APP_VERSION } from "@/lib/app-version";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Shared atmosphere for login / register.
 * Brand h1 is the LCP candidate — no opacity animations, light decoration.
 */
export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <main
      className={cn(
        "relative mx-auto flex min-h-full w-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-6 sm:py-14",
        className,
      )}
    >
      {/* Soft wash — avoid large blur-3xl orbs (slow paint under mobile throttling) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_15%,color-mix(in_oklab,var(--highlight)_45%,transparent),transparent_55%),radial-gradient(ellipse_at_85%_80%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[18%] h-px bg-gradient-to-l from-transparent via-primary/35 to-transparent"
      />

      <div className="relative z-1 mb-6 w-full max-w-md text-center sm:mb-8">
        <p className="text-[11px] font-bold tracking-[0.28em] text-primary/80">
          SUPERHESAB
        </p>
        <h1 className="mt-2 text-balance text-4xl font-bold tracking-tight text-primary sm:text-[2.35rem]">
          سوپرحساب
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
          دفتر مشترک هزینه‌ها — سفر، شریک زندگی، ساختمان
        </p>
      </div>

      <div className="relative z-1 w-full max-w-md">{children}</div>

      <footer className="relative z-1 mt-8 text-center">
        <p className="text-micro text-muted-foreground/80">
          <Link href="/" className="transition-colors hover:text-foreground">
            سوپرحساب
          </Link>
          <span className="mx-1.5 text-border">·</span>
          <span dir="ltr" className="tabular-nums">
            ver {APP_VERSION}
          </span>
        </p>
      </footer>
    </main>
  );
}
