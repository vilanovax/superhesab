"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinSpace } from "@/app/actions/invite";
import { Button } from "@/components/ui/button";

export function JoinSpaceButton({
  spaceId,
  alreadyMember,
}: {
  spaceId: string;
  alreadyMember: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onJoin() {
    startTransition(async () => {
      const result = await joinSpace(spaceId);
      if (!result.ok) {
        return;
      }
      router.replace(`/spaces/${spaceId}`);
      router.refresh();
    });
  }

  if (alreadyMember) {
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

  return (
    <Button
      type="button"
      className="h-14 w-full rounded-2xl text-base font-semibold shadow-[0_12px_28px_-10px_rgba(15,92,87,0.55)]"
      disabled={pending}
      onClick={onJoin}
    >
      {pending ? "در حال پیوستن…" : "پیوستن به فضا"}
    </Button>
  );
}
