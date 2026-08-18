"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { getSession } from "@/lib/session";
import {
  MAX_ACTIVE_BUILDING_SHARE_LINKS,
  isShareLinkLive,
  loadBuildingShareReport,
  toShareLinkDTO,
  type BuildingShareLinkDTO,
} from "@/lib/building-share";
import { canMutateMoney } from "@/lib/rbac";
import { getTemplate } from "@/lib/templates/registry";
import {
  createBuildingShareLinkSchema,
  followBuildingShareSchema,
  revokeBuildingShareLinkSchema,
  updateBuildingShareLinkSchema,
  type CreateBuildingShareLinkInput,
  type UpdateBuildingShareLinkInput,
} from "@/lib/validations/building-share";

export type BuildingShareActionResult =
  | { ok: true; link?: BuildingShareLinkDTO }
  | { ok: false; error: string };

async function assertBuildingManager(spaceId: string, userId: string) {
  const membership = await requireSpaceMember(spaceId, userId);
  if (!membership) {
    return { ok: false as const, error: "دسترسی ندارید." };
  }
  if (!getTemplate(membership.space.type).features.buildingCharges) {
    return { ok: false as const, error: "این فضا ساختمان نیست." };
  }
  if (membership.space.archivedAt) {
    return { ok: false as const, error: "این دفتر بایگانی شده است." };
  }
  if (!canMutateMoney(membership.role)) {
    return { ok: false as const, error: "فقط مدیران ساختمان می‌توانند لینک بسازند." };
  }
  return { ok: true as const, membership };
}

function newShareToken(): string {
  return randomBytes(18).toString("base64url");
}

function revalidateShare(spaceId: string, token?: string) {
  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath(`/spaces/${spaceId}/settings`);
  revalidatePath("/app");
  if (token) revalidatePath(`/share/b/${token}`);
}

export async function listBuildingShareLinks(
  spaceId: string,
): Promise<BuildingShareLinkDTO[]> {
  const session = await requireUser();
  const access = await assertBuildingManager(spaceId, session.userId);
  if (!access.ok) return [];

  const rows = await prisma.buildingShareLink.findMany({
    where: { spaceId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { follows: true } } },
  });
  return rows.filter(isShareLinkLive).map(toShareLinkDTO);
}

export async function createBuildingShareLink(
  input: CreateBuildingShareLinkInput,
): Promise<BuildingShareActionResult> {
  const parsed = createBuildingShareLinkSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();
  const access = await assertBuildingManager(
    parsed.data.spaceId,
    session.userId,
  );
  if (!access.ok) return access;

  const scopes = parsed.data.scopes;
  if (!Object.values(scopes).some(Boolean)) {
    return { ok: false, error: "حداقل یک بخش را برای نمایش انتخاب کنید." };
  }

  const activeCount = await prisma.buildingShareLink.count({
    where: {
      spaceId: parsed.data.spaceId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  if (activeCount >= MAX_ACTIVE_BUILDING_SHARE_LINKS) {
    return {
      ok: false,
      error: `حداکثر ${MAX_ACTIVE_BUILDING_SHARE_LINKS} لینک فعال برای هر ساختمان.`,
    };
  }

  const title = parsed.data.title?.trim() || null;
  const token = newShareToken();
  const row = await prisma.buildingShareLink.create({
    data: {
      spaceId: parsed.data.spaceId,
      token,
      title,
      createdById: session.userId,
      ...scopes,
    },
    include: { _count: { select: { follows: true } } },
  });
  revalidateShare(parsed.data.spaceId, token);
  return { ok: true, link: toShareLinkDTO(row) };
}

export async function updateBuildingShareLink(
  input: UpdateBuildingShareLinkInput,
): Promise<BuildingShareActionResult> {
  const parsed = updateBuildingShareLinkSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();
  const access = await assertBuildingManager(
    parsed.data.spaceId,
    session.userId,
  );
  if (!access.ok) return access;

  const scopes = parsed.data.scopes;
  if (!Object.values(scopes).some(Boolean)) {
    return { ok: false, error: "حداقل یک بخش را برای نمایش انتخاب کنید." };
  }

  const existing = await prisma.buildingShareLink.findFirst({
    where: {
      id: parsed.data.linkId,
      spaceId: parsed.data.spaceId,
      revokedAt: null,
    },
  });
  if (!existing || !isShareLinkLive(existing)) {
    return { ok: false, error: "لینک پیدا نشد یا باطل شده است." };
  }

  const title =
    parsed.data.title === undefined
      ? existing.title
      : parsed.data.title?.trim() || null;

  const row = await prisma.buildingShareLink.update({
    where: { id: existing.id },
    data: { title, ...scopes },
    include: { _count: { select: { follows: true } } },
  });
  revalidateShare(parsed.data.spaceId, row.token);
  return { ok: true, link: toShareLinkDTO(row) };
}

export async function revokeBuildingShareLink(input: {
  spaceId: string;
  linkId: string;
}): Promise<BuildingShareActionResult> {
  const parsed = revokeBuildingShareLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "درخواست نامعتبر است." };
  }
  const session = await requireUser();
  const access = await assertBuildingManager(
    parsed.data.spaceId,
    session.userId,
  );
  if (!access.ok) return access;

  const existing = await prisma.buildingShareLink.findFirst({
    where: { id: parsed.data.linkId, spaceId: parsed.data.spaceId },
  });
  if (!existing) {
    return { ok: false, error: "لینک پیدا نشد." };
  }
  if (existing.revokedAt) {
    return { ok: true, link: toShareLinkDTO({ ...existing, _count: { follows: 0 } }) };
  }

  const row = await prisma.buildingShareLink.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
    include: { _count: { select: { follows: true } } },
  });
  revalidateShare(parsed.data.spaceId, row.token);
  return { ok: true, link: toShareLinkDTO(row) };
}

