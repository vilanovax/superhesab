import { z } from "zod";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ نامعتبر است.");

export const createInternalLoanSchema = z
  .object({
    spaceId: z.string().min(1),
    fromMemberId: z.string().min(1),
    toMemberId: z.string().min(1),
    initialAmount: z.number().int().min(1, "مبلغ باید حداقل ۱ باشد."),
    dueDate: isoDateSchema.optional().nullable(),
    note: z.string().trim().max(200).optional().nullable(),
  })
  .refine((v) => v.fromMemberId !== v.toMemberId, {
    message: "وام‌دهنده و وام‌گیرنده نمی‌توانند یک نفر باشند.",
    path: ["toMemberId"],
  });

export const addInternalLoanPaymentSchema = z.object({
  spaceId: z.string().min(1),
  loanId: z.string().min(1),
  amount: z.number().int().min(1, "مبلغ باید حداقل ۱ باشد."),
  date: isoDateSchema,
  note: z.string().trim().max(200).optional().nullable(),
});

export type CreateInternalLoanInput = z.infer<typeof createInternalLoanSchema>;
export type AddInternalLoanPaymentInput = z.infer<
  typeof addInternalLoanPaymentSchema
>;
