import { z } from "zod";

export const debtTypeSchema = z.enum(["LENT", "BORROWED"]);

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ نامعتبر است.");

export const createDebtSchema = z
  .object({
    spaceId: z.string().min(1),
    type: debtTypeSchema,
    counterparty: z.string().trim().max(80).default(""),
    unitId: z.string().min(1).optional().nullable(),
    initialAmount: z.number().int().min(1, "مبلغ باید حداقل ۱ باشد."),
    note: z.string().trim().max(200).optional().nullable(),
    dueDate: isoDateSchema.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hasUnit = Boolean(data.unitId?.trim());
    if (!hasUnit && data.counterparty.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "نام طرف حساب حداقل ۲ کاراکتر باشد.",
        path: ["counterparty"],
      });
    }
  });

export const addDebtPaymentSchema = z.object({
  debtId: z.string().min(1),
  spaceId: z.string().min(1),
  amount: z.number().int().min(1, "مبلغ باید حداقل ۱ باشد."),
  date: isoDateSchema,
  note: z.string().trim().max(200).optional().nullable(),
});

export const addGroupedDebtPaymentSchema = z.object({
  spaceId: z.string().min(1),
  type: debtTypeSchema,
  counterparty: z.string().trim().min(2).max(80),
  amount: z.number().int().min(1, "مبلغ باید حداقل ۱ باشد."),
  date: isoDateSchema,
  note: z.string().trim().max(200).optional().nullable(),
});

export const updateDebtSchema = z.object({
  spaceId: z.string().min(1),
  debtId: z.string().min(1),
  initialAmount: z.number().int().min(1, "مبلغ باید حداقل ۱ باشد."),
  note: z.string().trim().max(200).optional().nullable(),
  dueDate: isoDateSchema.optional().nullable(),
  occurredOn: isoDateSchema.optional(),
});

export const updateDebtPaymentSchema = z.object({
  spaceId: z.string().min(1),
  paymentId: z.string().min(1),
  amount: z.number().int().min(1, "مبلغ باید حداقل ۱ باشد."),
  date: isoDateSchema,
  note: z.string().trim().max(200).optional().nullable(),
});

export const deleteDebtSchema = z.object({
  spaceId: z.string().min(1),
  debtId: z.string().min(1),
});

export const deleteDebtPaymentSchema = z.object({
  spaceId: z.string().min(1),
  paymentId: z.string().min(1),
});

export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type AddDebtPaymentInput = z.infer<typeof addDebtPaymentSchema>;
export type AddGroupedDebtPaymentInput = z.infer<
  typeof addGroupedDebtPaymentSchema
>;
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>;
export type UpdateDebtPaymentInput = z.infer<typeof updateDebtPaymentSchema>;
export type DeleteDebtInput = z.infer<typeof deleteDebtSchema>;
export type DeleteDebtPaymentInput = z.infer<typeof deleteDebtPaymentSchema>;
