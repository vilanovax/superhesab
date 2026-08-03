import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-ui";
import {
  SpaceTypeIcon,
  spaceTypeAccent,
  spaceTypeTint,
} from "@/components/spaces/space-type-icon";
import { formatAdminDate } from "@/lib/admin/format";
import { getTemplate } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";
import type { SpaceType } from "@/types";

export type AdminSpaceCardModel = {
  id: string;
  name: string;
  type: SpaceType;
  archivedAt: Date | string | null;
  createdAt: Date | string;
  ownerName: string;
  ownerPhone: string;
  members: number;
  expenses: number;
};

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      aria-hidden
    >
      <path
        d="M12.5 5l-5 5 5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AdminSpaceCard({ space }: { space: AdminSpaceCardModel }) {
  const archived = Boolean(space.archivedAt);
  const template = getTemplate(space.type);
  const fa = new Intl.NumberFormat("fa-IR");

  const inner = (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-3 start-0 w-[3px] rounded-full",
          archived ? "bg-border" : spaceTypeAccent(space.type),
        )}
      />

      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl",
            archived ? "bg-muted text-muted-foreground" : spaceTypeTint(space.type),
          )}
        >
          <SpaceTypeIcon type={space.type} className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-body-sm font-semibold text-foreground">
                {space.name}
              </p>
              <p className="mt-0.5 truncate text-caption text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  {template.label}
                </span>
                <span className="mx-1 opacity-35">·</span>
                {space.ownerName}
              </p>
              <p
                className="mt-0.5 truncate text-micro tabular-nums text-muted-foreground"
                dir="ltr"
              >
                {space.ownerPhone}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {archived ? (
                <AdminBadge>آرشیو</AdminBadge>
              ) : (
                <AdminBadge tone="success">فعال</AdminBadge>
              )}
              {!archived ? (
                <Chevron className="size-4 text-muted-foreground/50 transition-transform duration-150 group-hover:-translate-x-0.5 group-hover:text-primary" />
              ) : null}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-lg bg-muted/70 px-2 py-1 text-micro">
              <span className="text-muted-foreground">اعضا</span>
              <span className="font-bold tabular-nums text-foreground">
                {fa.format(space.members)}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-muted/70 px-2 py-1 text-micro">
              <span className="text-muted-foreground">هزینه</span>
              <span className="font-bold tabular-nums text-foreground">
                {fa.format(space.expenses)}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-muted/70 px-2 py-1 text-micro">
              <span className="text-muted-foreground">ایجاد</span>
              <span className="font-semibold text-foreground">
                {formatAdminDate(space.createdAt)}
              </span>
            </span>
          </div>

          <p
            className="mt-2 truncate font-mono text-[10px] text-muted-foreground/70"
            dir="ltr"
            title={space.id}
          >
            {space.id}
          </p>
        </div>
      </div>
    </>
  );

  if (archived) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/45 bg-card/90 p-3.5 ps-4 opacity-75 shadow-sm">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/spaces/${space.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-border/50 bg-card p-3.5 ps-4 shadow-sm",
        "transition-[border-color,box-shadow,transform] duration-150 ease-out",
        "hover:border-primary/30 hover:shadow-md active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {inner}
    </Link>
  );
}
