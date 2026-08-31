"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinSpace } from "@/app/actions/invite";
import { claimVirtualProfile } from "@/app/actions/members";
import { Button } from "@/components/ui/button";

export function JoinSpaceButton({
  spaceId,
  alreadyMember,
  claimToken,
  claimLabel,
  inviteToken,
}: {
  spaceId: string;
  alreadyMember: boolean;
  /** Signed claim JWT — when set, join merges the virtual profile */
  claimToken?: string | null;
  claimLabel?: string | null;
  /** Signed space-invite JWT required for generic join */
  inviteToken?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onJoin() {
    startTransition(async () => {
      setError(null);
      if (claimToken) {
        const result = await claimVirtualProfile(spaceId, claimToken);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else if (inviteToken) {
        const result = await joinSpace(spaceId, inviteToken);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        setError("لینک دعوت نامعتبر است. از مالک لینک جدید بگیرید.");
        return;
      }
      router.replace(`/spaces/${spaceId}`);
      router.refresh();
    });
  }

  if (alreadyMember && !claimToken) {
    return (
      <Button
        type="button"
        className="h-14 w-full rounded-2xl text-base font-semibold"
        onClick={() => router.replace(`/spaces/${spaceId}`)}
      >
        ورود به فضا
      </Button>
    );
  }

  const label = claimToken
    ? claimLabel
      ? `ادعا و مدیریت حساب ${claimLabel}`
      : "ادعا و پیوستن"
    : "پیوستن به فضا";

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="h-14 w-full rounded-2xl text-base font-semibold shadow-fab"
        disabled={pending || (!claimToken && !inviteToken)}
        aria-busy={pending}
        onClick={onJoin}
      >
        {pending ? "در حال پیوستن…" : label}
      </Button>
      {error ? (
        <p
          className="text-sm text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
