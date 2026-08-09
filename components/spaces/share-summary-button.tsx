"use client";

import { useEffect, useState, useTransition } from "react";
import { getShareSummaryText } from "@/app/actions/settlement";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function ShareIcon({ className }: { className?: string }) {
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
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" />
    </svg>
  );
}

type ShareSummaryIconButtonProps = {
  spaceId: string;
  className?: string;
};

export function ShareSummaryIconButton({
  spaceId,
  className,
}: ShareSummaryIconButtonProps) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  function onShare() {
    setToast(null);
    startTransition(async () => {
      const result = await getShareSummaryText(spaceId);
      if (!result.ok) {
        setToast(result.error);
        return;
      }

      const { text, spaceName } = result;
      try {
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.share === "function"
        ) {
          await navigator.share({
            title: `بیلان ${spaceName}`,
            text,
          });
          setToast("بیلان اشتراک‌گذاری شد");
          return;
        }

        await navigator.clipboard.writeText(text);
        setToast("بیلان کپی شد");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        try {
          await navigator.clipboard.writeText(text);
          setToast("بیلان کپی شد");
        } catch {
          setToast("اشتراک‌گذاری ناموفق بود");
        }
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          "size-9 shrink-0 rounded-xl border-border/70 bg-card shadow-sm",
          className,
        )}
        aria-label="اشتراک‌گذاری بیلان"
        title="اشتراک‌گذاری بیلان"
        disabled={pending}
        onClick={onShare}
      >
        <ShareIcon className="size-4 text-foreground" />
      </Button>

      {toast ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
          role="status"
          aria-live="polite"
        >
          <p className="animate-fade-up rounded-full border border-success/20 bg-success-soft px-4 py-2 text-label font-medium text-success shadow-sm">
            {toast}
          </p>
        </div>
      ) : null}
    </>
  );
}
