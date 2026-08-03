import { AdminShell } from "@/components/admin/admin-shell";
import { loadAdminDashboardStats } from "@/lib/admin/stats";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { APP_VERSION } from "@/lib/app-version";
import { cn } from "@/lib/utils";

function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm",
        tone === "success" && "border-success/25",
        tone === "warn" && "border-destructive/20",
      )}
    >
      <p className="text-caption text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-micro text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const { user } = await requirePlatformAdmin();
  const stats = await loadAdminDashboardStats();

  return (
    <AdminShell
      title="داشبورد"
      subtitle="نمای کلی ثبت‌نام، دفاتر و استفاده"
      adminName={user.name?.trim() || user.phone}
      pathname="/admin"
    >
      <div className="space-y-4">
        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Kpi
            label="کاربران واقعی"
            value={stats.usersReal}
            hint={`${stats.usersVirtual} مجازی · ${stats.usersDisabled} غیرفعال`}
          />
          <Kpi
            label="ثبت‌نام ۷ روز"
            value={stats.usersRegistered7d}
            hint={`۳۰ روز: ${stats.usersRegistered30d}`}
            tone="success"
          />
          <Kpi
            label="فعال ۳۰ روز"
            value={stats.usersActive30d}
            hint="بر اساس آخرین ورود"
          />
          <Kpi
            label="دفاتر فعال"
            value={stats.spacesActive}
            hint={`${stats.spacesArchived} آرشیو · ${stats.spacesTotal} کل`}
          />
          <Kpi label="هزینه‌ها" value={stats.expensesTotal} />
          <Kpi label="تسویه‌ها" value={stats.settlementsTotal} />
        </section>

        <section className="rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm">
          <h2 className="text-body-sm font-semibold text-foreground">
            قالب‌های فعال
          </h2>
          <p className="mt-0.5 text-caption text-muted-foreground">
            فقط دفاتر غیرآرشیو
          </p>
          {stats.spacesByType.length === 0 ? (
            <p className="mt-3 text-caption text-muted-foreground">
              هنوز دفتری نیست.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats.spacesByType.map((row) => (
                <li
                  key={row.type}
                  className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2"
                >
                  <span className="text-caption font-semibold text-foreground">
                    {row.label}
                  </span>
                  <span className="text-body-sm font-bold tabular-nums text-primary">
                    {row.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {stats.partnerWaitingInvite > 0 ? (
            <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-caption text-muted-foreground">
              {stats.partnerWaitingInvite} حساب مشترک منتظر طرف مقابل است.
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-dashed border-border/60 bg-muted/30 px-3.5 py-3">
          <p className="text-caption font-semibold text-foreground">
            نسخه اپ · {APP_VERSION}
          </p>
          <p className="mt-1 text-micro leading-relaxed text-muted-foreground">
            فاز ۳: گزارش اقدامات ادمین. بعدی: feature flags / مصرف S3.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
