"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

function UserMenuIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3.25" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

/** Header account menu — settings + logout. Trigger sits on the start edge (right in RTL). */
export function HomeUserMenu({
  isPlatformAdmin = false,
}: {
  isPlatformAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (event.target instanceof Node && !el.contains(event.target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="منوی حساب کاربری"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex size-10 items-center justify-center rounded-2xl border border-border/60 bg-card text-foreground shadow-sm",
          "transition-colors hover:border-primary/30 hover:bg-muted/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "border-primary/35 bg-muted/50",
        )}
      >
        <UserMenuIcon className="size-5" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="حساب کاربری"
          className="absolute start-0 top-[calc(100%+0.4rem)] z-50 min-w-[11.5rem] origin-top-right animate-fade-up overflow-hidden rounded-2xl border border-border/60 bg-card p-1 shadow-lg"
        >
          <Link
            role="menuitem"
            href="/app/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-body-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
          >
            <SettingsIcon className="size-4 shrink-0 text-muted-foreground" />
            تنظیمات
          </Link>
          {isPlatformAdmin ? (
            <Link
              role="menuitem"
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-body-sm font-semibold text-primary transition-colors hover:bg-primary/8"
            >
              پنل ادمین
            </Link>
          ) : null}
          <form action={logout}>
            <button
              role="menuitem"
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-body-sm font-semibold text-destructive transition-colors hover:bg-destructive-soft"
            >
              <LogoutIcon className="size-4 shrink-0" />
              خروج
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
