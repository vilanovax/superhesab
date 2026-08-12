import { z } from "zod";
import { expenseCategorySchema } from "@/lib/validations/expense";

export const buildingScopeModeSchema = z.enum(["ALL", "FIXED", "HYBRID"]);
export const buildingUnitRuleSchema = z.enum(["INCLUDE", "EXCLUDE"]);

export const setBuildingCategoryScopeSchema = z
  .object({
    spaceId: z.string().min(1),
    category: expenseCategorySchema,
    mode: buildingScopeModeSchema,
    unitRule: buildingUnitRuleSchema.default("EXCLUDE"),
    unitIds: z.array(z.string().min(1)).max(200).default([]),
  })
  .superRefine((data, ctx) => {
    if (
      data.category !== "BUILDING_BILLS" &&
      data.category !== "BUILDING_ELEVATOR" &&
      data.category !== "BUILDING_CLEANING" &&
      data.category !== "BUILDING_MAINTENANCE" &&
      data.category !== "BUILDING_GARDENING" &&
      data.category !== "BUILDING_SALARY"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "فقط دسته‌های هزینه مشاع ساختمان قابل تنظیم‌اند.",
        path: ["category"],
      });
    }
    if (data.mode === "FIXED" && data.unitIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          data.unitRule === "INCLUDE"
            ? "حداقل یک واحد مشمول انتخاب کنید."
            : "حداقل یک واحد برای حذف از لیست انتخاب کنید.",
        path: ["unitIds"],
      });
    }
  });

export type SetBuildingCategoryScopeInput = z.infer<
  typeof setBuildingCategoryScopeSchema
>;
