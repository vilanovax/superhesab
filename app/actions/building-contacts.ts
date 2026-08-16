"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { canMutateMoney } from "@/lib/rbac";
import { getTemplate } from "@/lib/templates/registry";
import {
  createBuildingContactSchema,
  deleteBuildingContactSchema,
  reorderBuildingContactsSchema,
  updateBuildingContactSchema,
  type CreateBuildingContactInput,
  type DeleteBuildingContactInput,
  type ReorderBuildingContactsInput,
  type UpdateBuildingContactInput,
} from "@/lib/validations/building";
import type { BuildingContactCategory } from "@/lib/generated/prisma/enums";

export type BuildingContactCategoryValue =
  | "EMERGENCY"
  | "FACILITIES"
  | "CONTRACTOR"
  | "ADMIN"
  | "OTHER";

export type BuildingContactDTO = {
  id: string;
  title: string;
  phone: string;
  category: BuildingContactCategoryValue;
  note: string | null;
  sortOrder: number;
  pinned: boolean;
  visibleToResidents: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BuildingContactActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const contactSelect = {
  id: true,
  title: true,
  phone: true,
  category: true,
  note: true,
  sortOrder: true,
  pinned: true,
  visibleToResidents: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toContactDTO(row: {
  id: string;
  title: string;
  phone: string;
  category: BuildingContactCategory;
  note: string | null;
  sortOrder: number;
  pinned: boolean;
  visibleToResidents: boolean;
  createdAt: Date;
  updatedAt: Date;
}): BuildingContactDTO {
  return {
    id: row.id,
    title: row.title,
    phone: row.phone,
    category: row.category,
    note: row.note,
    sortOrder: row.sortOrder,
    pinned: row.pinned,
    visibleToResidents: row.visibleToResidents,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function assertBuildingContacts(
  spaceId: string,
  userId: string,
  opts: { needMutate?: boolean } = {},
) {
  const membership = await requireSpaceMember(spaceId, userId);
  if (!membership) {
    return { ok: false as const, error: "به این فضا دسترسی ندارید." };
  }
  if (!getTemplate(membership.space.type).features.buildingCharges) {
    return {
      ok: false as const,
      error: "شماره‌های ضروری فقط در قالب ساختمان فعال است.",
    };
  }
  if (opts.needMutate && !canMutateMoney(membership.role)) {
    return {
      ok: false as const,
      error: "نقش ناظر اجازه ویرایش شماره‌ها را ندارد.",
    };
  }
  return { ok: true as const, membership };
}

function normalizeNote(note: string | null | undefined): string | null {
  if (note == null) return null;
  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * List contacts for a BUILDING space.
 * OWNER/EDITOR see all; VIEWER/residents only `visibleToResidents`.
 */
export async function listBuildingContacts(
  spaceId: string,
): Promise<BuildingContactDTO[]> {
  const session = await requireUser();
  const access = await assertBuildingContacts(spaceId, session.userId);
  if (!access.ok) return [];

  const isManager = canMutateMoney(access.membership.role);
  const rows = await prisma.buildingContact.findMany({
    where: {
      spaceId,
      ...(isManager ? {} : { visibleToResidents: true }),
    },
    select: contactSelect,
    orderBy: [{ pinned: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    take: 100,
  });
  return rows.map(toContactDTO);
}

export async function createBuildingContact(
  input: CreateBuildingContactInput,
): Promise<BuildingContactActionResult> {
  const parsed = createBuildingContactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();
  const { spaceId, title, phone, category, note, pinned, visibleToResidents } =
    parsed.data;
  const access = await assertBuildingContacts(spaceId, session.userId, {
    needMutate: true,
  });
  if (!access.ok) return access;

  try {
    const maxOrder = await prisma.buildingContact.aggregate({
      where: { spaceId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const row = await prisma.buildingContact.create({
      data: {
        spaceId,
        title,
        phone,
        category,
        note: normalizeNote(note),
        pinned: pinned ?? false,
        visibleToResidents: visibleToResidents ?? false,
        sortOrder,
      },
      select: { id: true },
    });

    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath(`/spaces/${spaceId}/contacts`);
    revalidatePath(`/spaces/${spaceId}/resident`);
    return { ok: true, id: row.id };
  } catch {
    return { ok: false, error: "ثبت شماره ناموفق بود." };
  }
}

export async function updateBuildingContact(
  input: UpdateBuildingContactInput,
): Promise<BuildingContactActionResult> {
  const parsed = updateBuildingContactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();
  const {
    spaceId,
    contactId,
    title,
    phone,
    category,
    note,
    pinned,
    visibleToResidents,
    sortOrder,
  } = parsed.data;
  const access = await assertBuildingContacts(spaceId, session.userId, {
    needMutate: true,
  });
  if (!access.ok) return access;

  const existing = await prisma.buildingContact.findFirst({
    where: { id: contactId, spaceId },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "شماره پیدا نشد." };
  }

  try {
    await prisma.buildingContact.update({
      where: { id: contactId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(note !== undefined ? { note: normalizeNote(note) } : {}),
        ...(pinned !== undefined ? { pinned } : {}),
        ...(visibleToResidents !== undefined ? { visibleToResidents } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      },
    });
    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath(`/spaces/${spaceId}/contacts`);
    revalidatePath(`/spaces/${spaceId}/resident`);
    return { ok: true, id: contactId };
  } catch {
    return { ok: false, error: "به‌روزرسانی شماره ناموفق بود." };
  }
}

export async function deleteBuildingContact(
  input: DeleteBuildingContactInput,
): Promise<BuildingContactActionResult> {
  const parsed = deleteBuildingContactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();
  const { spaceId, contactId } = parsed.data;
  const access = await assertBuildingContacts(spaceId, session.userId, {
    needMutate: true,
  });
  if (!access.ok) return access;

  const deleted = await prisma.buildingContact.deleteMany({
    where: { id: contactId, spaceId },
  });
  if (deleted.count === 0) {
    return { ok: false, error: "شماره پیدا نشد." };
  }

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath(`/spaces/${spaceId}/contacts`);
  revalidatePath(`/spaces/${spaceId}/resident`);
  return { ok: true, id: contactId };
}

/** Reorder by ordered id list (managers only). Preserves pin flag; sets sortOrder. */
export async function reorderBuildingContacts(
  input: ReorderBuildingContactsInput,
): Promise<BuildingContactActionResult> {
  const parsed = reorderBuildingContactsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "داده نامعتبر است.",
    };
  }
  const session = await requireUser();
  const { spaceId, orderedIds } = parsed.data;
  const access = await assertBuildingContacts(spaceId, session.userId, {
    needMutate: true,
  });
  if (!access.ok) return access;

  const existing = await prisma.buildingContact.findMany({
    where: { spaceId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((r) => r.id));
  if (
    orderedIds.length !== existingIds.size ||
    orderedIds.some((id) => !existingIds.has(id))
  ) {
    return { ok: false, error: "ترتیب با لیست فعلی هم‌خوان نیست." };
  }

  try {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.buildingContact.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    revalidatePath(`/spaces/${spaceId}/contacts`);
    revalidatePath(`/spaces/${spaceId}/resident`);
    return { ok: true };
  } catch {
    return { ok: false, error: "تغییر ترتیب ناموفق بود." };
  }
}
