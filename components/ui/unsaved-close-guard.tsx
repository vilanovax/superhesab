"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Intercepts sheet/dialog dismiss when the form has unsaved edits.
 * Pair with `beforeunload` inside the form for tab/refresh protection.
 */
export function useUnsavedCloseGuard(blocked: boolean): {
  requestOpenChange: (
    next: boolean,
    apply: (open: boolean) => void,
  ) => void;
  discardConfirm: ReactNode;
} {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingClose = useRef<(() => void) | null>(null);

  const requestOpenChange = useCallback(
    (next: boolean, apply: (open: boolean) => void) => {
      if (next) {
        apply(true);
        return;
      }
      if (!blocked) {
        apply(false);
        return;
      }
      pendingClose.current = () => apply(false);
      setConfirmOpen(true);
    },
    [blocked],
  );

  const discardConfirm = (
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={(open) => {
        setConfirmOpen(open);
        if (!open) pendingClose.current = null;
      }}
      title="تغییرات ذخیره نشده"
      description="اگر ببندید، نوشته‌های این فرم از بین می‌رود."
      confirmLabel="بستن بدون ذخیره"
      cancelLabel="ادامه ویرایش"
      destructive
      onConfirm={() => {
        const close = pendingClose.current;
        pendingClose.current = null;
        setConfirmOpen(false);
        close?.();
      }}
    />
  );

  return { requestOpenChange, discardConfirm };
}
