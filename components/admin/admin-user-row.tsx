"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  setUserDisabled,
  setUserPlatformRole,
  updateAdminUserName,
} from "@/app/actions/admin";
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
        "rounded-2xl border border-border/55 bg-card p-3.5 shadow-sm",
        disabled && "opacity-80",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-body-sm font-semibold text-foreground">
            {user.name?.trim() || "بدون نام"}
            {isSelf ? (
              <span className="ms-1.5 text-micro font-medium text-primary">
                (شما)
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 tabular-nums text-caption text-muted-foreground" dir="ltr">
            {user.phone}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {user.platformRole === "ADMIN" ? (
            <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-micro font-semibold text-primary">
              ادمین
            </span>
          ) : null}
          {disabled ? (
            <span className="rounded-lg bg-destructive-soft px-2 py-0.5 text-micro font-semibold text-destructive">
              غیرفعال
            </span>
          ) : (
            <span className="rounded-lg bg-success-soft px-2 py-0.5 text-micro font-semibold text-success">
              فعال
            </span>
          )}
          {user.hasPassword ? (
            <span className="rounded-lg bg-muted px-2 py-0.5 text-micro font-medium text-muted-foreground">
              رمز
            </span>
          ) : null}
        </div>
      </div>

      <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-caption text-muted-foreground sm:grid-cols-4">
        <div>
          <dt className="text-micro">ثبت‌نام</dt>
          <dd className="font-medium text-foreground">
            {formatAdminDate(user.createdAt)}
          </dd>
        </div>
        <div>
          <dt className="text-micro">آخرین بازدید</dt>
          <dd className="font-medium text-foreground">
            {formatAdminDateTime(user.lastSeenAt)}
          </dd>
        </div>
        <div>
          <dt className="text-micro">دفاتر مالک</dt>
          <dd className="font-semibold tabular-nums text-foreground">
            {user.ownedSpaces}
          </dd>
        </div>
        <div>
          <dt className="text-micro">عضویت</dt>
          <dd className="font-semibold tabular-nums text-foreground">
            {user.memberships}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-col gap-2 border-t border-border/40 pt-3 sm:flex-row sm:items-center">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="نام نمایشی"
          className="h-9 rounded-xl text-sm"
          disabled={pending}
        />
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-xl"
            disabled={pending}
            onClick={() =>
              run(
                () => updateAdminUserName({ userId: user.id, name }),
                "نام ذخیره شد",
              )
            }
          >
            ذخیره نام
          </Button>
          <Button
            type="button"
            size="sm"
            variant={disabled ? "default" : "destructive"}
            className="h-9 rounded-xl"
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
            {disabled ? "فعال‌سازی" : "غیرفعال"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-xl"
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
