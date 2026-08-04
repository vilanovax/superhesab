import { AdminShell } from "@/components/admin/admin-shell";
import { AdminSpaceCard } from "@/components/admin/admin-space-card";
import {
  AdminFilterBar,
  adminFieldClass,
  adminFilterBtnClass,
  adminSelectClass,
} from "@/components/admin/admin-ui";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export default async function AdminSpacesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string }>;
}) {
  const { user: admin } = await requirePlatformAdmin();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const type = params.type ?? "all";
  const status = params.status ?? "active";

  const spaces = await prisma.space.findMany({
    where: {
      ...(status === "active" ? { archivedAt: null } : {}),
      ...(status === "archived" ? { archivedAt: { not: null } } : {}),
      ...(type !== "all"
        ? {
            type: type as
              | "TRIP"
              | "PARTNER"
              | "FAMILY"
              | "PERSONAL"
              | "BUILDING"
              | "FUND",
          }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { owner: { phone: { contains: q } } },
              { owner: { name: { contains: q, mode: "insensitive" } } },
              { id: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ archivedAt: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      name: true,
      type: true,
      archivedAt: true,
      createdAt: true,
      owner: { select: { id: true, name: true, phone: true } },
      _count: {
        select: {
          members: true,
          expenses: true,
        },
      },
    },
  });

  const fa = new Intl.NumberFormat("fa-IR");
  const activeInList = spaces.filter((s) => !s.archivedAt).length;
  const totalMembers = spaces.reduce((n, s) => n + s._count.members, 0);
  const totalExpenses = spaces.reduce((n, s) => n + s._count.expenses, 0);

  return (
    <AdminShell
      title="دفاتر"
      subtitle="وضعیت فضاها، مالک، اعضا و هزینه‌ها"
      adminName={admin.name?.trim() || admin.phone}
      pathname="/admin/spaces"
    >
      <form method="get">
        <AdminFilterBar
          countLabel={`${fa.format(spaces.length)} دفتر · ${fa.format(activeInList)} فعال · ${fa.format(totalMembers)} عضو · ${fa.format(totalExpenses)} هزینه`}
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="نام، مالک، موبایل یا شناسه…"
            className={adminFieldClass}
            autoComplete="off"
            aria-label="جستجوی دفتر"
          />
          <select
            name="type"
            defaultValue={type}
            className={adminSelectClass}
            aria-label="قالب"
          >
            <option value="all">همه قالب‌ها</option>
            <option value="TRIP">سفر</option>
            <option value="PARTNER">مشترک</option>
            <option value="FAMILY">خانه</option>
            <option value="BUILDING">ساختمان</option>
            <option value="FUND">صندوق</option>
          </select>
          <select
            name="status"
            defaultValue={status}
            className={adminSelectClass}
            aria-label="وضعیت"
          >
            <option value="active">فعال</option>
            <option value="archived">آرشیو</option>
            <option value="all">همه</option>
          </select>
          <button type="submit" className={adminFilterBtnClass}>
            اعمال
          </button>
        </AdminFilterBar>
      </form>

      {spaces.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/55 bg-card/60 px-4 py-10 text-center text-caption text-muted-foreground">
          دفتری با این فیلتر پیدا نشد.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {spaces.map((space) => (
            <li key={space.id}>
              <AdminSpaceCard
                space={{
                  id: space.id,
                  name: space.name,
                  type: space.type,
                  archivedAt: space.archivedAt,
                  createdAt: space.createdAt,
                  ownerName: space.owner.name?.trim() || space.owner.phone,
                  ownerPhone: space.owner.phone,
                  members: space._count.members,
                  expenses: space._count.expenses,
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
