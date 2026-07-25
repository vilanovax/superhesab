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

export type UpsertFundPlanInput = z.infer<typeof upsertFundPlanSchema>;
export type AssignFundTurnInput = z.infer<typeof assignFundTurnSchema>;
export type SetFundPaymentInput = z.infer<typeof setFundPaymentSchema>;
