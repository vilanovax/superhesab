import { AdminShell } from "@/components/admin/admin-shell";
import { AdminKpi, AdminSection } from "@/components/admin/admin-ui";
import { formatAdminBytes } from "@/lib/admin/format";
import { loadStorageUsageStats } from "@/lib/admin/storage-stats";
import { requirePlatformAdmin } from "@/lib/auth/guards";

const TYPE_LABEL: Record<string, string> = {
  TRIP: "سفر",
  PARTNER: "مشترک",
  PERSONAL: "شخصی",
  FAMILY: "خانه",
  BUILDING: "ساختمان",
  FUND: "صندوق",
};

export default async function AdminStoragePage() {
  const { user } = await requirePlatformAdmin();
  const stats = await loadStorageUsageStats();
  const maxBytes = Math.max(1, ...stats.topSpaces.map((r) => r.bytes));
  const fa = new Intl.NumberFormat("fa-IR");

  return (
    <AdminShell
      title="ذخیره"
      subtitle="مصرف فیش‌ها از متادیتای دیتابیس"
      adminName={user.name?.trim() || user.phone}
      pathname="/admin/storage"
    >
      <div className="space-y-3">
        <section className="grid grid-cols-2 gap-2">
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
            hint={`${fa.format(stats.total.count)} فایل`}
            tone="primary"
          />
          <AdminKpi
            label="شارژ ساختمان"
            value={formatAdminBytes(stats.charge.bytes)}
            hint={`${fa.format(stats.charge.count)} رسید`}
          />
          <AdminKpi
            label="فیش صندوق"
            value={formatAdminBytes(stats.fund.bytes)}
            hint={`${fa.format(stats.fund.count)} فیش`}
          />
        </section>

        <AdminSection
          title="پرمصرف‌ترین دفاتر"
          description="حجم فیش‌های ثبت‌شده"
          className="p-3.5"
        >
          {stats.topSpaces.length === 0 ? (
            <p className="rounded-lg bg-muted/40 px-3 py-3 text-center text-[11px] text-muted-foreground">
              هنوز فایلی ثبت نشده.
            </p>
          ) : (
            <ul className="space-y-2">
              {stats.topSpaces.map((row) => (
                <li key={row.spaceId}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-caption font-semibold text-foreground">
                        {row.spaceName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {TYPE_LABEL[row.spaceType] ?? row.spaceType}
                        <span className="mx-1 opacity-40">·</span>
                        {fa.format(row.count)} فایل
                      </p>
                    </div>
                    <span className="shrink-0 text-caption font-bold tabular-nums text-foreground">
                      {formatAdminBytes(row.bytes)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{
                        width: `${Math.max(8, (row.bytes / maxBytes) * 100)}%`,
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
