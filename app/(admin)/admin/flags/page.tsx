import { AdminFlagsPanel } from "@/components/admin/admin-flags-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { listFeatureFlags } from "@/lib/feature-flags";

export default async function AdminFlagsPage() {
  const { user } = await requirePlatformAdmin();
  const flags = await listFeatureFlags();

  return (
    <AdminShell
      title="پرچم‌ها"
      subtitle="قطع‌کن‌های پلتفرم — خاموش کردن بدون دیپلوی"
      adminName={user.name?.trim() || user.phone}
      pathname="/admin/flags"
    >
      <AdminFlagsPanel
        flags={flags.map((f) => ({
          key: f.key,
          label: f.label,
          description: f.description,
          enabled: f.enabled,
          updatedAt: f.updatedAt,
          updatedByName: f.updatedBy
            ? f.updatedBy.name?.trim() || f.updatedBy.phone
            : null,
        }))}
      />
    </AdminShell>
  );
}
