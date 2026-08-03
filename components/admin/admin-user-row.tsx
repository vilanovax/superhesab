"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  setUserDisabled,
  setUserPlatformRole,
  updateAdminUserName,
} from "@/app/actions/admin";
import { AdminBadge } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

export type AdminUserRowModel = {
  id: string;
  phone: string;
  name: string | null;
  platformRole: "USER" | "ADMIN";
  disabledAt: Date | string | null;
  lastSeenAt: Date | string | null;
  createdAt: Date | string;
  ownedSpaces: number;
  memberships: number;
  hasPassword: boolean;
};

export function AdminUserRow({
  user,
  isSelf,
}: {
  user: AdminUserRowModel;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const disabled = Boolean(user.disabledAt);
  const nameDirty = name.trim() !== (user.name ?? "").trim();

  function run(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    okMsg: string,
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(okMsg);
      router.refresh();
    });
  }

  return (
    <li
      className={cn(
        "rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm",
        "transition-[border-color,opacity] duration-150",
        disabled && "border-border/40 opacity-75",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-body-sm font-semibold text-foreground">
            {user.name?.trim() || "بدون نام"}
            {isSelf ? (
              <span className="ms-1.5 text-micro font-medium text-primary">
                (شما)
              </span>
            ) : null}
          </p>
          <p
            className="mt-0.5 tabular-nums text-caption text-muted-foreground"
            dir="ltr"
          >
            {user.phone}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {user.platformRole === "ADMIN" ? (
            <AdminBadge tone="primary">ادمین</AdminBadge>
          ) : null}
          {disabled ? (
            <AdminBadge tone="danger">غیرفعال</AdminBadge>
          ) : (
            <AdminBadge tone="success">فعال</AdminBadge>
          )}
          {user.hasPassword ? <AdminBadge>رمز</AdminBadge> : null}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-muted/45 px-3 py-2.5 sm:grid-cols-4">
        <div>
          <dt className="text-micro text-muted-foreground">ثبت‌نام</dt>
          <dd className="mt-0.5 text-caption font-semibold text-foreground">
            {formatAdminDate(user.createdAt)}
          </dd>
        </div>
        <div>
          <dt className="text-micro text-muted-foreground">آخرین بازدید</dt>
          <dd className="mt-0.5 text-caption font-semibold text-foreground">
            {formatAdminDateTime(user.lastSeenAt)}
          </dd>
        </div>
        <div>
          <dt className="text-micro text-muted-foreground">دفاتر مالک</dt>
          <dd className="mt-0.5 text-caption font-bold tabular-nums text-foreground">
            {user.ownedSpaces}
          </dd>
        </div>
        <div>
          <dt className="text-micro text-muted-foreground">عضویت</dt>
          <dd className="mt-0.5 text-caption font-bold tabular-nums text-foreground">
            {user.memberships}
          </dd>
        </div>
      </dl>

      <div className="mt-3 space-y-2 border-t border-border/35 pt-3">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام نمایشی"
            className="h-9 flex-1 rounded-xl text-sm"
            disabled={pending}
            aria-label="نام نمایشی"
          />
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0 rounded-xl px-3"
            disabled={pending || !nameDirty}
            onClick={() =>
              run(
                () => updateAdminUserName({ userId: user.id, name }),
                "نام ذخیره شد",
              )
            }
          >
            ذخیره
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-caption"
            disabled={pending || isSelf}
            onClick={() =>
              run(
                () =>
                  setUserPlatformRole({
                    userId: user.id,
                    role: user.platformRole === "ADMIN" ? "USER" : "ADMIN",
                  }),
                user.platformRole === "ADMIN"
                  ? "نقش ادمین برداشته شد"
                  : "ادمین شد",
              )
            }
          >
            {user.platformRole === "ADMIN" ? "حذف ادمین" : "ارتقا به ادمین"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 rounded-xl text-caption",
              !disabled && "text-destructive hover:bg-destructive/10 hover:text-destructive",
            )}
            disabled={pending || isSelf}
            onClick={() =>
              run(
                () =>
                  setUserDisabled({
                    userId: user.id,
                    disabled: !disabled,
                  }),
                disabled ? "کاربر فعال شد" : "کاربر غیرفعال شد",
              )
            }
          >
            {disabled ? "فعال‌سازی" : "غیرفعال کردن"}
          </Button>
        </div>
      </div>

      {error || message ? (
        <p
          className={cn(
            "mt-2 text-caption font-medium",
            error ? "text-destructive" : "text-success",
          )}
          role="status"
        >
          {error ?? message}
        </p>
      ) : null}
    </li>
  );
}
