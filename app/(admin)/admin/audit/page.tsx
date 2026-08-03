import { AdminShell } from "@/components/admin/admin-shell";
import { formatAdminDateTime } from "@/lib/admin/format";
import {
  ADMIN_AUDIT_LABELS,
  listAdminAuditEvents,
} from "@/lib/admin/audit";
import { requirePlatformAdmin } from "@/lib/auth/guards";

export default async function AdminAuditPage() {
  const { user } = await requirePlatformAdmin();
  const events = await listAdminAuditEvents(100);

  return (
    <AdminShell
      title="گزارش اقدامات"
      subtitle="ردپای عملیات ادمین روی کاربران و بک‌آپ"
      adminName={user.name?.trim() || user.phone}
      pathname="/admin/audit"
    >
      {events.length === 0 ? (
        <p className="rounded-2xl border border-border/50 bg-card px-4 py-10 text-center text-caption text-muted-foreground">
          هنوز رویدادی ثبت نشده. با تغییر کاربر یا بک‌آپ اینجا پر می‌شود.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="rounded-2xl border border-border/55 bg-card px-3.5 py-3 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-caption font-semibold text-primary">
                    {ADMIN_AUDIT_LABELS[ev.action] ?? ev.action}
                  </p>
                  <p className="mt-0.5 text-body-sm font-medium text-foreground">
                    {ev.summary}
                  </p>
                </div>
                <time
                  className="shrink-0 text-micro tabular-nums text-muted-foreground"
                  dateTime={ev.createdAt.toISOString()}
                >
                  {formatAdminDateTime(ev.createdAt)}
                </time>
              </div>
              <p className="mt-1.5 text-caption text-muted-foreground">
                توسط{" "}
                <span className="font-semibold text-foreground">
                  {ev.actor.name?.trim() || ev.actor.phone}
                </span>
                {ev.targetType && ev.targetId ? (
                  <>
                    <span className="mx-1 opacity-40">·</span>
                    <span dir="ltr" className="font-mono text-micro">
                      {ev.targetType}:{ev.targetId.slice(0, 10)}…
                    </span>
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
