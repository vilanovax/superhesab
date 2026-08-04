"use client";

import { useEffect, useMemo, useState } from "react";
import { CategoryIcon } from "@/components/expenses/category-icon";
import { formatCategoryWithTag } from "@/lib/building-bill-tags";
import { CATEGORY_LABELS } from "@/lib/categorizer";
import {
  currencyLabel,
  formatDateFaShort,
  formatMoney,
  type SpaceCurrency,
} from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import type { ReportExpenseLine } from "@/lib/reports";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type SortKey = "amount" | "date";
type SortDir = "desc" | "asc";

type BuildingAllExpensesDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseLines: ReportExpenseLine[];
  currency: SpaceCurrency;
  periodLabel?: string;
};

function categoryLine(line: ReportExpenseLine): string {
  if (line.category === "OTHER" || line.category === "OTHER_INCOME") {
    return line.categoryLabel?.trim() || CATEGORY_LABELS[line.category];
  }
  return formatCategoryWithTag(
    CATEGORY_LABELS[line.category],
    line.categoryLabel,
  );
}

function sortHint(key: SortKey, dir: SortDir): string {
  if (key === "amount") {
    return dir === "desc" ? "گران‌ترین اول" : "ارزان‌ترین اول";
  }
  return dir === "desc" ? "جدیدترین اول" : "قدیمی‌ترین اول";
}

/**
 * Full period expense list with amount / date sort — opened from گزارش rankings.
 */
export function BuildingAllExpensesDrawer({
  open,
  onOpenChange,
  expenseLines,
  currency,
  periodLabel,
}: BuildingAllExpensesDrawerProps) {
  const [sortKey, setSortKey] = useState<SortKey>("amount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    if (!open) return;
    setSortKey("amount");
    setSortDir("desc");
  }, [open]);

  const sorted = useMemo(() => {
    const rows = [...expenseLines];
    rows.sort((a, b) => {
      if (sortKey === "amount") {
        const byAmount =
          sortDir === "desc"
            ? b.totalAmount - a.totalAmount
            : a.totalAmount - b.totalAmount;
        if (byAmount !== 0) return byAmount;
        return b.date.localeCompare(a.date);
      }
      const byDate =
        sortDir === "desc"
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return b.totalAmount - a.totalAmount;
    });
    return rows;
  }, [expenseLines, sortKey, sortDir]);

  function pickSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setSortDir("desc");
  }

  const total = useMemo(
    () => expenseLines.reduce((s, e) => s + e.totalAmount, 0),
    [expenseLines],
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent className="mt-0! flex max-h-[92dvh] flex-col gap-0 overflow-hidden border-border/50 bg-background p-0">
        {/* Hero header */}
        <div className="surface-hero shrink-0 px-4 pb-3 pt-1">
          <DrawerHeader className="space-y-1 p-0 text-start">
            <DrawerTitle className="text-title font-bold tracking-tight text-on-hero">
              همه هزینه‌ها
            </DrawerTitle>
            <DrawerDescription className="text-caption text-on-hero/70">
              {periodLabel ? `${periodLabel} · ` : null}
              {formatMoney(expenseLines.length)} مورد
            </DrawerDescription>
          </DrawerHeader>
          <div className="mt-3 flex items-end justify-between gap-3 rounded-2xl bg-on-hero/10 px-3 py-2.5">
            <div>
              <p className="text-micro font-medium text-on-hero/65">جمع بازه</p>
              <p className="mt-0.5 text-body font-bold tabular-nums text-on-hero">
                {formatCurrency(total, currency)}
              </p>
            </div>
            <p className="pb-0.5 text-micro font-semibold text-on-hero/75">
              {sortHint(sortKey, sortDir)}
            </p>
          </div>
        </div>

        {/* Sort control */}
        <div className="shrink-0 border-b border-border/40 bg-card px-3 py-2.5">
          <div
            role="group"
            aria-label="مرتب‌سازی"
            className="grid grid-cols-2 gap-1 rounded-2xl bg-muted/70 p-1"
          >
            <SortTab
              label="مبلغ"
              hint={
                sortKey === "amount"
                  ? sortDir === "desc"
                    ? "زیاد ← کم"
                    : "کم ← زیاد"
                  : "سورت بر اساس مبلغ"
              }
              active={sortKey === "amount"}
              dir={sortKey === "amount" ? sortDir : null}
              onClick={() => pickSort("amount")}
            />
            <SortTab
              label="تاریخ"
              hint={
                sortKey === "date"
                  ? sortDir === "desc"
                    ? "جدید ← قدیم"
                    : "قدیم ← جدید"
                  : "سورت بر اساس تاریخ"
              }
              active={sortKey === "date"}
              dir={sortKey === "date" ? sortDir : null}
              onClick={() => pickSort("date")}
            />
          </div>
        </div>

        {/* List */}
        {sorted.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-body-sm font-semibold text-foreground">
              هزینه‌ای در این بازه نیست
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
              با ثبت هزینه مشاع، اینجا پر می‌شود.
            </p>
          </div>
        ) : (
          <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3 py-2.5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {sorted.map((line, index) => {
              const highlight =
                sortKey === "amount" && sortDir === "desc" && index < 3;
              return (
                <li
                  key={line.id}
                  className={cn(
                    "flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 transition-colors",
                    highlight
                      ? "border-primary/20 bg-primary/5"
                      : "border-border/40 bg-card",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-xl text-micro font-bold tabular-nums",
                      highlight
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/80 text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                  <CategoryIcon
                    category={line.category}
                    className="size-9 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-semibold text-foreground">
                      {line.title}
                    </p>
                    <p className="mt-0.5 truncate text-micro text-muted-foreground">
                      {categoryLine(line)}
                      <span className="mx-1 opacity-40">·</span>
                      {formatDateFaShort(line.date)}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p
                      className={cn(
                        "text-caption font-bold tabular-nums",
                        highlight ? "text-primary" : "text-foreground",
                      )}
                    >
                      {formatMoney(line.totalAmount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {currencyLabel(currency)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function SortTab({
  label,
  hint,
  active,
  dir,
  onClick,
}: {
  label: string;
  hint: string;
  active: boolean;
  dir: SortDir | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      aria-pressed={active}
      className={cn(
        "flex h-11 flex-col items-center justify-center rounded-xl transition-all active:scale-[0.98]",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span className="flex items-center gap-1 text-caption font-bold">
        {label}
        {dir ? (
          <span className="text-micro font-semibold text-primary" aria-hidden>
            {dir === "desc" ? "↓" : "↑"}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "text-[10px]",
          active ? "text-muted-foreground" : "text-muted-foreground/70",
        )}
      >
        {active ? hint : "بزن برای سورت"}
      </span>
    </button>
  );
}
