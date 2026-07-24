"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinSpace } from "@/app/actions/invite";
import { claimVirtualProfile } from "@/app/actions/members";
import { Button } from "@/components/ui/button";

export function JoinSpaceButton({
  spaceId,
  alreadyMember,
  claimVirtualUserId,
  claimLabel,
  inviteRole,
}: {
  spaceId: string;
  alreadyMember: boolean;
  /** When set, join merges this virtual profile instead of generic EDITOR join */
  claimVirtualUserId?: string | null;
  claimLabel?: string | null;
  inviteRole?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onJoin() {
    startTransition(async () => {
      setError(null);
      if (claimVirtualUserId) {
        const result = await claimVirtualProfile(spaceId, claimVirtualUserId);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        const result = await joinSpace(spaceId, inviteRole);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      router.replace(`/spaces/${spaceId}`);
      router.refresh();
    });
  }

  if (alreadyMember && !claimVirtualUserId) {
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

  const label = claimVirtualUserId
    ? claimLabel
      ? `ادعا و مدیریت حساب ${claimLabel}`
      : "ادعا و پیوستن"
    : "پیوستن به فضا";

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="h-14 w-full rounded-2xl text-base font-semibold shadow-fab"
        disabled={pending}
        onClick={onJoin}
      >
        {pending ? "در حال پیوستن…" : label}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
