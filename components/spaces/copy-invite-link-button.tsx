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

  async function onCopy() {
    const url =
      typeof window === "undefined"
        ? `/invite/${spaceId}`
        : `${window.location.origin}/invite/${spaceId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      className={className ?? "h-12 w-full rounded-xl text-body-sm font-semibold"}
      onClick={onCopy}
    >
      {copied ? "لینک کپی شد" : "کپی لینک دعوت"}
    </Button>
  );
}
