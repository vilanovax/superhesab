import { z } from "zod";

export const upsertFundPlanSchema = z.object({
  spaceId: z.string().min(1),
  shareAmount: z.number().int().min(1, "مبلغ سهم باید حداقل ۱ باشد."),
  periodCount: z
    .number()
    .int()
    .min(2, "حداقل ۲ دوره")
    .max(60, "حداکثر ۶۰ دوره"),
});

export const assignFundTurnSchema = z.object({
  spaceId: z.string().min(1),
  periodIndex: z.number().int().min(1),
  winnerMemberId: z.string().min(1).nullable(),
});

export const setFundPaymentSchema = z.object({
  spaceId: z.string().min(1),
  periodIndex: z.number().int().min(1),
  memberId: z.string().min(1),
  /** true = mark paid (must equal expected share); false = remove payment */
  paid: z.boolean(),
  /** Optional; when set must equal expectedPaymentForShare exactly */
  amount: z.number().int().min(1).optional(),
});

const proofMime = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const createFundProofUploadIntentSchema = z.object({
  spaceId: z.string().min(1),
  periodIndex: z.number().int().min(1),
  mimeType: proofMime,
  byteSize: z
    .number()
    .int()
    .positive()
    .max(8 * 1024 * 1024, { message: "حجم فایل حداکثر ۸ مگابایت است." }),
  note: z.string().trim().max(200).nullable().optional(),
});

export const confirmFundProofUploadSchema = z.object({
  spaceId: z.string().min(1),
  proofId: z.string().min(1),
});

export const reviewFundProofSchema = z.object({
  spaceId: z.string().min(1),
  proofId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(300).nullable().optional(),
});

export type UpsertFundPlanInput = z.infer<typeof upsertFundPlanSchema>;
export type AssignFundTurnInput = z.infer<typeof assignFundTurnSchema>;
export type SetFundPaymentInput = z.infer<typeof setFundPaymentSchema>;
export type CreateFundProofUploadIntentInput = z.infer<
  typeof createFundProofUploadIntentSchema
>;
export type ConfirmFundProofUploadInput = z.infer<
  typeof confirmFundProofUploadSchema
>;
export type ReviewFundProofInput = z.infer<typeof reviewFundProofSchema>;
