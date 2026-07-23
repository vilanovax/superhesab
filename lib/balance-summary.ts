import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from "@/lib/categorizer";
import type { SimplifiedSettlement } from "@/lib/debtSimplification";
import { formatCurrency } from "@/lib/formatters";
import { maybeCeilToThousand } from "@/lib/money";

export type SummaryExpense = {
  category: ExpenseCategory;
  totalAmount: number;
};

export type SummaryMember = {
  userId: string;
  name: string | null;
  phone: string;
  isVirtual?: boolean;
};

function memberDisplayName(
  member: SummaryMember | undefined,
  userId: string,
  currentUserId?: string,
): string {
  if (currentUserId && userId === currentUserId) return "من";
  if (!member) return userId.slice(0, 6);
  const name = member.name?.trim();
  if (name) return name.split(/\s+/)[0] ?? name;
  if (member.isVirtual) return "همسفر";
  return "بدون نام";
}

export function buildBalanceSummaryText(input: {
  spaceName: string;
  expenses: SummaryExpense[];
  members: SummaryMember[];
  suggestions: SimplifiedSettlement[];
  currentUserId?: string;
  roundUpToThousand?: boolean;
}): string {
  const {
    spaceName,
    expenses,
    members,
    suggestions,
    currentUserId,
    roundUpToThousand = false,
  } = input;

  const total = expenses.reduce((sum, e) => sum + e.totalAmount, 0);
  const byCategory = Object.fromEntries(
    EXPENSE_CATEGORIES.map((c) => [c, 0]),
  ) as Record<ExpenseCategory, number>;

  for (const expense of expenses) {
    byCategory[expense.category] =
      (byCategory[expense.category] ?? 0) + expense.totalAmount;
  }

  const membersById = Object.fromEntries(
    members.map((m) => [m.userId, m]),
  ) as Record<string, SummaryMember>;

  const lines: string[] = [
    `📊 بیلان فضا: ${spaceName}`,
    `مجموع هزینه‌ها: ${formatCurrency(total)}`,
    "",
    "--- خلاصه هزینه‌ها ---",
  ];

  for (const category of EXPENSE_CATEGORIES) {
    const sum = byCategory[category] ?? 0;
    if (sum <= 0) continue;
    lines.push(
      `${CATEGORY_EMOJI[category]} ${CATEGORY_LABELS[category]}: ${formatCurrency(sum)}`,
    );
  }

  if (lines[lines.length - 1] === "--- خلاصه هزینه‌ها ---") {
    lines.push("هنوز هزینه‌ای ثبت نشده.");
  }

  lines.push("", "--- تسویه‌های پیشنهادی ---");

  if (suggestions.length === 0) {
    lines.push("حساب‌ها صاف است ✅");
  } else {
    for (const s of suggestions) {
      const amount = maybeCeilToThousand(s.amount, roundUpToThousand);
      const from = memberDisplayName(
        membersById[s.fromUserId],
        s.fromUserId,
        currentUserId,
      );
      const to = memberDisplayName(
        membersById[s.toUserId],
        s.toUserId,
        currentUserId,
      );
      lines.push(`🔸 ${from} باید ${formatCurrency(amount)} به ${to} پرداخت کند.`);
    }
  }

  lines.push("", "— SuperHesab");
  return lines.join("\n");
}
