import { formatDateFa, formatMoney, memberLabel } from "@/lib/format";

export type ExpenseListItem = {
  id: string;
  title: string;
  totalAmount: number;
  date: Date;
  paidBy: { name: string | null; phone: string };
};

export function ExpenseList({ expenses }: { expenses: ExpenseListItem[] }) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          هنوز هزینه‌ای ثبت نشده. اولین هزینه را اضافه کنید.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {expenses.map((expense) => (
        <li
          key={expense.id}
          className="rounded-lg border border-border bg-card px-4 py-3 shadow-none"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium text-foreground">
                {expense.title}
              </p>
              <p className="text-xs text-muted-foreground">
                پرداخت: {memberLabel(expense.paidBy)} ·{" "}
                {formatDateFa(expense.date)}
              </p>
            </div>
            <p
              className="shrink-0 text-sm font-semibold text-foreground"
              dir="ltr"
            >
              {formatMoney(expense.totalAmount)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
