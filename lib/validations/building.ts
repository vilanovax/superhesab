import { z } from "zod";

/** Jalali plan year (e.g. 1405) — not Gregorian. */
const jalaliPlanYear = z
  .number({ error: "سال نامعتبر است." })
  .int({ error: "سال نامعتبر است." })
  .min(1390, { error: "سال باید شمسی باشد (مثلاً ۱۴۰۵)." })
  .max(1500, { error: "سال خارج از بازه مجاز است." });

export const createUnitSchema = z.object({
  spaceId: z.string().min(1, { error: "فضا نامعتبر است." }),
  name: z.string().trim().min(1, { error: "نام واحد الزامی است." }).max(40),
  area: z.number().int().positive().nullable().optional(),
  /** Optional unit contact phone / mobile (not auth). */
  phone: z
    .string()
    .trim()
    .max(40, { error: "شماره حداکثر ۴۰ کاراکتر است." })
    .nullable()
    .optional(),
  /** Thousandths; 1000 = 1.0× */
  multiplier: z.number().int().min(1).max(100_000).default(1000),
});

export const updateUnitSchema = z.object({
  spaceId: z.string().min(1),
  unitId: z.string().min(1),
  name: z.string().trim().min(1).max(40),
  area: z.number().int().positive().nullable().optional(),
  phone: z
    .string()
    .trim()
    .max(40, { error: "شماره حداکثر ۴۰ کاراکتر است." })
    .nullable()
    .optional(),
  multiplier: z.number().int().min(1).max(100_000),
  isActive: z.boolean(),
});

export const upsertChargePlanSchema = z.object({
  spaceId: z.string().min(1),
  year: jalaliPlanYear,
  baseCharge: z
    .number({ error: "مبلغ پایه نامعتبر است." })
    .int()
    .positive({ error: "مبلغ پایه باید بیشتر از صفر باشد." }),
});

/** Change building base charge for one month or from that month through year-end. */
export const applyChargeBaseOverrideSchema = z.object({
  spaceId: z.string().min(1),
  year: jalaliPlanYear,
  month: z
    .number()
    .int()
    .min(1, { error: "ماه نامعتبر است." })
    .max(12, { error: "ماه نامعتبر است." }),
  baseCharge: z
    .number({ error: "مبلغ پایه نامعتبر است." })
    .int()
    .positive({ error: "مبلغ پایه باید بیشتر از صفر باشد." }),
  /** single = فقط همین ماه؛ forward = از این ماه تا پایان سال */
  mode: z.enum(["single", "forward"]),
});

export const upsertChargePaymentSchema = z.object({
  spaceId: z.string().min(1),
  unitId: z.string().min(1),
  year: jalaliPlanYear,
  month: z
    .number()
    .int()
    .min(1, { error: "ماه نامعتبر است." })
    .max(12, { error: "ماه نامعتبر است." }),
  amount: z
    .number({ error: "مبلغ نامعتبر است." })
    .int({ error: "مبلغ باید عدد صحیح باشد." })
    .min(0, { error: "مبلغ نمی‌تواند منفی باشد." }),
  status: z.enum(["DUE", "PARTIAL", "PAID", "WAIVED"], {
    error: "وضعیت نامعتبر است.",
  }),
  note: z.string().trim().max(200).nullable().optional(),
  date: z.string().min(1).optional(),
});

export const createBuildingSuggestionSchema = z.object({
  spaceId: z.string().min(1),
  title: z
    .string()
    .trim()
    .min(3, { error: "عنوان حداقل ۳ حرف باشد." })
    .max(80, { error: "عنوان حداکثر ۸۰ حرف است." }),
  body: z
    .string()
    .trim()
    .min(5, { error: "متن پیشنهاد کوتاه است." })
    .max(800, { error: "متن حداکثر ۸۰۰ حرف است." }),
});

