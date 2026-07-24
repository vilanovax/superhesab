import { z } from "zod";

export const createUnitSchema = z.object({
  spaceId: z.string().min(1),
  name: z.string().trim().min(1).max(40),
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
  year: z.number().int().min(2000).max(2100),
  baseCharge: z.number().int().positive(),
});

export const upsertChargePaymentSchema = z.object({
  spaceId: z.string().min(1),
  unitId: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  amount: z.number().int().min(0),
  status: z.enum(["DUE", "PARTIAL", "PAID", "WAIVED"]),
  note: z.string().trim().max(200).nullable().optional(),
  date: z.string().min(1).optional(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type UpsertChargePlanInput = z.infer<typeof upsertChargePlanSchema>;
export type UpsertChargePaymentInput = z.infer<
  typeof upsertChargePaymentSchema
>;
