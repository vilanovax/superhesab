import type { Metadata } from "next";
import { requireSpaceMember } from "@/lib/auth/guards";
import { getSession } from "@/lib/session";

/** Browser tab title: space name (falls back when unauthenticated). */
export async function spaceRouteMetadata(
  spaceId: string,
  pageLabel?: string,
): Promise<Metadata> {
  const session = await getSession();
  if (!session) {
    return { title: pageLabel ?? "فضا" };
  }
  const membership = await requireSpaceMember(spaceId, session.userId);
  if (!membership) {
    return { title: pageLabel ?? "فضا" };
  }
  const name = membership.space.name.trim() || "فضا";
  return { title: pageLabel ? `${name} · ${pageLabel}` : name };
}
