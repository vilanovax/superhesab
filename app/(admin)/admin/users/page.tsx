import { AdminShell } from "@/components/admin/admin-shell";
import {
  AdminFilterBar,
  adminFieldClass,
  adminFilterBtnClass,
  adminSelectClass,
} from "@/components/admin/admin-ui";
import { AdminUserRow } from "@/components/admin/admin-user-row";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { user: admin } = await requirePlatformAdmin();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "all";

  const users = await prisma.user.findMany({
    where: {
      isVirtual: false,
      ...(status === "active" ? { disabledAt: null } : {}),
      ...(status === "disabled" ? { disabledAt: { not: null } } : {}),
      ...(status === "admin" ? { platformRole: "ADMIN" } : {}),
      ...(q
        ? {
            OR: [
              { phone: { contains: q } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      phone: true,
      name: true,
      platformRole: true,
      disabledAt: true,
      lastSeenAt: true,
      createdAt: true,
      passwordHash: true,
      _count: {
        select: {
          ownedSpaces: true,
          memberships: true,
        },
      },
    },
  });

  return (
    <AdminShell
      title="کاربران"
      subtitle="جستجو، ویرایش نام، فعال/غیرفعال، نقش ادمین"
      adminName={admin.name?.trim() || admin.phone}
      pathname="/admin/users"
    >
      <form method="get">
        <AdminFilterBar
          countLabel={`${new Intl.NumberFormat("fa-IR").format(users.length)} کاربر (حداکثر ۱۰۰)`}
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="جستجوی نام یا موبایل"
            className={adminFieldClass}
            dir="auto"
          />
          <select
            name="status"
            defaultValue={status}
            className={adminSelectClass}
          >
            <option value="all">همه</option>
            <option value="active">فعال</option>
            <option value="disabled">غیرفعال</option>
            <option value="admin">ادمین‌ها</option>
          </select>
          <button type="submit" className={adminFilterBtnClass}>
            فیلتر
          </button>
        </AdminFilterBar>
      </form>

      {users.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/55 bg-card/60 px-4 py-10 text-center text-caption text-muted-foreground">
          کاربری با این فیلتر پیدا نشد.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {users.map((u) => (
            <AdminUserRow
              key={u.id}
              isSelf={u.id === admin.id}
              user={{
                id: u.id,
                phone: u.phone,
                name: u.name,
                platformRole: u.platformRole,
                disabledAt: u.disabledAt,
                lastSeenAt: u.lastSeenAt,
                createdAt: u.createdAt,
                ownedSpaces: u._count.ownedSpaces,
                memberships: u._count.memberships,
                hasPassword: Boolean(u.passwordHash),
              }}
            />
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
