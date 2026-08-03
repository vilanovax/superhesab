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

function initialLetter(name: string | null, phone: string): string {
  const n = name?.trim();
  if (n) return n.slice(0, 1);
  return phone.replace(/\D/g, "").slice(-1) || "؟";
}

function lastSeenLabel(value: Date | string | null): string {
  if (!value) return "هرگز";
  return formatAdminDateTime(value);
}

export function AdminUserRow({
  user,
  isSelf,
}: {
  user: AdminUserRowModel;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [open, setOpen] = useState(isSelf);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const disabled = Boolean(user.disabledAt);
  const nameDirty = name.trim() !== (user.name ?? "").trim();
  const displayName = user.name?.trim() || "بدون نام";

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

  function saveName() {
    if (!nameDirty || pending) return;
    run(
      () => updateAdminUserName({ userId: user.id, name }),
      "نام ذخیره شد",
    );
  }

  return (
    <li
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm",
        "transition-[border-color,box-shadow,opacity] duration-150 ease-out",
        disabled
          ? "border-border/40 opacity-80"
          : "border-border/50 hover:border-border hover:shadow-md",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 p-3.5 text-start transition-colors hover:bg-muted/25 active:bg-muted/35"
        aria-expanded={open}
      >
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
            disabled
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary",
          )}
        >
          {initialLetter(user.name, user.phone)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-body-sm font-semibold text-foreground">
                {displayName}
                {isSelf ? (
                  <span className="ms-1.5 text-micro font-medium text-primary">
                    شما
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
            <div className="flex shrink-0 flex-col items-end gap-1">
              <div className="flex flex-wrap justify-end gap-1">
                {user.platformRole === "ADMIN" ? (
                  <AdminBadge tone="primary">ادمین</AdminBadge>
                ) : null}
                {disabled ? (
                  <AdminBadge tone="danger">غیرفعال</AdminBadge>
                ) : (
                  <AdminBadge tone="success">فعال</AdminBadge>
                )}
              </div>
              <span
                className={cn(
                  "text-muted-foreground/70 transition-transform duration-150",
                  open && "rotate-180",
                )}
                aria-hidden
              >
                <svg viewBox="0 0 20 20" className="size-4" fill="none">
                  <path
                    d="M5 8l5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>

          <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
            <div>
              <dt className="text-[11px] font-medium text-muted-foreground">
                آخرین بازدید
              </dt>
              <dd
                className={cn(
                  "mt-0.5 text-caption font-semibold",
                  user.lastSeenAt
                    ? "text-foreground"
                    : "font-medium text-muted-foreground",
                )}
              >
                {lastSeenLabel(user.lastSeenAt)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-muted-foreground">
                دفاتر مالک
              </dt>
              <dd className="mt-0.5 text-caption font-bold tabular-nums text-foreground">
                {new Intl.NumberFormat("fa-IR").format(user.ownedSpaces)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-muted-foreground">
                عضویت
              </dt>
              <dd className="mt-0.5 text-caption font-bold tabular-nums text-foreground">
                {new Intl.NumberFormat("fa-IR").format(user.memberships)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-muted-foreground">
                ثبت‌نام
              </dt>
              <dd className="mt-0.5 text-caption font-semibold text-foreground">
                {formatAdminDate(user.createdAt)}
              </dd>
            </div>
          </dl>
        </div>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border/40 bg-muted/20 px-3.5 py-3">
          <div className="space-y-1.5">
            <label
              htmlFor={`admin-name-${user.id}`}
              className="text-[11px] font-semibold text-muted-foreground"
            >
              نام نمایشی
            </label>
            <div className="flex overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/30">
              <Input
                id={`admin-name-${user.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveName();
                  }
                }}
                placeholder="مثلاً علی"
                className="h-10 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                disabled={pending}
              />
              <Button
                type="button"
                size="sm"
                className="h-10 shrink-0 rounded-none px-4"
                disabled={pending || !nameDirty}
                onClick={saveName}
              >
                ذخیره
              </Button>
            </div>
            {user.hasPassword ? (
              <p className="text-micro text-muted-foreground">ورود با رمز فعال است</p>
            ) : null}
          </div>

          {!isSelf ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 flex-1 rounded-xl text-caption sm:flex-none"
                disabled={pending}
                onClick={() =>
                  run(
                    () =>
                      setUserPlatformRole({
                        userId: user.id,
                        role:
                          user.platformRole === "ADMIN" ? "USER" : "ADMIN",
                      }),
                    user.platformRole === "ADMIN"
                      ? "نقش ادمین برداشته شد"
                      : "ادمین شد",
                  )
                }
              >
                {user.platformRole === "ADMIN"
                  ? "حذف نقش ادمین"
                  : "ارتقا به ادمین"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  "h-9 flex-1 rounded-xl text-caption sm:flex-none",
                  disabled
                    ? "border-success/30 text-success hover:bg-success/10"
                    : "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive",
                )}
                disabled={pending}
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
                {disabled ? "فعال‌سازی حساب" : "غیرفعال کردن"}
              </Button>
            </div>
          ) : (
            <p className="text-caption text-muted-foreground">
              روی حساب خودتان فقط نام قابل ویرایش است.
            </p>
          )}

          {error || message ? (
            <p
              className={cn(
                "text-caption font-medium",
                error ? "text-destructive" : "text-success",
              )}
              role="status"
            >
              {error ?? message}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
