import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminKpi, AdminSection } from "@/components/admin/admin-ui";
import { formatAdminBytes } from "@/lib/admin/format";
import { loadAdminDashboardStats } from "@/lib/admin/stats";
import { loadStorageUsageStats } from "@/lib/admin/storage-stats";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { APP_VERSION } from "@/lib/app-version";
import { listFeatureFlags } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

type QuickItem = {
  href: string;
  label: string;
  hint: string;
  icon: "users" | "spaces" | "backup" | "flags" | "storage" | "audit";
};

const QUICK: QuickItem[] = [
  { href: "/admin/users", label: "کاربران", hint: "جستجو و نقش", icon: "users" },
  { href: "/admin/spaces", label: "دفاتر", hint: "وضعیت فضاها", icon: "spaces" },
  { href: "/admin/backup", label: "بک‌آپ", hint: "خروجی و بازیابی", icon: "backup" },
  { href: "/admin/flags", label: "پرچم‌ها", hint: "قطع‌کن‌ها", icon: "flags" },
  { href: "/admin/storage", label: "ذخیره", hint: "مصرف S3", icon: "storage" },
  { href: "/admin/audit", label: "گزارش", hint: "ردپای ادمین", icon: "audit" },
];

const TYPE_BAR: Record<string, string> = {
  TRIP: "bg-sky-500/80",
  PARTNER: "bg-violet-500/75",
  FAMILY: "bg-emerald-500/75",
  PERSONAL: "bg-emerald-500/60",
  BUILDING: "bg-amber-500/80",
  FUND: "bg-teal-500/75",
};

function QuickIcon({ name }: { name: QuickItem["icon"] }) {
  const common = "size-4";
  switch (name) {
    case "users":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden>
          <circle cx="9" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
          <path d="M3.5 19c.6-3 2.8-4.75 5.5-4.75S14.4 16 15 19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="17" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.75" />
          <path d="M19.5 18.5c.3-1.6 1.4-2.7 2.7-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case "spaces":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden>
          <rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
          <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case "backup":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden>
          <path d="M12 4v10m0 0-3.5-3.5M12 14l3.5-3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 17.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case "flags":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden>
          <path d="M6 4v16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M6 5h9l-1.5 3.5L15 12H6" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
      );
    case "storage":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden>
          <ellipse cx="12" cy="6.5" rx="7" ry="2.5" stroke="currentColor" strokeWidth="1.75" />
          <path d="M5 6.5v5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-5" stroke="currentColor" strokeWidth="1.75" />
          <path d="M5 11.5v5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-5" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      );
    case "audit":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden>
          <path d="M8 6h10M8 11h10M8 16h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M5 6h.01M5 11h.01M5 16h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
  }
}

