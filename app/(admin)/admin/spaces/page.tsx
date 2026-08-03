import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  AdminBadge,
  AdminFilterBar,
  adminFieldClass,
  adminFilterBtnClass,
  adminSelectClass,
} from "@/components/admin/admin-ui";
import {
  SpaceTypeIcon,
  spaceTypeAccent,
  spaceTypeTint,
} from "@/components/spaces/space-type-icon";
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
      <form method="get">
        <AdminFilterBar
          countLabel={`${new Intl.NumberFormat("fa-IR").format(spaces.length)} دفتر (حداکثر ۱۰۰)`}
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="نام دفتر یا مالک"
            className={adminFieldClass}
          />
          <select name="type" defaultValue={type} className={adminSelectClass}>
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
          >
            <option value="active">فعال</option>
            <option value="archived">آرشیو</option>
            <option value="all">همه</option>
          </select>
          <button type="submit" className={adminFilterBtnClass}>
            فیلتر
          </button>
        </AdminFilterBar>
      </form>

      {spaces.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/55 bg-card/60 px-4 py-10 text-center text-caption text-muted-foreground">
          دفتری با این فیلتر پیدا نشد.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {spaces.map((space) => {
            const archived = Boolean(space.archivedAt);
            const href =
              space.type === "BUILDING"
                ? `/spaces/${space.id}`
                : `/spaces/${space.id}`;
            const body = (
              <>
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-3 start-0 w-[3px] rounded-full",
                    spaceTypeAccent(space.type),
                  )}
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                        spaceTypeTint(space.type),
                      )}
                    >
                      <SpaceTypeIcon type={space.type} className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-semibold text-foreground">
                        {space.name}
                      </p>
                      <p className="mt-0.5 truncate text-caption text-muted-foreground">
                        {getTemplate(space.type).label}
                        <span className="mx-1 opacity-40">·</span>
                        {space.owner.name?.trim() || space.owner.phone}
                      </p>
                    </div>
                  </div>
                  {archived ? (
                    <AdminBadge>آرشیو</AdminBadge>
                  ) : (
                    <AdminBadge tone="success">فعال</AdminBadge>
                  )}
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/40 px-3 py-2">
                  <div>
                    <dt className="text-micro text-muted-foreground">اعضا</dt>
                    <dd className="mt-0.5 text-caption font-bold tabular-nums text-foreground">
                      {space._count.members}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-micro text-muted-foreground">هزینه</dt>
                    <dd className="mt-0.5 text-caption font-bold tabular-nums text-foreground">
                      {space._count.expenses}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-micro text-muted-foreground">ایجاد</dt>
                    <dd className="mt-0.5 text-caption font-semibold text-foreground">
                      {formatAdminDate(space.createdAt)}
                    </dd>
                  </div>
                </dl>
                {!archived ? (
                  <p className="mt-2.5 text-caption font-semibold text-primary">
                    باز کردن دفتر
                  </p>
                ) : null}
              </>
            );

            return (
              <li key={space.id}>
                {archived ? (
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-2xl border border-border/50 bg-card p-3.5 ps-4 shadow-sm opacity-75",
                    )}
                  >
                    {body}
                  </div>
                ) : (
                  <Link
                    href={href}
                    className={cn(
                      "relative block overflow-hidden rounded-2xl border border-border/50 bg-card p-3.5 ps-4 shadow-sm",
                      "transition-[border-color,box-shadow,transform] duration-150",
                      "hover:border-primary/30 hover:shadow-md active:scale-[0.99]",
                    )}
                  >
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
