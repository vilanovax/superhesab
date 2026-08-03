import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { formatAdminDate } from "@/lib/admin/format";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTemplate } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";

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
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
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

  return (
    <AdminShell
      title="دفاتر"
      subtitle="وضعیت فضاها، مالک، اعضا و هزینه‌ها"
      adminName={admin.name?.trim() || admin.phone}
      pathname="/admin/spaces"
    >
      <form className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="نام دفتر یا مالک"
          className="h-10 min-w-[12rem] flex-1 rounded-xl border border-border/60 bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <select
          name="type"
          defaultValue={type}
          className="h-10 rounded-xl border border-border/60 bg-card px-3 text-sm font-medium shadow-sm"
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
          className="h-10 rounded-xl border border-border/60 bg-card px-3 text-sm font-medium shadow-sm"
        >
          <option value="active">فعال</option>
          <option value="archived">آرشیو</option>
          <option value="all">همه</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          فیلتر
        </button>
      </form>

      <p className="mb-2 text-caption text-muted-foreground">
        {spaces.length} دفتر (حداکثر ۱۰۰)
      </p>

      {spaces.length === 0 ? (
        <p className="rounded-2xl border border-border/50 bg-card px-4 py-8 text-center text-caption text-muted-foreground">
          دفتری با این فیلتر پیدا نشد.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {spaces.map((space) => {
            const archived = Boolean(space.archivedAt);
            return (
              <li
                key={space.id}
                className={cn(
                  "rounded-2xl border border-border/55 bg-card p-3.5 shadow-sm",
                  archived && "opacity-75",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-foreground">
                      {space.name}
                    </p>
                    <p className="mt-0.5 text-caption text-muted-foreground">
                      {getTemplate(space.type).label}
                      <span className="mx-1 opacity-40">·</span>
                      {space.owner.name?.trim() || space.owner.phone}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {archived ? (
                      <span className="rounded-lg bg-muted px-2 py-0.5 text-micro font-semibold text-muted-foreground">
                        آرشیو
                      </span>
                    ) : (
                      <span className="rounded-lg bg-success-soft px-2 py-0.5 text-micro font-semibold text-success">
                        فعال
                      </span>
                    )}
                  </div>
                </div>
                <dl className="mt-2.5 grid grid-cols-3 gap-2 text-caption text-muted-foreground">
                  <div>
                    <dt className="text-micro">اعضا</dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {space._count.members}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-micro">هزینه</dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {space._count.expenses}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-micro">ایجاد</dt>
                    <dd className="font-medium text-foreground">
                      {formatAdminDate(space.createdAt)}
                    </dd>
                  </div>
                </dl>
                {!archived ? (
                  <Link
                    href={`/spaces/${space.id}`}
                    className="mt-3 inline-flex text-caption font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    باز کردن دفتر
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
