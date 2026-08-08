import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminKpi, AdminSection } from "@/components/admin/admin-ui";
import { formatAdminBytes } from "@/lib/admin/format";
import { loadAdminDashboardStats } from "@/lib/admin/stats";
import { loadStorageUsageStats } from "@/lib/admin/storage-stats";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { listFeatureFlags } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

const TYPE_BAR: Record<string, string> = {
  TRIP: "bg-sky-500/80",
  PARTNER: "bg-violet-500/75",
  FAMILY: "bg-emerald-500/75",
  PERSONAL: "bg-emerald-500/60",
  BUILDING: "bg-amber-500/80",
  FUND: "bg-teal-500/75",
};

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
      subtitle="ثبت‌نام، دفاتر و سلامت پلتفرم"
      adminName={user.name?.trim() || user.phone}
      pathname="/admin"
    >
      <div className="space-y-3">
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <AdminKpi
            label="کاربران واقعی"
            value={fa.format(stats.usersReal)}
            hint={`${fa.format(stats.usersVirtual)} مجازی · ${fa.format(stats.usersDisabled)} غیرفعال`}
            tone="primary"
            href="/admin/users"
          />
          <AdminKpi
            label="ثبت‌نام ۷ روز"
            value={fa.format(stats.usersRegistered7d)}
            hint={`۳۰ روز: ${fa.format(stats.usersRegistered30d)}`}
            tone="success"
            href="/admin/users"
          />
          <AdminKpi
            label="فعال ۳۰ روز"
            value={fa.format(stats.usersActive30d)}
            hint="بر اساس آخرین ورود"
            href="/admin/users"
          />
          <AdminKpi
            label="دفاتر فعال"
            value={fa.format(stats.spacesActive)}
            hint={`${fa.format(stats.spacesArchived)} آرشیو · ${fa.format(stats.spacesTotal)} کل`}
            tone="primary"
            href="/admin/spaces"
          />
          <AdminKpi
            label="هزینه‌ها"
            value={fa.format(stats.expensesTotal)}
            hint="همه دفاتر"
          />
          <AdminKpi
            label="تسویه‌ها"
            value={fa.format(stats.settlementsTotal)}
            hint="تراکنش تسویه"
          />
        </section>

        <AdminSection
          title="قالب‌های فعال"
          description="دفاتر غیرآرشیو"
          className="p-3.5"
        >
          {stats.spacesByType.length === 0 ? (
            <p className="text-caption text-muted-foreground">هنوز دفتری نیست.</p>
          ) : (
            <ul className="space-y-2">
              {stats.spacesByType.map((row) => {
                const pct = Math.max(12, (row.count / maxType) * 100);
                return (
                  <li key={row.type}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-caption font-semibold text-foreground">
                        {row.label}
                      </span>
                      <span className="text-caption font-bold tabular-nums text-muted-foreground">
                        {fa.format(row.count)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
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
            <p className="mt-2.5 rounded-xl bg-amber-500/8 px-3 py-2 text-[11px] leading-relaxed text-foreground/75 ring-1 ring-amber-500/15">
              {fa.format(stats.partnerWaitingInvite)} حساب مشترک منتظر طرف مقابل
              است.
            </p>
          ) : null}
        </AdminSection>

        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href="/admin/flags"
            className={cn(
              "group rounded-xl border border-border/50 bg-card px-3 py-2.5 shadow-sm",
              "transition-[border-color,box-shadow,transform] duration-150",
              "hover:border-primary/30 hover:shadow-md active:scale-[0.99]",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-muted-foreground">
                پرچم‌ها
              </p>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                  flagsOff === 0
                    ? "bg-success-soft text-success"
                    : "bg-amber-500/15 text-amber-800",
                )}
              >
                {flagsOff === 0 ? "سالم" : `${fa.format(flagsOff)} خاموش`}
              </span>
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">
              {flagsOff === 0 ? "همه روشن" : `${fa.format(flagsOff)} خاموش`}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {fa.format(flags.length)} قطع‌کن پلتفرم
            </p>
          </Link>

          <Link
            href="/admin/storage"
            className={cn(
              "group rounded-xl border border-border/50 bg-card px-3 py-2.5 shadow-sm",
              "transition-[border-color,box-shadow,transform] duration-150",
              "hover:border-primary/30 hover:shadow-md active:scale-[0.99]",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-muted-foreground">
                مصرف ذخیره
              </p>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                  storage.configured
                    ? "bg-success-soft text-success"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {storage.configured ? "S3 فعال" : "S3 خاموش"}
              </span>
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
              {formatAdminBytes(storage.total.bytes)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {fa.format(storage.total.count)} فایل ثبت‌شده
            </p>
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}
