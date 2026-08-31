"use client";

import { useState } from "react";
import { mintSpaceInviteLink } from "@/app/actions/invite";
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
  const [busy, setBusy] = useState(false);

  async function onCopy() {
    setCopyError(null);
    setBusy(true);
    try {
      const minted = await mintSpaceInviteLink(spaceId);
      if (!minted.ok) {
        setCopyError(minted.error);
        return;
      }
      const url =
        typeof window === "undefined"
          ? minted.urlPath
          : `${window.location.origin}${minted.urlPath}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError("کپی لینک ناموفق بود. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-1.5">
      <Button
        type="button"
        className={className ?? "h-12 w-full rounded-xl text-body-sm font-semibold"}
        onClick={onCopy}
        disabled={busy}
        aria-busy={busy}
        aria-label={copied ? "لینک دعوت کپی شد" : "کپی لینک دعوت"}
      >
        {busy ? "در حال ساخت لینک…" : copied ? "لینک کپی شد" : "کپی لینک دعوت"}
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