export const updateBuildingSuggestionStatusSchema = z.object({
  spaceId: z.string().min(1),
  suggestionId: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "REJECTED"], {
    error: "وضعیت نامعتبر است.",
  }),
  managerNote: z
    .string()
    .trim()
    .max(300, { error: "یادداشت حداکثر ۳۰۰ حرف است." })
    .nullable()
    .optional(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type UpsertChargePlanInput = z.infer<typeof upsertChargePlanSchema>;
export type ApplyChargeBaseOverrideInput = z.infer<
  typeof applyChargeBaseOverrideSchema
>;
export type UpsertChargePaymentInput = z.infer<
  typeof upsertChargePaymentSchema
>;
export type CreateBuildingSuggestionInput = z.infer<
  typeof createBuildingSuggestionSchema
>;
export type UpdateBuildingSuggestionStatusInput = z.infer<
  typeof updateBuildingSuggestionStatusSchema
>;
export const createBuildingAnnouncementSchema = z.object({
  spaceId: z.string().min(1),
  title: z
    .string()
    .trim()
    .min(3, { error: "عنوان حداقل ۳ حرف باشد." })
    .max(100, { error: "عنوان حداکثر ۱۰۰ حرف است." }),
  body: z
    .string()
    .trim()
    .min(5, { error: "متن اعلان کوتاه است." })
    .max(2000, { error: "متن حداکثر ۲۰۰۰ حرف است." }),
  pinned: z.boolean().optional().default(false),
});

export const updateBuildingAnnouncementSchema = z.object({
  spaceId: z.string().min(1),
  announcementId: z.string().min(1),
  title: z.string().trim().min(3).max(100).optional(),
  body: z.string().trim().min(5).max(2000).optional(),
  pinned: z.boolean().optional(),
  archive: z.boolean().optional(),
});

export type CreateBuildingAnnouncementInput = z.infer<
  typeof createBuildingAnnouncementSchema
>;
export type UpdateBuildingAnnouncementInput = z.infer<
  typeof updateBuildingAnnouncementSchema
>;

const proofMime = z.enum(
  ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  { error: "فرمت فایل مجاز نیست (jpg/png/webp/pdf)." },
);

export const createChargeProofUploadIntentSchema = z.object({
  spaceId: z.string().min(1),
  unitId: z.string().min(1),
  year: jalaliPlanYear,
  month: z.number().int().min(1).max(12),
  mimeType: proofMime,
  byteSize: z
    .number()
    .int()
    .positive()
    .max(8 * 1024 * 1024, { error: "حجم فایل حداکثر ۸ مگابایت است." }),
  amount: z.number().int().min(0).optional(),
  note: z.string().trim().max(200).nullable().optional(),
});

export const confirmChargeProofUploadSchema = z.object({
  spaceId: z.string().min(1),
  proofId: z.string().min(1),
});

export const reviewChargeProofSchema = z.object({
  spaceId: z.string().min(1),
  proofId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(300).nullable().optional(),
  amount: z.number().int().min(0).optional(),
  paymentStatus: z.enum(["DUE", "PARTIAL", "PAID", "WAIVED"]).optional(),
});

export type CreateChargeProofUploadIntentInput = z.infer<
  typeof createChargeProofUploadIntentSchema
>;
export type ConfirmChargeProofUploadInput = z.infer<
  typeof confirmChargeProofUploadSchema
>;
export type ReviewChargeProofInput = z.infer<typeof reviewChargeProofSchema>;

const contactCategory = z.enum(
  ["EMERGENCY", "FACILITIES", "CONTRACTOR", "ADMIN", "OTHER"],
  { error: "دسته تماس نامعتبر است." },
);

const contactPhone = z
  .string()
  .trim()
  .min(3, { error: "شماره تماس کوتاه است." })
  .max(40, { error: "شماره تماس حداکثر ۴۰ کاراکتر است." })
  .refine((v) => /[\d۰-۹]/.test(v), {
    error: "شماره تماس باید شامل رقم باشد.",
  });

export const createBuildingContactSchema = z.object({
  spaceId: z.string().min(1),
  title: z
    .string()
    .trim()
    .min(2, { error: "عنوان حداقل ۲ حرف باشد." })
    .max(80, { error: "عنوان حداکثر ۸۰ حرف است." }),
  phone: contactPhone,
  category: contactCategory.optional().default("OTHER"),
  note: z
    .string()
    .trim()
    .max(200, { error: "یادداشت حداکثر ۲۰۰ حرف است." })
    .optional()
    .nullable(),
  pinned: z.boolean().optional().default(false),
  visibleToResidents: z.boolean().optional().default(false),
});

export const updateBuildingContactSchema = z.object({
  spaceId: z.string().min(1),
  contactId: z.string().min(1),
  title: z.string().trim().min(2).max(80).optional(),
  phone: contactPhone.optional(),
  category: contactCategory.optional(),
  note: z.string().trim().max(200).optional().nullable(),
  pinned: z.boolean().optional(),
  visibleToResidents: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const deleteBuildingContactSchema = z.object({
  spaceId: z.string().min(1),
  contactId: z.string().min(1),
});

export const reorderBuildingContactsSchema = z.object({
  spaceId: z.string().min(1),
  orderedIds: z
    .array(z.string().min(1))
    .min(1, { error: "لیست ترتیب خالی است." })
    .max(100),
});

export type CreateBuildingContactInput = z.infer<
  typeof createBuildingContactSchema
>;
export type UpdateBuildingContactInput = z.infer<
  typeof updateBuildingContactSchema
>;
export type DeleteBuildingContactInput = z.infer<
  typeof deleteBuildingContactSchema
>;
export type ReorderBuildingContactsInput = z.infer<
  typeof reorderBuildingContactsSchema
>;
