import { z } from "zod";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ نامعتبر است.");

export const createSavingsPotSchema = z.object({
  spaceId: z.string().min(1),
  title: z
    .string()
    .trim()
    .min(2, "عنوان حداقل ۲ کاراکتر باشد.")
    .max(80),
  targetAmount: z.number().int().min(1, "مبلغ هدف باید حداقل ۱ باشد."),
  deadline: isoDateSchema.optional().nullable(),
});

export const addSavingsTransactionSchema = z.object({
  spaceId: z.string().min(1),
  potId: z.string().min(1),
  memberId: z.string().min(1),
  amount: z.number().int().min(1, "مبلغ باید حداقل ۱ باشد."),
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  date: isoDateSchema,
  note: z.string().trim().max(200).optional().nullable(),
});

export const updateSavingsPotStatusSchema = z.object({
  spaceId: z.string().min(1),
  potId: z.string().min(1),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
});

export type CreateSavingsPotInput = z.infer<typeof createSavingsPotSchema>;
export type AddSavingsTransactionInput = z.infer<
  typeof addSavingsTransactionSchema
>;
export type UpdateSavingsPotStatusInput = z.infer<
  typeof updateSavingsPotStatusSchema
>;
