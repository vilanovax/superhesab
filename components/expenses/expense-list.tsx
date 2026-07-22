import { formatDateFa, memberLabel } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { EmptyState } from "@/components/ui/empty-state";

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
      <EmptyState
        icon="expense"
        title="هنوز هزینه‌ای نیست"
        description="با دکمه «ثبت هزینه» اولین خرج سفر را اضافه کنید تا ترازها زنده شوند."
      />
    );
  }

  return (
    <ul className="animate-fade-up space-y-2.5">
      {expenses.map((expense, index) => (
        <li
          key={expense.id}
          className="group relative overflow-hidden rounded-xl border border-border/80 bg-card/90 px-4 py-3.5 backdrop-blur-sm transition-colors hover:border-primary/30"
          style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
        >
          <span
            aria-hidden
            className="absolute inset-y-0 start-0 w-1 bg-gradient-to-b from-primary to-highlight opacity-80"
          />
          <div className="flex items-start justify-between gap-3 ps-2">
            <div className="min-w-0 space-y-1">
              <p className="truncate font-semibold text-foreground">
                {expense.title}
              </p>
              <p className="text-xs text-muted-foreground">
                پرداخت: {memberLabel(expense.paidBy)} ·{" "}
                {formatDateFa(expense.date)}
              </p>
            </div>
            <p className="shrink-0 rounded-lg bg-secondary/80 px-2.5 py-1 text-sm font-bold text-ink tabular-nums">
              {formatCurrency(expense.totalAmount)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
