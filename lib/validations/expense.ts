import { z } from "zod";

export const splitModeSchema = z.enum(["EQUAL", "EXACT"]);

export const expenseSplitRowSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().min(0),
  selected: z.boolean(),
});

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ نامعتبر است.");

export const expenseSchema = z
  .object({
    spaceId: z.string().min(1),
    title: z.string().trim().min(2, "عنوان حداقل ۲ کاراکتر باشد."),
    totalAmount: z.number().int().min(1, "مبلغ باید حداقل ۱ باشد."),
    paidById: z.string().min(1, "پرداخت‌کننده را انتخاب کنید."),
    /** Expense calendar day as yyyy-mm-dd (Tehran). */
    date: isoDateSchema,
    splitMode: splitModeSchema,
    splits: z.array(expenseSplitRowSchema).min(1),
  })
  .superRefine((data, ctx) => {
    const selected = data.splits.filter((s) => s.selected);

    if (selected.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "حداقل یک نفر باید در تسهیم باشد.",
        path: ["splits"],
      });
      return;
    }

    if (data.splitMode === "EXACT") {
      const sum = selected.reduce((acc, s) => acc + s.amount, 0);
      if (sum !== data.totalAmount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `جمع سهم‌ها (${sum}) باید برابر مبلغ کل (${data.totalAmount}) باشد.`,
          path: ["splits"],
        });
      }
    }
  });

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
export type SplitMode = z.infer<typeof splitModeSchema>;
