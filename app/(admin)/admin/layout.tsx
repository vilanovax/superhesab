import { requirePlatformAdmin } from "@/lib/auth/guards";
import { ensureFeatureFlags } from "@/lib/feature-flags";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformAdmin();
  await ensureFeatureFlags();
  return children;
}
