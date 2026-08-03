import Link from "next/link";
import { APP_VERSION } from "@/lib/app-version";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Shared atmosphere for login / register — soft mist orbs + brand hero.
 * Brand name is the first viewport signal; form card is the interaction.
 */
export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <main
      className={cn(
        "relative mx-auto flex min-h-full w-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-6 sm:py-14",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-e-[18%] top-[8%] size-[min(22rem,70vw)] rounded-full bg-highlight/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-s-[20%] bottom-[6%] size-[min(18rem,60vw)] rounded-full bg-primary/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[18%] h-px bg-gradient-to-l from-transparent via-primary/40 to-transparent opacity-70"
      />

      <div className="relative z-1 mb-6 w-full max-w-md text-center sm:mb-8">
        <p className="animate-fade-up text-[11px] font-bold tracking-[0.28em] text-primary/80">
          SUPERHESAB
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-[2.15rem]">
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
