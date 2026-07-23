import type { ExpenseCategory } from "@/lib/generated/prisma/enums";

export type { ExpenseCategory };

const CATEGORY_KEYWORDS: Record<
  Exclude<ExpenseCategory, "OTHER">,
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
  ],
};

const CATEGORY_ORDER: Exclude<ExpenseCategory, "OTHER">[] = [
  "FOOD",
  "TRANSPORT",
  "ACCOMMODATION",
  "ENTERTAINMENT",
  "SHOPPING",
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  ...CATEGORY_ORDER,
  "OTHER",
];

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  FOOD: "خوراک",
  TRANSPORT: "حمل‌ونقل",
  ACCOMMODATION: "اقامت",
  ENTERTAINMENT: "تفریح",
  SHOPPING: "خرید",
  OTHER: "سایر",
};

export const CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  FOOD: "🍔",
  TRANSPORT: "🚗",
  ACCOMMODATION: "🏠",
  ENTERTAINMENT: "🎟️",
  SHOPPING: "🛍️",
  OTHER: "📦",
};

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
 * First matching keyword wins (scanned in CATEGORY_ORDER).
 */
export function guessCategoryFromTitle(title: string): ExpenseCategory {
  const normalized = normalizeCategoryTitle(title);
  if (!normalized) return "OTHER";

  for (const category of CATEGORY_ORDER) {
    for (const keyword of CATEGORY_KEYWORDS[category]) {
      const needle = normalizeCategoryTitle(keyword);
      if (needle && normalized.includes(needle)) {
        return category;
      }
    }
  }

  return "OTHER";
}
