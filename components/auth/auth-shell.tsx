import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { APP_VERSION } from "@/lib/app-version";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Shared atmosphere for login / register.
 * Brand lockup is the LCP candidate — no opacity animations, light decoration.
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
        <h1 className="flex justify-center">
          <BrandLockup size="lg" />
        </h1>
        <p className="mx-auto mt-3 max-w-68 text-caption leading-relaxed text-muted-foreground">
          دفتر مشترک هزینه‌ها — سفر، شریک زندگی، ساختمان
        </p>
      </div>

      <div className="relative z-1 w-full max-w-md">{children}</div>

      <footer className="relative z-1 mt-7 text-center">
        <p className="inline-flex items-center justify-center gap-1.5 text-caption text-muted-foreground">
          <Link
            href="/"
            className="font-medium transition-colors hover:text-foreground"
          >
            <BrandLockup size="sm" />
          </Link>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <span dir="ltr" className="tabular-nums" translate="no">
            ver {APP_VERSION}
          </span>
        </p>
      </footer>
    </main>
  );
}
