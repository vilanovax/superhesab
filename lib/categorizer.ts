import type { ExpenseCategory } from "@/lib/generated/prisma/enums";
import type { TransactionType } from "@/lib/generated/prisma/enums";

export type { ExpenseCategory, TransactionType };

/** Spend categories (Trip / Partner / Personal expense side). */
const EXPENSE_KEYWORDS: Record<
  Exclude<
    ExpenseCategory,
    | "OTHER"
    | "SALARY"
    | "TRANSFER"
    | "OTHER_INCOME"
    | "BUILDING_BILLS"
    | "BUILDING_ELEVATOR"
    | "BUILDING_CLEANING"
    | "BUILDING_MAINTENANCE"
    | "BUILDING_GARDENING"
    | "BUILDING_SALARY"
  >,
  readonly string[]
> = {
  FOOD: [
    "رستوران",
    "کافه",
    "شام",
    "ناهار",
    "صبحانه",
    "پیتزا",
    "کباب",
    "قهوه",
    "سوپر",
    "خوراکی",
    "آب معدنی",
    "گوشت",
    "مرغ",
    "جوجه",
    "غذا",
    "فست‌فود",
    "فست فود",
    "صبحونه",
  ],
  TRANSPORT: [
    "اسنپ",
    "تپسی",
    "کرایه",
    "بنزین",
    "پمپ بنزین",
    "قطار",
    "هواپیما",
    "بلیت",
    "بلیط",
    "پارکینگ",
    "عوارض",
    "تاکسی",
    "مترو",
    "اتوبوس",
  ],
  ACCOMMODATION: [
    "ویلا",
    "هتل",
    "اقامتگاه",
    "رزرو",
    "سوئیت",
    "بوم‌گردی",
    "بوم گردی",
    "خانه",
    "اجاره",
    "خوابگاه",
  ],
  ENTERTAINMENT: [
    "سینما",
    "تئاتر",
    "بازی",
    "تفریح",
    "قایق",
    "تله‌کابین",
    "تله کابین",
    "موزه",
    "شهربازی",
    "کنسرت",
  ],
  SHOPPING: [
    "خرید",
    "پاساژ",
    "لباس",
    "بازار",
    "هدیه",
    "سوغات",
    "سوغاتی",
    "مال",
    "کتاب",
    "کتابفروشی",
  ],
};

/**
 * BUILDING shared-cost dictionary — used only when `{ building: true }`.
 * Longer / more specific keywords should be listed earlier within each group
 * when order matters; groups are checked in BUILDING_ORDER.
 */
const BUILDING_KEYWORDS: Record<
  | "BUILDING_BILLS"
  | "BUILDING_ELEVATOR"
  | "BUILDING_CLEANING"
  | "BUILDING_MAINTENANCE"
  | "BUILDING_GARDENING"
  | "BUILDING_SALARY",
  readonly string[]
> = {
  BUILDING_BILLS: [
    "قبض برق",
    "قبض آب",
    "قبض گاز",
    "آب و فاضلاب",
    "آب مشاع",
    "برق مشاع",
    "گاز مشاع",
    "گاز موتورخانه",
    "قبض",
    "تلفن",
    "اینترنت لابی",
  ],
  BUILDING_ELEVATOR: [
    "بیمه آسانسور",
    "سرویس آسانسور",
    "تعمیر آسانسور",
    "آسانسور",
    "کابین",
  ],
  BUILDING_CLEANING: [
    "مواد شوینده",
    "لوازم نظافت",
    "تمیزکاری",
    "نظافت",
    "شوینده",
    "راه‌پله",
    "راه پله",
    "جارو",
    "تی",
  ],
  BUILDING_MAINTENANCE: [
    "موتورخانه",
    "پمپ آب",
    "درب پارکینگ",
    "ایزوگام",
    "آیفون",
    "تاسیسات",
    "تعمیر",
    "سرویس",
    "پمپ",
    "قفل",
    "لوله",
    "لامپ",
    "درب",
    "پارکینگ",
    "دوربین",
    "کپسول آتش",
    "آتش‌نشانی",
    "آتش نشانی",
    "رنگ‌آمیزی",
    "رنگ امیزی",
    "سم‌پاشی",
    "سم پاشی",
  ],
  BUILDING_GARDENING: [
    "باغبانی",
    "باغبان",
    "باغچه",
    "حیاط",
    "گیاه",
    "کود",
    "خاک",
    "درخت",
    "گل",
  ],
  BUILDING_SALARY: [
    "حقوق سرایدار",
    "حقوق نگهبان",
    "سرایدار",
    "نگهبان",
    "حقوق",
    "پاداش",
    "عیدی",
    "دستمزد",
  ],
};

