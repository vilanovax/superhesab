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

const QUICK: { href: string; label: string; hint: string }[] = [
  { href: "/admin/users", label: "کاربران", hint: "جستجو و نقش" },
  { href: "/admin/spaces", label: "دفاتر", hint: "وضعیت فضاها" },
  { href: "/admin/backup", label: "بک‌آپ", hint: "خروجی و بازیابی" },
  { href: "/admin/flags", label: "پرچم‌ها", hint: "قطع‌کن‌ها" },
  { href: "/admin/storage", label: "ذخیره", hint: "مصرف S3" },
  { href: "/admin/audit", label: "گزارش", hint: "ردپای ادمین" },
];

export default async function AdminDashboardPage() {
  const { user } = await requirePlatformAdmin();
  const [stats, storage, flags] = await Promise.all([
    loadAdminDashboardStats(),
    loadStorageUsageStats(),
    listFeatureFlags(),
  ]);

  const flagsOff = flags.filter((f) => !f.enabled).length;
  const maxType = Math.max(1, ...stats.spacesByType.map((r) => r.count));

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
            value={stats.usersReal}
            hint={`${stats.usersVirtual} مجازی · ${stats.usersDisabled} غیرفعال`}
            tone="primary"
          />
          <AdminKpi
            label="ثبت‌نام ۷ روز"
            value={stats.usersRegistered7d}
            hint={`۳۰ روز: ${stats.usersRegistered30d}`}
            tone="success"
          />
          <AdminKpi
            label="فعال ۳۰ روز"
            value={stats.usersActive30d}
            hint="بر اساس آخرین ورود"
            tone={stats.usersActive30d === 0 ? "warn" : "default"}
          />
          <AdminKpi
            label="دفاتر فعال"
            value={stats.spacesActive}
            hint={`${stats.spacesArchived} آرشیو · ${stats.spacesTotal} کل`}
          />
          <AdminKpi label="هزینه‌ها" value={stats.expensesTotal} />
          <AdminKpi label="تسویه‌ها" value={stats.settlementsTotal} />
        </section>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {QUICK.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-2xl border border-border/50 bg-card px-3 py-2.5 shadow-sm",
                "transition-[border-color,box-shadow,transform] duration-150",
                "hover:border-primary/30 hover:shadow-md active:scale-[0.985]",
              )}
            >
              <p className="text-caption font-semibold text-foreground">
                {item.label}
              </p>
              <p className="mt-0.5 text-micro text-muted-foreground">
                {item.hint}
              </p>
            </Link>
          ))}
        </section>

        <AdminSection
          title="قالب‌های فعال"
          description="فقط دفاتر غیرآرشیو"
        >
          {stats.spacesByType.length === 0 ? (
            <p className="text-caption text-muted-foreground">هنوز دفتری نیست.</p>
          ) : (
            <ul className="space-y-2">
              {stats.spacesByType.map((row) => (
                <li key={row.type} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-caption font-semibold text-foreground">
                      {row.label}
                    </span>
                    <span className="text-body-sm font-bold tabular-nums text-primary">
                      {row.count}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-[width] duration-300"
                      style={{
                        width: `${Math.max(8, (row.count / maxType) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {stats.partnerWaitingInvite > 0 ? (
            <p className="mt-3 rounded-xl bg-primary/5 px-3 py-2 text-caption text-muted-foreground ring-1 ring-primary/10">
              {stats.partnerWaitingInvite} حساب مشترک منتظر طرف مقابل است.
            </p>
          ) : null}
        </AdminSection>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <Link
            href="/admin/storage"
            className="rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm transition-[border-color,transform] duration-150 hover:border-primary/30 active:scale-[0.99]"
          >
            <p className="text-caption font-medium text-muted-foreground">
              مصرف ذخیره
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
              {formatAdminBytes(storage.total.bytes)}
            </p>
            <p className="mt-0.5 text-micro text-muted-foreground">
              {new Intl.NumberFormat("fa-IR").format(storage.total.count)} فایل
              {storage.configured ? " · S3 فعال" : " · S3 خاموش"}
            </p>
          </Link>
          <Link
            href="/admin/flags"
            className="rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm transition-[border-color,transform] duration-150 hover:border-primary/30 active:scale-[0.99]"
          >
            <p className="text-caption font-medium text-muted-foreground">
              پرچم‌ها
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
              {flagsOff === 0
                ? "همه روشن"
                : `${new Intl.NumberFormat("fa-IR").format(flagsOff)} خاموش`}
            </p>
            <p className="mt-0.5 text-micro text-muted-foreground">
              {flags.length} قطع‌کن پلتفرم
            </p>
          </Link>
        </div>

        <section className="rounded-2xl border border-dashed border-border/55 bg-muted/25 px-3.5 py-3">
          <p className="text-caption font-semibold text-foreground">
            نسخه اپ · {APP_VERSION}
          </p>
          <p className="mt-1 text-micro leading-relaxed text-muted-foreground">
            پنل ادمین: داشبورد، کاربران، دفاتر، بک‌آپ، پرچم، ذخیره، گزارش.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
