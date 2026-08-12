import { z } from "zod";
import { MAX_SHARE, MIN_SHARE } from "@/lib/money";

export const splitModeSchema = z.enum(["EQUAL", "EXACT", "PERCENT"]);

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
  /** Weight for EQUAL mode; EXACT/PERCENT store DEFAULT_SHARE on the server. */
  share: z.number().int().min(MIN_SHARE).max(MAX_SHARE),
  /** Whole percent for PERCENT mode (0–100). Ignored otherwise. */
  percent: z.number().int().min(0).max(100),
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
    /**
     * BUILDING HYBRID: unit ids included in this expense (snapshot).
     * Omitted / null → server defaults to all active units.
     * Ignored for ALL / FIXED (server resolves from settings).
     */
    includedUnitIds: z.array(z.string().min(1)).max(200).optional().nullable(),
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

    if (data.splitMode === "PERCENT") {
      if (selected.some((row) => !Number.isInteger(row.percent) || row.percent < 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "درصد هر نفر باید عدد صحیح باشد.",
          path: ["splits"],
        });
        return;
      }
      if (selected.some((row) => row.percent < 1)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "درصد هر نفر انتخاب‌شده باید حداقل ۱ باشد.",
          path: ["splits"],
        });
        return;
      }
      const percentSum = selected.reduce((acc, s) => acc + s.percent, 0);
      if (percentSum !== 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `جمع درصدها (${percentSum}) باید ۱۰۰ باشد.`,
          path: ["splits"],
        });
      }
      return;
    }

    // EXACT
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
