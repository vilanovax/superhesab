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
  /** Thousandths; 1000 = 1.0× */
  multiplier: z.number().int().min(1).max(100_000).default(1000),
});

export const updateUnitSchema = z.object({
  spaceId: z.string().min(1),
  unitId: z.string().min(1),
  name: z.string().trim().min(1).max(40),
  area: z.number().int().positive().nullable().optional(),
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

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type UpsertChargePlanInput = z.infer<typeof upsertChargePlanSchema>;
export type UpsertChargePaymentInput = z.infer<
  typeof upsertChargePaymentSchema
>;
