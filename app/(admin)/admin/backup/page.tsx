import { AdminBackupPanel } from "@/components/admin/admin-backup-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { requirePlatformAdmin } from "@/lib/auth/guards";

export default async function AdminBackupPage() {
  const { user } = await requirePlatformAdmin();

  return (
    <AdminShell
      title="بک‌آپ"
      subtitle="خروجی کامل، انتخابی و بازیابی"
      adminName={user.name?.trim() || user.phone}
      pathname="/admin/backup"
    >
      <AdminBackupPanel />
    </AdminShell>
  );
}
