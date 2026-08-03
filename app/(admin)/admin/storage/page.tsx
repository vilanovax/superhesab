import { AdminShell } from "@/components/admin/admin-shell";
import { AdminKpi, AdminSection } from "@/components/admin/admin-ui";
import { formatAdminBytes } from "@/lib/admin/format";
import { loadStorageUsageStats } from "@/lib/admin/storage-stats";
import { requirePlatformAdmin } from "@/lib/auth/guards";

const TYPE_LABEL: Record<string, string> = {
  TRIP: "سفر",
  PARTNER: "مشترک",
  PERSONAL: "خانه",
  FAMILY: "خانه",
  BUILDING: "ساختمان",
  FUND: "صندوق",
};

export default async function AdminStoragePage() {
  const { user } = await requirePlatformAdmin();
  const stats = await loadStorageUsageStats();
  const maxBytes = Math.max(1, ...stats.topSpaces.map((r) => r.bytes));

  return (
    <AdminShell
      title="ذخیره"
      subtitle="مصرف فایل از متادیتای فیش‌ها (بدون ListObjects)"
      adminName={user.name?.trim() || user.phone}
      pathname="/admin/storage"
    >
      <div className="space-y-4">
        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <AdminKpi
            label="وضعیت S3/R2"
            value={stats.configured ? "فعال" : "خاموش"}
            hint={
              stats.bucket ? `باکت: ${stats.bucket}` : "S3_BUCKET تنظیم نشده"
            }
            tone={stats.configured ? "success" : "warn"}
          />
          <AdminKpi
            label="کل حجم"
            value={formatAdminBytes(stats.total.bytes)}
            hint={`${new Intl.NumberFormat("fa-IR").format(stats.total.count)} فایل`}
            tone="primary"
          />
          <AdminKpi
            label="شارژ ساختمان"
            value={formatAdminBytes(stats.charge.bytes)}
            hint={`${new Intl.NumberFormat("fa-IR").format(stats.charge.count)} رسید`}
          />
          <AdminKpi
            label="فیش صندوق"
            value={formatAdminBytes(stats.fund.bytes)}
            hint={`${new Intl.NumberFormat("fa-IR").format(stats.fund.count)} فیش`}
          />
        </section>

        <AdminSection
          title="پرمصرف‌ترین دفاتر"
          description="جمع حجم فیش‌های ثبت‌شده در دیتابیس"
        >
          {stats.topSpaces.length === 0 ? (
            <p className="text-caption text-muted-foreground">
              هنوز فایلی ثبت نشده.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {stats.topSpaces.map((row) => (
                <li key={row.spaceId} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-caption font-semibold text-foreground">
                        {row.spaceName}
                      </p>
                      <p className="text-micro text-muted-foreground">
                        {TYPE_LABEL[row.spaceType] ?? row.spaceType}
                        <span className="mx-1 opacity-40">·</span>
                        {new Intl.NumberFormat("fa-IR").format(row.count)} فایل
                      </p>
                    </div>
                    <span className="shrink-0 text-body-sm font-bold tabular-nums text-primary">
                      {formatAdminBytes(row.bytes)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/65"
                      style={{
                        width: `${Math.max(6, (row.bytes / maxBytes) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>
    </AdminShell>
  );
}
