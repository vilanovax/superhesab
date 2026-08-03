import Link from "next/link";
import { APP_VERSION } from "@/lib/app-version";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "داشبورد" },
  { href: "/admin/users", label: "کاربران" },
  { href: "/admin/spaces", label: "دفاتر" },
  { href: "/admin/backup", label: "بک‌آپ" },
  { href: "/admin/audit", label: "گزارش" },
];

type AdminShellProps = {
  title: string;
  subtitle?: string;
  adminName: string;
  pathname: string;
  children: React.ReactNode;
};

export function AdminShell({
  title,
  subtitle,
  adminName,
  pathname,
  children,
}: AdminShellProps) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.2em] text-primary/70">
            ADMIN
          </p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-caption text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Link
            href="/app"
            className="rounded-xl border border-border/60 bg-card px-3 py-1.5 text-caption font-semibold text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          >
            بازگشت به اپ
          </Link>
          <p className="max-w-[10rem] truncate text-micro text-muted-foreground">
            {adminName}
          </p>
        </div>
      </header>

      <nav
        className="mb-4 flex gap-1 overflow-x-auto rounded-2xl bg-muted/70 p-1"
        aria-label="بخش‌های ادمین"
      >
        {NAV.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 shrink-0 items-center justify-center rounded-xl px-3 text-caption font-semibold transition-colors",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1">{children}</div>

      <footer className="mt-6 border-t border-border/40 pt-3 text-center">
        <p className="text-micro text-muted-foreground">
          سوپرحساب ادمین
          <span className="mx-1 text-border">·</span>
          <span dir="ltr" className="tabular-nums">
            ver {APP_VERSION}
          </span>
        </p>
      </footer>
    </main>
  );
}