export type FollowedBuildingShareCard = {
  token: string;
  title: string | null;
  spaceName: string;
  currency: import("@/lib/format").SpaceCurrency;
  collectPct: number | null;
  monthSpend: number | null;
};

export async function listMyFollowedBuildingShares(): Promise<
  FollowedBuildingShareCard[]
> {
  const session = await requireUser();
  const rows = await prisma.buildingShareFollow.findMany({
    where: {
      userId: session.userId,
      link: {
        revokedAt: null,
        space: { archivedAt: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      link: {
        select: {
          token: true,
          title: true,
          includeChargesSummary: true,
          includeExpensesSummary: true,
          space: {
            select: {
              id: true,
              name: true,
              currency: true,
              members: {
                where: { userId: session.userId },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const cards: FollowedBuildingShareCard[] = [];
  for (const row of rows) {
    if (row.link.space.members.length > 0) continue;
    const report = await loadBuildingShareReport(row.link.token);
    if (!report) continue;
    cards.push({
      token: row.link.token,
      title: row.link.title,
      spaceName: row.link.space.name,
      currency: row.link.space.currency,
      collectPct: report.chargesSummary?.collectPct ?? null,
      monthSpend: report.expensesSummary?.monthTotal ?? null,
    });
  }
  return cards;
}

export type BuildingShareViewerState = {
  loggedIn: boolean;
  following: boolean;
  isMember: boolean;
};

export async function getBuildingShareViewerState(
  token: string,
): Promise<BuildingShareViewerState> {
  const session = await getSession();
  if (!session) {
    return { loggedIn: false, following: false, isMember: false };
  }

  const link = await prisma.buildingShareLink.findUnique({
    where: { token: token.trim() },
    select: {
      id: true,
      spaceId: true,
      follows: {
        where: { userId: session.userId },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!link) {
    return { loggedIn: true, following: false, isMember: false };
  }

  const membership = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: { spaceId: link.spaceId, userId: session.userId },
    },
    select: { id: true },
  });

  return {
    loggedIn: true,
    following: link.follows.length > 0,
    isMember: Boolean(membership),
  };
}

export async function followBuildingShare(
  token: string,
): Promise<BuildingShareActionResult> {
  const parsed = followBuildingShareSchema.safeParse({ token });
  if (!parsed.success) {
    return { ok: false, error: "لینک نامعتبر است." };
  }
  const session = await requireUser();
  const report = await loadBuildingShareReport(parsed.data.token);
  if (!report) {
    return { ok: false, error: "این لینک معتبر نیست یا باطل شده." };
  }

  const link = await prisma.buildingShareLink.findUnique({
    where: { token: parsed.data.token },
    select: { id: true, spaceId: true },
  });
  if (!link) {
    return { ok: false, error: "لینک پیدا نشد." };
  }

  const membership = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: { spaceId: link.spaceId, userId: session.userId },
    },
    select: { id: true },
  });
  if (membership) {
    return {
      ok: false,
      error: "این ساختمان از قبل در فضاهای شماست.",
    };
  }

  await prisma.buildingShareFollow.upsert({
    where: {
      linkId_userId: { linkId: link.id, userId: session.userId },
    },
    create: { linkId: link.id, userId: session.userId },
    update: {},
  });
  revalidatePath("/app");
  revalidatePath(`/share/b/${parsed.data.token}`);
  return { ok: true };
}

export async function unfollowBuildingShare(
  token: string,
): Promise<BuildingShareActionResult> {
  const parsed = followBuildingShareSchema.safeParse({ token });
  if (!parsed.success) {
    return { ok: false, error: "لینک نامعتبر است." };
  }
  const session = await requireUser();
  const link = await prisma.buildingShareLink.findUnique({
    where: { token: parsed.data.token },
    select: { id: true },
  });
  if (!link) {
    return { ok: false, error: "لینک پیدا نشد." };
  }
  await prisma.buildingShareFollow.deleteMany({
    where: { linkId: link.id, userId: session.userId },
  });
  revalidatePath("/app");
  revalidatePath(`/share/b/${parsed.data.token}`);
  return { ok: true };
}
