import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { APP_VERSION } from "@/lib/app-version";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "داشبورد" },
  { href: "/admin/users", label: "کاربران" },
  { href: "/admin/spaces", label: "دفاتر" },
  { href: "/admin/backup", label: "بک‌آپ" },
  { href: "/admin/flags", label: "پرچم" },
  { href: "/admin/storage", label: "ذخیره" },
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
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[10px] font-bold tracking-[0.18em] text-primary/70"
            translate="no"
          >
            ADMIN
          </p>
          <h1 className="mt-0.5 text-pretty text-xl font-bold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 max-w-[22rem] text-[11px] leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Link
            href="/app"
            className="rounded-xl border border-border/55 bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-sm transition-[color,border-color,transform] duration-150 hover:border-primary/25 hover:text-foreground active:scale-[0.98]"
          >
            بازگشت به اپ
          </Link>
          <p className="max-w-[9.5rem] truncate text-[10px] text-muted-foreground">
            {adminName}
          </p>
        </div>
      </header>

      <nav className="relative mb-3.5 -mx-1" aria-label="بخش‌های ادمین">
        <div className="overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex min-w-full gap-0.5 rounded-2xl bg-muted/80 p-1 ring-1 ring-border/30">
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 shrink-0 items-center justify-center rounded-xl px-2.5 text-[11px] font-semibold transition-[color,background-color,box-shadow,transform] duration-150",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-card/70 hover:text-foreground active:scale-[0.98]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="flex-1 animate-fade-up">{children}</div>

      <footer className="mt-7 border-t border-border/35 pt-3 text-center">
        <p className="inline-flex items-center justify-center gap-1.5 text-micro text-muted-foreground">
          <BrandLockup size="sm" className="text-muted-foreground" />
          <span>ادمین</span>
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