const BUILDING_ORDER: (keyof typeof BUILDING_KEYWORDS)[] = [
  "BUILDING_ELEVATOR", // before generic «تعمیر» / «بیمه»
  "BUILDING_SALARY",
  "BUILDING_BILLS",
  "BUILDING_CLEANING",
  "BUILDING_GARDENING",
  "BUILDING_MAINTENANCE",
];

const INCOME_KEYWORDS: Record<
  Exclude<
    ExpenseCategory,
    | "OTHER"
    | "FOOD"
    | "TRANSPORT"
    | "ACCOMMODATION"
    | "ENTERTAINMENT"
    | "SHOPPING"
    | "BUILDING_BILLS"
    | "BUILDING_ELEVATOR"
    | "BUILDING_CLEANING"
    | "BUILDING_MAINTENANCE"
    | "BUILDING_GARDENING"
    | "BUILDING_SALARY"
  >,
  readonly string[]
> = {
  SALARY: [
    "حقوق",
    "حقوقی",
    "دستمزد",
    "پاداش",
    "عیدی",
    "بونوس",
    "کارانه",
    "مزایا",
  ],
  TRANSFER: [
    "واریزی",
    "واریز",
    "کارت به کارت",
    "کارت‌به‌کارت",
    "انتقال",
    "دریافتی",
    "برگشت",
    "بازپرداخت",
  ],
  OTHER_INCOME: ["فروش", "درآمد", "سود", "سود سهام", "یارانه", "کمک"],
};

const EXPENSE_ORDER: (keyof typeof EXPENSE_KEYWORDS)[] = [
  "FOOD",
  "TRANSPORT",
  "ACCOMMODATION",
  "ENTERTAINMENT",
  "SHOPPING",
];

const INCOME_ORDER: (keyof typeof INCOME_KEYWORDS)[] = [
  "SALARY",
  "TRANSFER",
  "OTHER_INCOME",
];

export const SPEND_CATEGORIES: ExpenseCategory[] = [
  ...EXPENSE_ORDER,
  "OTHER",
];

export const INCOME_CATEGORIES: ExpenseCategory[] = [...INCOME_ORDER];

/** Standard BUILDING shared-cost categories (+ OTHER for misc). */
export const BUILDING_CATEGORIES: ExpenseCategory[] = [
  "BUILDING_BILLS",
  "BUILDING_ELEVATOR",
  "BUILDING_CLEANING",
  "BUILDING_MAINTENANCE",
  "BUILDING_GARDENING",
  "BUILDING_SALARY",
  "OTHER",
];

/** @deprecated Prefer SPEND_CATEGORIES — kept for Trip/Partner callers */
export const EXPENSE_CATEGORIES = SPEND_CATEGORIES;

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  FOOD: "خوراک",
  TRANSPORT: "حمل‌ونقل",
  ACCOMMODATION: "اقامت",
  ENTERTAINMENT: "تفریح",
  SHOPPING: "خرید",
  OTHER: "متفرقه",
  SALARY: "حقوق",
  TRANSFER: "واریز / انتقال",
  OTHER_INCOME: "سایر درآمد",
  BUILDING_BILLS: "قبوض",
  BUILDING_ELEVATOR: "آسانسور",
  BUILDING_CLEANING: "نظافت",
  BUILDING_MAINTENANCE: "تاسیسات و تعمیرات",
  BUILDING_GARDENING: "باغبانی",
  BUILDING_SALARY: "حقوق و دستمزد",
};