export default async function AdminDashboardPage() {
  const { user } = await requirePlatformAdmin();
  const [stats, storage, flags] = await Promise.all([
    loadAdminDashboardStats(),
    loadStorageUsageStats(),
    listFeatureFlags(),
  ]);

  const flagsOff = flags.filter((f) => !f.enabled).length;
  const maxType = Math.max(1, ...stats.spacesByType.map((r) => r.count));
  const fa = new Intl.NumberFormat("fa-IR");

  return (
    <AdminShell
      title="داشبورد"
      subtitle="نمای کلی ثبت‌نام، دفاتر و استفاده"
      adminName={user.name?.trim() || user.phone}
      pathname="/admin"
    >
      <div className="space-y-4">
        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <AdminKpi
            label="کاربران واقعی"
            value={fa.format(stats.usersReal)}
            hint={`${fa.format(stats.usersVirtual)} مجازی · ${fa.format(stats.usersDisabled)} غیرفعال`}
            tone="primary"
          />
          <AdminKpi
            label="ثبت‌نام ۷ روز"
            value={fa.format(stats.usersRegistered7d)}
            hint={`۳۰ روز: ${fa.format(stats.usersRegistered30d)}`}
            tone="success"
          />
          <AdminKpi
            label="فعال ۳۰ روز"
            value={fa.format(stats.usersActive30d)}
            hint="بر اساس آخرین ورود"
            tone="default"
          />
          <AdminKpi
            label="دفاتر فعال"
            value={fa.format(stats.spacesActive)}
            hint={`${fa.format(stats.spacesArchived)} آرشیو · ${fa.format(stats.spacesTotal)} کل`}
            tone="primary"
          />
          <AdminKpi
            label="هزینه‌ها"
            value={fa.format(stats.expensesTotal)}
            hint="ثبت‌شده در همه دفاتر"
          />
          <AdminKpi
            label="تسویه‌ها"
            value={fa.format(stats.settlementsTotal)}
            hint="تراکنش‌های تسویه"
          />
        </section>

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
            <h2 className="text-caption font-semibold text-foreground">
              میانبرها
            </h2>
            <p className="text-micro text-foreground/50">بخش‌های پنل</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {QUICK.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-start gap-2.5 rounded-2xl border border-border/50 bg-card px-3 py-2.5 shadow-sm",
                  "transition-[border-color,box-shadow,transform] duration-150 ease-out",
                  "hover:border-primary/30 hover:shadow-md active:scale-[0.985]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                  <QuickIcon name={item.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block text-caption font-semibold text-foreground">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-foreground/55">
                    {item.hint}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <AdminSection title="قالب‌های فعال" description="فقط دفاتر غیرآرشیو">
          {stats.spacesByType.length === 0 ? (
            <p className="text-caption text-foreground/55">هنوز دفتری نیست.</p>
          ) : (
            <ul className="space-y-2.5">
              {stats.spacesByType.map((row) => {
                const pct = Math.max(10, (row.count / maxType) * 100);
                return (
                  <li key={row.type}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-caption font-semibold text-foreground">
                        {row.label}
                      </span>
                      <span className="text-caption font-bold tabular-nums text-foreground/80">
                        {fa.format(row.count)}
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-300",
                          TYPE_BAR[row.type] ?? "bg-primary/70",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {stats.partnerWaitingInvite > 0 ? (
            <p className="mt-3 rounded-xl bg-amber-500/8 px-3 py-2 text-caption text-foreground/70 ring-1 ring-amber-500/15">
              {fa.format(stats.partnerWaitingInvite)} حساب مشترک منتظر طرف مقابل
              است.
            </p>
          ) : null}
        </AdminSection>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <Link
            href="/admin/storage"
            className={cn(
              "group rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm",
              "transition-[border-color,box-shadow,transform] duration-150",
              "hover:border-primary/30 hover:shadow-md active:scale-[0.99]",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-semibold text-foreground/65">
                مصرف ذخیره
              </p>
              <span
                className={cn(
                  "rounded-lg px-1.5 py-0.5 text-[10px] font-semibold",
                  storage.configured
                    ? "bg-success-soft text-success"
                    : "bg-muted text-foreground/55",
                )}
              >
                {storage.configured ? "S3 فعال" : "S3 خاموش"}
              </span>
            </div>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-foreground">
              {formatAdminBytes(storage.total.bytes)}
            </p>
            <p className="mt-0.5 text-[11px] text-foreground/55">
              {fa.format(storage.total.count)} فایل ثبت‌شده
            </p>
          </Link>
          <Link
            href="/admin/flags"
            className={cn(
              "group rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm",
              "transition-[border-color,box-shadow,transform] duration-150",
              "hover:border-primary/30 hover:shadow-md active:scale-[0.99]",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-semibold text-foreground/65">
                پرچم‌ها
              </p>
              <span
                className={cn(
                  "rounded-lg px-1.5 py-0.5 text-[10px] font-semibold",
                  flagsOff === 0
                    ? "bg-success-soft text-success"
                    : "bg-amber-500/15 text-amber-800",
                )}
              >
                {flagsOff === 0 ? "سالم" : `${fa.format(flagsOff)} خاموش`}
              </span>
            </div>
            <p className="mt-1.5 text-xl font-bold text-foreground">
              {flagsOff === 0 ? "همه روشن" : `${fa.format(flagsOff)} خاموش`}
            </p>
            <p className="mt-0.5 text-[11px] text-foreground/55">
              {fa.format(flags.length)} قطع‌کن پلتفرم
            </p>
          </Link>
        </div>

        <section className="rounded-2xl border border-dashed border-border/50 bg-muted/20 px-3.5 py-2.5">
          <p className="text-[11px] font-semibold text-foreground/70">
            نسخه اپ · {APP_VERSION}
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
