"use client";

import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

type PersonalEmptyStateProps = {
  canMutate: boolean;
};

export function PersonalEmptyState({ canMutate }: PersonalEmptyStateProps) {
  const openExpenseForm = useUiStore((s) => s.openExpenseForm);

  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm">
      <div className="relative px-5 pb-5 pt-6 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-primary/5 blur-2xl"
        />
        <div className="relative mx-auto flex size-16 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-primary/15 to-highlight/10 text-primary ring-1 ring-primary/10">
          <svg viewBox="0 0 48 48" className="size-9" fill="none" aria-hidden>
            <rect
              x="10"
              y="12"
              width="28"
              height="24"
              rx="5"
              stroke="currentColor"
              strokeWidth="2.25"
              opacity="0.9"
            />
            <path
              d="M16 20h16M16 26h10"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
            />
            <circle cx="33" cy="14" r="7" fill="var(--card)" />
            <circle cx="33" cy="14" r="6" fill="currentColor" opacity="0.15" />
            <path
              d="M33 11v6M30 14h6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <p className="relative mt-4 text-body font-semibold text-foreground">
          دفتر ماه آماده‌ست
        </p>
        <p className="relative mx-auto mt-1.5 max-w-[17rem] text-body-sm leading-relaxed text-muted-foreground">
          {canMutate
            ? "از دکمه پایین، درآمد یا هزینه ثبت کنید. خلاصه بالا خودکار به‌روز می‌شود."
            : "هنوز تراکنشی ثبت نشده."}
        </p>

        {canMutate ? (
          <div className="relative mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => openExpenseForm({ transactionType: "EXPENSE" })}
              className={cn(
                "rounded-2xl border border-border/60 bg-background/80 px-3 py-3 text-start transition-colors",
                "hover:border-destructive/30 hover:bg-destructive-soft/40 active:scale-[0.98]",
              )}
            >
              <span className="block text-body-sm font-bold text-destructive">
                هزینه
              </span>
              <span className="mt-0.5 block text-caption text-muted-foreground">
                خرید، قبض، …
              </span>
            </button>
            <button
              type="button"
              onClick={() => openExpenseForm({ transactionType: "INCOME" })}
              className={cn(
                "rounded-2xl border border-border/60 bg-background/80 px-3 py-3 text-start transition-colors",
                "hover:border-success/30 hover:bg-success-soft/50 active:scale-[0.98]",
              )}
            >
              <span className="block text-body-sm font-bold text-success">
                درآمد
              </span>
              <span className="mt-0.5 block text-caption text-muted-foreground">
                حقوق، واریز، …
              </span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
