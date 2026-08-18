"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  followBuildingShare,
  unfollowBuildingShare,
  type BuildingShareViewerState,
} from "@/app/actions/building-share";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/lib/stores/ui-store";

type BuildingShareFollowButtonProps = {
  token: string;
  viewer: BuildingShareViewerState;
};

export function BuildingShareFollowButton({
  token,
  viewer,
}: BuildingShareFollowButtonProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const callback = `/share/b/${encodeURIComponent(token)}`;

  if (viewer.isMember) {
    return (
      <p className="rounded-xl bg-muted/40 px-3 py-2.5 text-center text-[12px] text-muted-foreground">
        این ساختمان از قبل در فضاهای شماست.
      </p>
    );
  }

  if (!viewer.loggedIn) {
    return (
      <Button asChild className="h-11 w-full rounded-xl font-semibold">
        <Link href={`/login?callbackUrl=${encodeURIComponent(callback)}`}>
          پین روی صفحه خانه
        </Link>
      </Button>
    );
  }

  function toggle() {
    startTransition(async () => {
      const result = viewer.following
        ? await unfollowBuildingShare(token)
        : await followBuildingShare(token);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast(
        viewer.following ? "از خانه برداشته شد" : "روی خانه پین شد",
        "success",
      );
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant={viewer.following ? "outline" : "default"}
      className="h-11 w-full rounded-xl font-semibold"
      disabled={pending}
      onClick={toggle}
    >
      {viewer.following ? "برداشتن از خانه" : "پین روی صفحه خانه"}
    </Button>
  );
}
