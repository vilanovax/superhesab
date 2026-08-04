"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type CopyInviteLinkButtonProps = {
  spaceId: string;
  className?: string;
};

export function CopyInviteLinkButton({
  spaceId,
  className,
}: CopyInviteLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function onCopy() {
    const url =
      typeof window === "undefined"
        ? `/invite/${spaceId}`
        : `${window.location.origin}/invite/${spaceId}`;
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError("کپی لینک ناموفق بود. دوباره تلاش کنید.");
    }
  }

  return (
    <div className="w-full space-y-1.5">
      <Button
        type="button"
        className={className ?? "h-12 w-full rounded-xl text-body-sm font-semibold"}
        onClick={onCopy}
        aria-label={copied ? "لینک دعوت کپی شد" : "کپی لینک دعوت"}
      >
        {copied ? "لینک کپی شد" : "کپی لینک دعوت"}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? "لینک دعوت کپی شد" : ""}
      </span>
      {copyError ? (
        <p
          className="text-caption text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {copyError}
        </p>
      ) : null}
    </div>
  );
}
