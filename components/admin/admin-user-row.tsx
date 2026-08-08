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
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const disabled = Boolean(user.disabledAt);
  const nameDirty = name.trim() !== (user.name ?? "").trim();
  const displayName = user.name?.trim() || "بدون نام";
  const fa = new Intl.NumberFormat("fa-IR");

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
        "overflow-hidden rounded-xl border bg-card shadow-sm",
        "transition-[border-color,box-shadow,opacity] duration-150",
        disabled
          ? "border-border/40 opacity-80"
          : "border-border/50 hover:border-border/80",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-start transition-colors hover:bg-muted/25 active:bg-muted/35"
        aria-expanded={open}
      >
        <span
          aria-hidden
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg text-caption font-bold",
            disabled
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary",
          )}
        >
          {initialLetter(user.name, user.phone)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-caption font-semibold text-foreground">
              {displayName}
              {isSelf ? (
                <span className="ms-1 text-[10px] font-medium text-primary">
                  شما
                </span>
              ) : null}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              {user.platformRole === "ADMIN" ? (
                <AdminBadge tone="primary">ادمین</AdminBadge>
              ) : null}
              {disabled ? (
                <AdminBadge tone="danger">غیرفعال</AdminBadge>
              ) : (
                <AdminBadge tone="success">فعال</AdminBadge>
              )}
              <span
                className={cn(
                  "text-muted-foreground/60 transition-transform duration-150",
                  open && "rotate-180",
                )}
                aria-hidden
              >
                <svg viewBox="0 0 20 20" className="size-3.5" fill="none">
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
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            <span className="tabular-nums" dir="ltr">
              {user.phone}
            </span>
            <span className="mx-1 opacity-40">·</span>
            <span className="tabular-nums">
              {fa.format(user.ownedSpaces)} مالک
            </span>
            <span className="mx-1 opacity-40">·</span>
            <span className="tabular-nums">
              {fa.format(user.memberships)} عضویت
            </span>
          </p>
        </div>
      </button>

      {open ? (
        <div className="space-y-2.5 border-t border-border/40 bg-muted/15 px-3 py-2.5">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">آخرین بازدید</dt>
              <dd
                className={cn(
                  "mt-0.5 font-semibold",
                  user.lastSeenAt
                    ? "text-foreground"
                    : "font-medium text-muted-foreground",
                )}
              >
                {lastSeenLabel(user.lastSeenAt)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">دفاتر مالک</dt>
              <dd className="mt-0.5 font-bold tabular-nums text-foreground">
                {fa.format(user.ownedSpaces)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">عضویت</dt>
              <dd className="mt-0.5 font-bold tabular-nums text-foreground">
                {fa.format(user.memberships)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ثبت‌نام</dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                {formatAdminDate(user.createdAt)}
              </dd>
            </div>
          </dl>

          <div className="space-y-1">
            <label
              htmlFor={`admin-name-${user.id}`}
              className="text-[11px] font-semibold text-muted-foreground"
            >
              نام نمایشی
            </label>
            <div className="flex overflow-hidden rounded-lg border border-border/60 bg-card focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/30">
              <Input
                id={`admin-name-${user.id}`}
                name="displayName"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveName();
                  }
                }}
                placeholder="مثلاً علی…"
                className="h-9 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                disabled={pending}
              />
              <Button
                type="button"
                size="sm"
                className="h-9 shrink-0 rounded-none px-3 text-caption"
                disabled={pending || !nameDirty}
                onClick={saveName}
              >
                {pending && nameDirty ? "…" : "ذخیره"}
              </Button>
            </div>
            {user.hasPassword ? (
              <p className="text-[10px] text-muted-foreground">
                ورود با رمز فعال است
              </p>
            ) : null}
          </div>

          {!isSelf ? (
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 flex-1 rounded-lg text-[11px] sm:flex-none"
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
                  "h-8 flex-1 rounded-lg text-[11px] sm:flex-none",
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
                {disabled ? "فعال‌سازی" : "غیرفعال کردن"}
              </Button>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              روی حساب خودتان فقط نام قابل ویرایش است.
            </p>
          )}

          {error || message ? (
            <p
              className={cn(
                "text-[11px] font-medium",
                error ? "text-destructive" : "text-success",
              )}
              role={error ? "alert" : "status"}
              aria-live={error ? "assertive" : "polite"}
            >
              {error ?? message}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
