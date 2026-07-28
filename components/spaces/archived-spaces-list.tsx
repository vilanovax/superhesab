"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  permanentlyDeleteSpace,
  restoreSpace,
} from "@/app/actions/space";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getTemplate } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";
import type { SpaceType } from "@/types";

export type ArchivedSpaceRow = {
  id: string;
  name: string;
  type: SpaceType;
  archivedAt: string;
  memberCount: number;
  expenseCount: number;
  canManage: boolean;
};

function markFor(type: SpaceType): string {
  if (type === "TRIP") return "سفر";
  if (type === "PARTNER") return "۲نفر";
  if (type === "FAMILY" || type === "PERSONAL") return "خانه";
  if (type === "FUND") return "صندوق";
  if (type === "BUILDING") return "برج";
  return "من";
}

function chipFor(type: SpaceType): string {
  if (type === "TRIP") return "bg-secondary text-primary";
  if (type === "PARTNER") return "bg-accent text-ink";
  if (type === "FAMILY" || type === "PERSONAL") return "bg-secondary text-primary";
  if (type === "FUND") return "bg-primary/15 text-primary";
  if (type === "BUILDING") return "bg-muted text-foreground";
  return "bg-secondary text-primary";
}

export function ArchivedSpacesList({ spaces }: { spaces: ArchivedSpaceRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const restoreTarget = spaces.find((s) => s.id === restoreId);
  const deleteTarget = spaces.find((s) => s.id === deleteId);

  function onRestore() {
    if (!restoreId) return;
    setError(null);
    startTransition(async () => {
      const result = await restoreSpace(restoreId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRestoreId(null);
      router.refresh();
    });
  }

  function onDelete() {
    if (!deleteId) return;
    setError(null);
    startTransition(async () => {
      const result = await permanentlyDeleteSpace(deleteId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDeleteId(null);
      router.refresh();
    });
  }

  if (spaces.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 px-5 py-10 text-center">
        <p className="text-body font-semibold text-foreground">آرشیو خالی است</p>
        <p className="mt-1.5 text-caption text-muted-foreground">
          دفاتر آرشیوشده اینجا می‌آیند؛ حذف دائمی فقط از همین صفحه ممکن است.
        </p>
        <Button asChild variant="outline" className="mt-4 h-10 rounded-xl">
          <Link href="/app">بازگشت به خانه</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2.5">
        {spaces.map((space) => {
          const template = getTemplate(space.type);
          return (
            <li
              key={space.id}
              className="rounded-2xl border border-border/55 bg-card px-3.5 py-3.5"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-2xl text-caption font-bold",
                    chipFor(space.type),
                  )}
                >
                  {markFor(space.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-semibold text-foreground">
                    {space.name}
                  </p>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    {template.label}
                    <span className="mx-1.5 text-border">·</span>
                    {space.memberCount} عضو
                    <span className="mx-1.5 text-border">·</span>
                    {space.expenseCount} هزینه
                  </p>
                  <p className="mt-1 text-micro text-muted-foreground">
                    آرشیو:{" "}
                    {new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                      dateStyle: "medium",
                      timeZone: "Asia/Tehran",
                    }).format(new Date(space.archivedAt))}
                  </p>
                </div>
              </div>

              {space.canManage ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1 rounded-xl text-body-sm font-semibold"
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      setRestoreId(space.id);
                    }}
                  >
                    بازگردانی
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-10 flex-1 rounded-xl text-body-sm font-semibold"
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      setDeleteId(space.id);
                    }}
                  >
                    حذف دائمی
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-caption text-muted-foreground">
                  فقط مالک می‌تواند این دفتر را بازگرداند یا حذف کند.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={Boolean(restoreId)}
        onOpenChange={(open) => {
          if (!open) setRestoreId(null);
        }}
        title="بازگردانی دفتر"
        description={
          restoreTarget
            ? `دفتر «${restoreTarget.name}» دوباره در لیست فضاهای فعال دیده می‌شود.`
            : ""
        }
        confirmLabel="بازگردانی"
        pending={pending}
        error={error}
        onConfirm={onRestore}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="حذف دائمی"
        description={
          deleteTarget
            ? `دفتر «${deleteTarget.name}» و همه هزینه‌ها، شارژها و داده‌هایش برای همیشه پاک می‌شود. این کار قابل بازگشت نیست.`
            : ""
        }
        confirmLabel="حذف برای همیشه"
        pending={pending}
        error={error}
        destructive
        onConfirm={onDelete}
      />
    </>
  );
}
