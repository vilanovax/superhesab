import { z } from "zod";
import { MAX_SHARE, MIN_SHARE } from "@/lib/money";

export const splitModeSchema = z.enum(["EQUAL", "EXACT"]);

export const transactionTypeSchema = z.enum(["EXPENSE", "INCOME"]);

export const expenseCategorySchema = z.enum([
  "FOOD",
  "TRANSPORT",
  "ACCOMMODATION",
  "ENTERTAINMENT",
  "SHOPPING",
  "OTHER",
  "SALARY",
  "TRANSFER",
  "OTHER_INCOME",
  "BUILDING_BILLS",
  "BUILDING_ELEVATOR",
  "BUILDING_CLEANING",
  "BUILDING_MAINTENANCE",
  "BUILDING_GARDENING",
  "BUILDING_SALARY",
]);

export const expenseSplitRowSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().min(0),
  selected: z.boolean(),
  /** Weight for EQUAL mode; EXACT stores 1 on the server. */
  share: z.number().int().min(MIN_SHARE).max(MAX_SHARE),
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
    transactionType: transactionTypeSchema,
    /**
     * Optional on create: when set, server persists + locks.
     * When omitted on create, server infers from title.
     * On edit, changing category locks it.
     */
    category: expenseCategorySchema.optional(),
    /** Freeform custom category name (maps to OTHER / OTHER_INCOME). */
    categoryLabel: z
      .string()
      .trim()
      .min(1)
      .max(40, "نام دسته حداکثر ۴۰ کاراکتر باشد.")
      .optional()
      .nullable(),
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

    if (data.splitMode === "EQUAL") {
      if (selected.some((row) => row.share < MIN_SHARE)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ضریب تسهیم باید حداقل ۰٫۵ باشد.",
          path: ["splits"],
        });
      }
      return;
    }

    if (selected.some((row) => row.amount < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "سهم هر نفر انتخاب‌شده باید بیشتر از صفر باشد.",
        path: ["splits"],
      });
      return;
    }
    const sum = selected.reduce((acc, s) => acc + s.amount, 0);
    if (sum !== data.totalAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `جمع سهم‌ها (${sum}) باید برابر مبلغ کل (${data.totalAmount}) باشد.`,
        path: ["splits"],
      });
    }
  });

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
export type SplitMode = z.infer<typeof splitModeSchema>;
export type TransactionTypeForm = z.infer<typeof transactionTypeSchema>;
