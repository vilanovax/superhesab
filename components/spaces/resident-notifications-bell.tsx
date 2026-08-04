"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  markAllBuildingNotificationsRead,
  markBuildingNotificationRead,
  type BuildingNotificationDTO,
} from "@/app/actions/building";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatDateFaShort } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

function BellIcon({ className }: { className?: string }) {
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
      <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

function faDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

type ResidentNotificationsBellProps = {
  spaceId: string;
  notifications: BuildingNotificationDTO[];
  onOpenTab?: (tab: string) => void;
};

/**
 * Resident inbox bell — announcements + charge payment updates.
 */
export function ResidentNotificationsBell({
  spaceId,
  notifications: initial,
  onOpenTab,
}: ResidentNotificationsBellProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const unread = items.filter((n) => !n.read).length;

  function openInbox() {
    setItems(initial);
    setOpen(true);
  }

  function onSelect(n: BuildingNotificationDTO) {
    setOpen(false);
    if (!n.read) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
      );
      startTransition(async () => {
        await markBuildingNotificationRead(spaceId, n.id);
        router.refresh();
      });
    }
    if (n.hrefTab && onOpenTab) {
      onOpenTab(n.hrefTab);
    }
  }

  function markAll() {
    if (unread === 0 || pending) return;
    startTransition(async () => {
      const result = await markAllBuildingNotificationsRead(spaceId);
      if (!result.ok) {
        showToast(result.error || "خطا در علامت‌گذاری", "error");
        return;
      }
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      showToast("همه خوانده شد");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="relative size-9 shrink-0 rounded-xl border-border/70 bg-card shadow-sm"
        aria-label={
          unread > 0 ? `اعلان‌ها · ${unread} خوانده‌نشده` : "اعلان‌ها"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openInbox}
      >
        <BellIcon className="size-4" />
        {unread > 0 ? (
          <span
            className="absolute -start-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold leading-none text-primary-foreground ring-2 ring-background"
            aria-hidden
          >
            {unread > 9 ? "۹+" : faDigits(unread)}
          </span>
        ) : null}
      </Button>

      <Drawer open={open} onOpenChange={setOpen} repositionInputs={false}>
        <DrawerContent className="mt-0! flex h-auto max-h-[85dvh] flex-col gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero shrink-0 px-4 pb-2.5 pt-1">
            <DrawerHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-0 text-start">
              <div className="min-w-0">
                <DrawerTitle className="text-pretty text-body font-bold text-on-hero">
                  اعلان‌ها
                </DrawerTitle>
                <DrawerDescription className="mt-0.5 text-caption text-on-hero/70">
                  {unread > 0
                    ? `${faDigits(unread)} خوانده‌نشده`
                    : "اعلان و وصول شارژ"}
                </DrawerDescription>
              </div>
              {unread > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 rounded-lg border-on-hero/25 bg-on-hero/10 text-caption text-on-hero hover:bg-on-hero/15"
                  disabled={pending}
                  onClick={markAll}
                >
                  {pending ? "در حال ذخیره…" : "خواندن همه"}
                </Button>
              ) : null}
            </DrawerHeader>
          </div>

          <div className="min-h-0 max-h-[60dvh] flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-body-sm text-muted-foreground">
                هنوز اعلانی نیست.
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(n)}
                      className={cn(
                        "w-full rounded-2xl border px-3.5 py-3 text-start transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_5.5rem]",
                        n.read
                          ? "border-border/45 bg-card hover:bg-muted/30"
                          : "border-primary/25 bg-primary/5 ring-1 ring-primary/10 hover:bg-primary/8",
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-micro font-semibold",
                            n.kind === "ANNOUNCEMENT"
                              ? "bg-primary/10 text-primary"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                          )}
                        >
                          {n.kind === "ANNOUNCEMENT"
                            ? "اعلان"
                            : n.kind === "PAYMENT_PROOF"
                              ? "رسید"
                              : "وصول"}
                        </span>
                        {!n.read ? (
                          <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-micro font-semibold text-amber-800 dark:text-amber-200">
                            جدید
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-pretty text-body-sm font-semibold text-foreground">
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-caption text-muted-foreground">
                        {n.body}
                      </p>
                      <p className="mt-1.5 text-micro text-muted-foreground">
                        {formatDateFaShort(n.createdAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
