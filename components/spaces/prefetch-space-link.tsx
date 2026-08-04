"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, FocusEvent, MouseEvent, TouchEvent } from "react";

type PrefetchSpaceLinkProps = Omit<ComponentProps<typeof Link>, "prefetch">;

/**
 * Home → space navigation: viewport prefetch (Next) + intent prefetch on
 * hover/focus/touch so dynamic `/spaces/[id]` shells warm before click.
 */
export function PrefetchSpaceLink({
  href,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: PrefetchSpaceLinkProps) {
  const router = useRouter();
  const hrefString = typeof href === "string" ? href : href.pathname ?? "";

  function warm() {
    if (!hrefString.startsWith("/spaces/")) return;
    router.prefetch(hrefString);
  }

  return (
    <Link
      {...props}
      href={href}
      prefetch
      onMouseEnter={(e: MouseEvent<HTMLAnchorElement>) => {
        warm();
        onMouseEnter?.(e);
      }}
      onFocus={(e: FocusEvent<HTMLAnchorElement>) => {
        warm();
        onFocus?.(e);
      }}
      onTouchStart={(e: TouchEvent<HTMLAnchorElement>) => {
        warm();
        onTouchStart?.(e);
      }}
    />
  );
}
