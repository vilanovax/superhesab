import { SignJWT, jwtVerify } from "jose";
import type { SpaceRole } from "@/types";

const INVITE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days
const CLAIM_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type InviteTokenPayload = {
  typ: "space_invite";
  spaceId: string;
  role: "EDITOR" | "VIEWER";
};

export type ClaimTokenPayload = {
  typ: "virtual_claim";
  spaceId: string;
  virtualUserId: string;
};

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set (min 16 characters)");
  }
  return new TextEncoder().encode(secret);
}

export async function signSpaceInviteToken(input: {
  spaceId: string;
  role: "EDITOR" | "VIEWER";
}): Promise<string> {
  return new SignJWT({
    typ: "space_invite",
    spaceId: input.spaceId,
    role: input.role,
  } satisfies InviteTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${INVITE_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySpaceInviteToken(
  token: string,
): Promise<InviteTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.typ !== "space_invite") return null;
    if (typeof payload.spaceId !== "string") return null;
    if (payload.role !== "EDITOR" && payload.role !== "VIEWER") return null;
    return {
      typ: "space_invite",
      spaceId: payload.spaceId,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function signVirtualClaimToken(input: {
  spaceId: string;
  virtualUserId: string;
}): Promise<string> {
  return new SignJWT({
    typ: "virtual_claim",
    spaceId: input.spaceId,
    virtualUserId: input.virtualUserId,
  } satisfies ClaimTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CLAIM_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyVirtualClaimToken(
  token: string,
): Promise<ClaimTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.typ !== "virtual_claim") return null;
    if (typeof payload.spaceId !== "string") return null;
    if (typeof payload.virtualUserId !== "string") return null;
    return {
      typ: "virtual_claim",
      spaceId: payload.spaceId,
      virtualUserId: payload.virtualUserId,
    };
  } catch {
    return null;
  }
}

/** Normalize invite role for tokens — never OWNER. */
export function inviteRoleForToken(
  role: SpaceRole | string | null | undefined,
  fallback: "EDITOR" | "VIEWER" = "EDITOR",
): "EDITOR" | "VIEWER" {
  if (role === "VIEWER") return "VIEWER";
  if (role === "EDITOR") return "EDITOR";
  return fallback;
}
