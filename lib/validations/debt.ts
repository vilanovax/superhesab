import { z } from "zod";

export const debtTypeSchema = z.enum(["LENT", "BORROWED"]);

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ نامعتبر است.");

export const createDebtSchema = z.object({
  spaceId: z.string().min(1),
  type: debtTypeSchema,
  counterparty: z
    .string()
    .trim()
    .min(2, "نام طرف حساب حداقل ۲ کاراکتر باشد.")
    .max(80),
  initialAmount: z.number().int().min(1, "مبلغ باید حداقل ۱ باشد."),
  dueDate: isoDateSchema.optional().nullable(),
});

export const addDebtPaymentSchema = z.object({
  debtId: z.string().min(1),
  spaceId: z.string().min(1),
  amount: z.number().int().min(1, "مبلغ باید حداقل ۱ باشد."),
  date: isoDateSchema,
  note: z.string().trim().max(200).optional().nullable(),
});

export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type AddDebtPaymentInput = z.infer<typeof addDebtPaymentSchema>;
