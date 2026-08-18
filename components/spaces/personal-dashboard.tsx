import Link from "next/link";
import { currencyLabel, formatMoney, type SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import {
  budgetRemaining,
  budgetUsedPercent,
  paceVsBudget,
} from "@/lib/personal";
import { cn } from "@/lib/utils";

type PersonalMonthHeroProps = {
  income: number;
  expenses: number;
  monthlyBudget: number | null;
  currency: SpaceCurrency;
  settingsHref: string;
  /** خانه / FAMILY — empty-month copy without fake zeros. */
  household?: boolean;
};

function SignedAmount({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      dir="ltr"
      className={cn(
        "inline-block [unicode-bidi:isolate] tabular-nums",
        className,
      )}
    >
      {value >= 0 ? "+" : "−"}
      {formatMoney(Math.abs(value))}
    </span>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 12.5V3.5M8 3.5 4.5 7M8 3.5 11.5 7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 3.5v9M8 12.5 4.5 9M8 12.5 11.5 9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GearMiniIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 3.5v1.5M10 15v1.5M3.5 10h1.5M15 10h1.5M5.4 5.4l1.1 1.1M13.5 13.5l1.1 1.1M5.4 14.6l1.1-1.1M13.5 6.5l1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PersonalMonthHero({
  income,
  expenses,
  monthlyBudget,
  currency,
  settingsHref,
  household = false,
}: PersonalMonthHeroProps) {
  const net = income - expenses;
  const usedPct = budgetUsedPercent(expenses, monthlyBudget);
  const remaining = budgetRemaining(expenses, monthlyBudget);
  const overBudget = remaining != null && remaining < 0;
  const hasBudget = monthlyBudget != null && monthlyBudget > 0 && usedPct != null;
  const pace = paceVsBudget(expenses, monthlyBudget);
  const unit = currencyLabel(currency);
  const clampedPct = hasBudget ? Math.min(100, usedPct!) : 0;
  const monthEmpty = income === 0 && expenses === 0;

  if (monthEmpty && !hasBudget) {
    if (household) return null;
    return (
      <p className="text-pretty text-body-sm leading-relaxed text-on-hero/78">
        خالص، درآمد و هزینه بعد از ثبت همین‌جا می‌آید.
      </p>
    );
  }

  return (
    <div className="space-y-3.5">
      {!monthEmpty ? (
        <>
          <div className="text-center">
            <p className="text-[0.6875rem] font-medium tracking-wide text-on-hero/55">
              خالص ماه
            </p>
            <p
              className={cn(
                "mt-1.5 text-pretty text-[2rem] font-bold leading-none tracking-tight",
                net >= 0 ? "text-on-hero" : "text-[#ffd0d0]",
              )}
            >
              <SignedAmount value={net} />
            </p>
            <p className="mt-1.5 text-caption font-medium text-on-hero/55">
              {unit}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-black/15 px-3 py-2.5 backdrop-blur-[2px]">
              <div className="flex items-center gap-1.5 text-emerald-200/90">
                <span className="flex size-5 items-center justify-center rounded-md bg-emerald-300/20">
                  <ArrowUpIcon className="size-3" />
                </span>
                <span className="text-[0.6875rem] font-semibold">درآمد</span>
              </div>
              <p className="mt-1.5 truncate text-[0.9375rem] font-bold tabular-nums leading-none text-on-hero">
                {formatMoney(income)}
              </p>
              <p className="mt-1 text-micro text-on-hero/50">{unit}</p>
            </div>
            <div className="rounded-2xl bg-black/15 px-3 py-2.5 backdrop-blur-[2px]">
              <div className="flex items-center gap-1.5 text-rose-200/90">
                <span className="flex size-5 items-center justify-center rounded-md bg-rose-300/20">
                  <ArrowDownIcon className="size-3" />
                </span>
                <span className="text-[0.6875rem] font-semibold">هزینه</span>
              </div>
              <p className="mt-1.5 truncate text-[0.9375rem] font-bold tabular-nums leading-none text-on-hero">
                {formatMoney(expenses)}
              </p>
              <p className="mt-1 text-micro text-on-hero/50">{unit}</p>
            </div>
          </div>
        </>
      ) : null}

      {hasBudget ? (
        <div className="rounded-2xl bg-black/15 px-3.5 py-3 backdrop-blur-[2px]">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-pretty text-caption font-medium text-on-hero/70">
              بودجه ماه
            </p>
            <p
              className={cn(
                "text-caption font-bold tabular-nums",
                overBudget ? "text-rose-200" : "text-on-hero",
              )}
            >
              {usedPct}%
            </p>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-on-hero/15"
            role="progressbar"
            aria-valuenow={clampedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="مصرف بودجه ماه"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
                overBudget ? "bg-rose-300" : "bg-on-hero",
              )}
              style={{ width: `${clampedPct}%` }}
            />
          </div>
          <p className="mt-2 text-caption leading-relaxed text-on-hero/70">
            {overBudget ? (
              <>
                {formatCurrency(Math.abs(remaining!), currency)} بیش از سقف
              </>
            ) : (
              <>
                {formatMoney(remaining!)} باقی از {formatMoney(monthlyBudget!)}{" "}
                {unit}
              </>
            )}
          </p>
          {expenses > 0 ? (
            <p
              className={cn(
                "mt-1.5 text-caption leading-relaxed",
                pace.overBudget ? "text-rose-200/95" : "text-on-hero/60",
              )}
            >
              با این آهنگ ≈ {formatMoney(pace.projected)} {unit} تا پایان ماه
              {pace.overBudget && pace.overBy != null
                ? ` · حدود ${formatMoney(pace.overBy)} بیش از سقف`
                : ""}
            </p>
          ) : null}
        </div>
      ) : (
        <Link
          href={settingsHref}
          className="group flex items-center gap-3 rounded-2xl bg-on-hero px-3.5 py-3 text-primary shadow-sm transition-[transform,opacity] duration-150 ease-out active:scale-[0.98] hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-hero/50"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <GearMiniIcon className="size-4" />
          </span>
          <span className="min-w-0 flex-1 text-start">
            <span className="block text-pretty text-body-sm font-bold text-primary">
              تعیین سقف بودجه
            </span>
            <span className="mt-0.5 block text-caption text-primary/70">
              برای دیدن نوار مصرف ماه
            </span>
          </span>
          <span
            className="text-body font-bold text-primary/80 transition-transform duration-150 ease-out motion-reduce:transition-none group-hover:-translate-x-0.5"
            aria-hidden="true"
          >
            ←
          </span>
        </Link>
      )}
    </div>
  );
}
