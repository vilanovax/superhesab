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

function shortId(id: string): string {
  return id.length > 10 ? `…${id.slice(-8)}` : id;
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
          "absolute inset-y-2 start-0 w-[3px] rounded-full",
          archived ? "bg-border" : spaceTypeAccent(space.type),
        )}
      />

      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            archived
              ? "bg-muted text-muted-foreground"
              : spaceTypeTint(space.type),
          )}
        >
          <SpaceTypeIcon type={space.type} className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-caption font-semibold text-foreground">
              {space.name}
            </p>
            {archived ? (
              <AdminBadge>آرشیو</AdminBadge>
            ) : (
              <AdminBadge tone="success">فعال</AdminBadge>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground/80">
              {template.label}
            </span>
            <span className="mx-1 opacity-35">·</span>
            {space.ownerName}
            <span className="mx-1 opacity-35">·</span>
            <span className="tabular-nums" dir="ltr">
              {space.ownerPhone}
            </span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>
              <span className="font-bold tabular-nums text-foreground">
                {fa.format(space.members)}
              </span>{" "}
              عضو
            </span>
            <span className="opacity-30">·</span>
            <span>
              <span className="font-bold tabular-nums text-foreground">
                {fa.format(space.expenses)}
              </span>{" "}
              هزینه
            </span>
            <span className="opacity-30">·</span>
            <span>{formatAdminDate(space.createdAt)}</span>
            <span className="opacity-30">·</span>
            <span
              className="font-mono text-[10px] text-muted-foreground/70"
              dir="ltr"
              title={space.id}
            >
              {shortId(space.id)}
            </span>
          </p>
        </div>

        {!archived ? (
          <span
            className="shrink-0 text-muted-foreground/45 transition-transform duration-150 group-hover:-translate-x-0.5 group-hover:text-primary"
            aria-hidden
          >
            ‹
          </span>
        ) : null}
      </div>
    </>
  );

  if (archived) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border/45 bg-card/90 px-3 py-2.5 ps-3.5 opacity-75 shadow-sm">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/spaces/${space.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-border/50 bg-card px-3 py-2.5 ps-3.5 shadow-sm",
        "transition-[border-color,box-shadow,transform] duration-150",
        "hover:border-primary/30 hover:shadow-md active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {inner}
    </Link>
  );
}
