import type { ExpenseCategory } from "@/lib/generated/prisma/enums";
import type { TransactionType } from "@/lib/generated/prisma/enums";

export type { ExpenseCategory, TransactionType };

/** Spend categories (Trip / Partner / Personal expense side). */
const EXPENSE_KEYWORDS: Record<
  Exclude<ExpenseCategory, "OTHER" | "SALARY" | "TRANSFER" | "OTHER_INCOME">,
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
    "آب",
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
    "پمپ",
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
    "پارک",
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

const INCOME_KEYWORDS: Record<
  Exclude<ExpenseCategory, "OTHER" | "FOOD" | "TRANSPORT" | "ACCOMMODATION" | "ENTERTAINMENT" | "SHOPPING">,
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

export const INCOME_CATEGORIES: ExpenseCategory[] = [
  ...INCOME_ORDER,
];

/** @deprecated Prefer SPEND_CATEGORIES — kept for Trip/Partner callers */
export const EXPENSE_CATEGORIES = SPEND_CATEGORIES;

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  FOOD: "خوراک",
  TRANSPORT: "حمل‌ونقل",
  ACCOMMODATION: "اقامت",
  ENTERTAINMENT: "تفریح",
  SHOPPING: "خرید",
  OTHER: "سایر",
  SALARY: "حقوق",
  TRANSFER: "واریز / انتقال",
  OTHER_INCOME: "سایر درآمد",
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
};

export function categoriesForType(
  type: TransactionType,
): ExpenseCategory[] {
  return type === "INCOME" ? INCOME_CATEGORIES : SPEND_CATEGORIES;
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

/**
 * Local heuristic categorizer — no external AI.
 * Income and expense keyword sets are separate to avoid collisions (e.g. اجاره).
 */
export function guessCategoryFromTitle(
  title: string,
  transactionType: TransactionType = "EXPENSE",
): ExpenseCategory {
  const normalized = normalizeCategoryTitle(title);
  if (!normalized) {
    return transactionType === "INCOME" ? "OTHER_INCOME" : "OTHER";
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
