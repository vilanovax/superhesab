import { z } from "zod";

export const buildingShareScopesSchema = z.object({
  includeExpensesSummary: z.boolean(),
  includeExpensesList: z.boolean(),
  includeChargesSummary: z.boolean(),
  includeChargesUnits: z.boolean(),
  includeAnnouncements: z.boolean(),
});

export const createBuildingShareLinkSchema = z.object({
  spaceId: z.string().min(1, { error: "فضا نامعتبر است." }),
  title: z
    .string()
    .trim()
    .max(60, { error: "عنوان حداکثر ۶۰ کاراکتر است." })
    .optional()
    .nullable(),
  scopes: buildingShareScopesSchema,
});

export const updateBuildingShareLinkSchema = z.object({
  spaceId: z.string().min(1),
  linkId: z.string().min(1),
  title: z
    .string()
    .trim()
    .max(60, { error: "عنوان حداکثر ۶۰ کاراکتر است." })
    .optional()
    .nullable(),
  scopes: buildingShareScopesSchema,
});

export const revokeBuildingShareLinkSchema = z.object({
  spaceId: z.string().min(1),
  linkId: z.string().min(1),
});

export const followBuildingShareSchema = z.object({
  token: z.string().min(8, { error: "لینک نامعتبر است." }).max(80),
});

export type BuildingShareScopesInput = z.infer<typeof buildingShareScopesSchema>;
export type CreateBuildingShareLinkInput = z.infer<
  typeof createBuildingShareLinkSchema
>;
export type UpdateBuildingShareLinkInput = z.infer<
  typeof updateBuildingShareLinkSchema
>;
