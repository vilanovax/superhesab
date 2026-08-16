import { z } from "zod";
import {
  BACKUP_APP,
  BACKUP_VERSION,
  type BackupFileV2,
  type BackupSpacePayload,
} from "@/lib/backup/types";

const personSchema = z.object({
  originalUserId: z.string().min(1),
  phone: z.string().min(1),
  name: z.string().nullable(),
  email: z.string().nullable(),
  isVirtual: z.boolean(),
});

const spaceSchema: z.ZodType<BackupSpacePayload> = z.object({
  originalSpaceId: z.string().min(1),
  name: z.string().min(1).max(120),
  type: z.enum(["TRIP", "PARTNER", "PERSONAL", "FAMILY", "BUILDING", "FUND"]),
  currency: z.enum(["TOMAN", "RIAL", "USD", "AED", "EUR"]),
  roundUpToThousand: z.boolean(),
  monthlyBudget: z.number().int().nullable(),
  defaultPlanYear: z.number().int().nullable(),
  archivedAt: z.string().nullable(),
  members: z.array(
    z.object({
      originalMemberId: z.string().min(1),
      originalUserId: z.string().min(1),
      role: z.enum(["OWNER", "EDITOR", "VIEWER"]),
      defaultShare: z.number().int().min(1),
      user: personSchema,
    }),
  ),
  expenses: z.array(z.any()),
  settlements: z.array(z.any()),
  checklist: z.array(z.any()),
  spaceNote: z
    .object({
      body: z.string(),
      updatedAt: z.string().min(1),
    })
    .nullable()
    .optional()
    .default(null),
  debts: z.array(z.any()),
  categoryBudgets: z.array(z.any()),
  recurringRules: z.array(z.any()),
  units: z.array(z.any()),
  chargePlans: z.array(z.any()),
  chargePayments: z.array(z.any()),
  buildingSuggestions: z.array(z.any()),
  buildingAnnouncements: z.array(z.any()),
  buildingContacts: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        phone: z.string().min(1).max(40),
        category: z.enum([
          "EMERGENCY",
          "FACILITIES",
          "CONTRACTOR",
          "ADMIN",
          "OTHER",
        ]),
        note: z.string().nullable(),
        sortOrder: z.number().int(),
        pinned: z.boolean(),
        visibleToResidents: z.boolean(),
      }),
    )
    .optional()
    .default([]),
  savingsPots: z.array(z.any()),
  internalLoans: z.array(z.any()),
  fundPlan: z
    .object({
      shareAmount: z.number().int().min(1),
      periodCount: z.number().int().min(2).max(60),
    })
    .nullable(),
  fundTurns: z.array(z.any()),
  fundPayments: z.array(z.any()),
}) as z.ZodType<BackupSpacePayload>;

const platformUserSchema = z.object({
  originalUserId: z.string().min(1),
  phone: z.string().min(1),
  name: z.string().nullable(),
  email: z.string().nullable(),
  isVirtual: z.boolean(),
  platformRole: z.enum(["USER", "ADMIN"]),
  disabledAt: z.string().nullable(),
  createdAt: z.string().min(1),
});

export const backupFileSchema: z.ZodType<BackupFileV2> = z.object({
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string().min(1),
  app: z.literal(BACKUP_APP),
  scope: z.enum(["account", "space", "platform", "user"]),
  user: z.object({
    id: z.string(),
    phone: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  }),
  users: z.array(platformUserSchema).optional(),
  spaces: z.array(spaceSchema),
});

export function parseBackupFile(raw: unknown):
  | { ok: true; data: BackupFileV2 }
  | { ok: false; error: string } {
  if (raw && typeof raw === "object" && "version" in raw) {
    const v = (raw as { version?: unknown }).version;
    if (v === 1) {
      return {
        ok: false,
        error: "بک‌آپ نسخه ۱ پشتیبانی نمی‌شود. لطفاً دوباره از اپ خروجی بگیرید.",
      };
    }
  }
  const parsed = backupFileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "فایل بک‌آپ نامعتبر است.",
    };
  }
  return { ok: true, data: parsed.data };
}
