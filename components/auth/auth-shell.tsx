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
        "relative mx-auto flex min-h-full w-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12",
        className,
      )}
    >
      {/* Soft wash — avoid large blur-3xl orbs (slow paint under mobile throttling) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_12%,color-mix(in_oklab,var(--highlight)_40%,transparent),transparent_52%),radial-gradient(ellipse_at_88%_88%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_48%)]"
      />

      <div className="relative z-1 mb-5 w-full max-w-md text-center sm:mb-7">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 5.5h10.5A2.5 2.5 0 0 1 18 8v11.5H7.5A2.5 2.5 0 0 1 5 17z" />
            <path d="M5 5.5V17a2.5 2.5 0 0 0 2.5 2.5" />
            <path d="M9 9.5h6M9 13h4" />
          </svg>
        </div>
        <p className="text-[10px] font-bold tracking-[0.22em] text-primary/70">
          SUPERHESAB
        </p>
        <h1 className="mt-1.5 text-balance text-[2rem] font-bold tracking-tight text-foreground sm:text-[2.15rem]">
          سوپرحساب
        </h1>
        <p className="mx-auto mt-1.5 max-w-68 text-caption leading-relaxed text-muted-foreground">
          دفتر مشترک هزینه‌ها — سفر، شریک زندگی، ساختمان
        </p>
      </div>

      <div className="relative z-1 w-full max-w-md">{children}</div>

      <footer className="relative z-1 mt-7 text-center">
        <p className="text-caption text-muted-foreground">
          <Link
            href="/"
            className="font-medium transition-colors hover:text-foreground"
          >
            سوپرحساب
          </Link>
          <span className="mx-1.5 text-border">·</span>
          <span dir="ltr" className="tabular-nums" translate="no">
            ver {APP_VERSION}
          </span>
        </p>
      </footer>
    </main>
  );
}