export const CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  FOOD: "🍔",
  TRANSPORT: "🚗",
  ACCOMMODATION: "🏠",
  ENTERTAINMENT: "🎟️",
  SHOPPING: "🛍️",
  OTHER: "📦",
  SALARY: "💼",
  TRANSFER: "💳",
  OTHER_INCOME: "💰",
  BUILDING_BILLS: "🧾",
  BUILDING_ELEVATOR: "🛗",
  BUILDING_CLEANING: "🧹",
  BUILDING_MAINTENANCE: "🔧",
  BUILDING_GARDENING: "🌿",
  BUILDING_SALARY: "👷",
};

/** @deprecated Labels are now on CATEGORY_LABELS — kept for call sites. */
export const BUILDING_CATEGORY_LABELS: Partial<
  Record<ExpenseCategory, string>
> = {
  BUILDING_BILLS: CATEGORY_LABELS.BUILDING_BILLS,
  BUILDING_ELEVATOR: CATEGORY_LABELS.BUILDING_ELEVATOR,
  BUILDING_CLEANING: CATEGORY_LABELS.BUILDING_CLEANING,
  BUILDING_MAINTENANCE: CATEGORY_LABELS.BUILDING_MAINTENANCE,
  BUILDING_GARDENING: CATEGORY_LABELS.BUILDING_GARDENING,
  BUILDING_SALARY: CATEGORY_LABELS.BUILDING_SALARY,
  OTHER: CATEGORY_LABELS.OTHER,
};

export function categoriesForType(
  type: TransactionType,
): ExpenseCategory[] {
  return type === "INCOME" ? INCOME_CATEGORIES : SPEND_CATEGORIES;
}

/** Building picker / smart-chip options. */
export function categoriesForBuilding(): ExpenseCategory[] {
  return BUILDING_CATEGORIES;
}

/**
 * Categories allowed for create/update validation.
 * Building spaces use the shared-cost dictionary; others follow INCOME/EXPENSE.
 */
export function allowedCategoriesForSpace(opts: {
  buildingCharges: boolean;
  transactionType: TransactionType;
}): ExpenseCategory[] {
  if (opts.buildingCharges) return categoriesForBuilding();
  return categoriesForType(opts.transactionType);
}

/** Normalize Persian titles for keyword matching. */
export function normalizeCategoryTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\u200c/g, "") // ZWNJ
    .replace(/\u200d/g, "") // ZWJ
    .replace(/\s+/g, " ");
}

export type GuessCategoryOptions = {
  /** Prefer building shared-cost dictionary only. */
  building?: boolean;
};

/**
 * Local heuristic categorizer — no external AI.
 * Building mode uses only the BUILDING_* dictionary (+ OTHER fallback).
 */
export function guessCategoryFromTitle(
  title: string,
  transactionType: TransactionType = "EXPENSE",
  opts?: GuessCategoryOptions,
): ExpenseCategory {
  const normalized = normalizeCategoryTitle(title);
  if (!normalized) {
    return transactionType === "INCOME" ? "OTHER_INCOME" : "OTHER";
  }

  if (opts?.building) {
    for (const category of BUILDING_ORDER) {
      const words = [...BUILDING_KEYWORDS[category]].sort(
        (a, b) => b.length - a.length,
      );
      for (const keyword of words) {
        const needle = normalizeCategoryTitle(keyword);
        if (needle && normalized.includes(needle)) {
          return category;
        }
      }
    }
    return "OTHER";
  }

  if (transactionType === "INCOME") {
    for (const category of INCOME_ORDER) {
      for (const keyword of INCOME_KEYWORDS[category]) {
        const needle = normalizeCategoryTitle(keyword);
        if (needle && normalized.includes(needle)) {
          return category;
        }
      }
    }
    return "OTHER_INCOME";
  }

  for (const category of EXPENSE_ORDER) {
    for (const keyword of EXPENSE_KEYWORDS[category]) {
      const needle = normalizeCategoryTitle(keyword);
      if (needle && normalized.includes(needle)) {
        return category;
      }
    }
  }

  return "OTHER";
}
