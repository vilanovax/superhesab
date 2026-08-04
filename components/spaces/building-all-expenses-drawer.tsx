"use client";

import { useMemo, useState } from "react";
import { formatCategoryWithTag } from "@/lib/building-bill-tags";
import { CATEGORY_LABELS } from "@/lib/categorizer";
import { formatDateFaShort, type SpaceCurrency } from "@/lib/format";
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
    return (
      line.categoryLabel?.trim() || CATEGORY_LABELS[line.category]
    );
  }
  return formatCategoryWithTag(
    CATEGORY_LABELS[line.category],
    line.categoryLabel,
  );
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

  const sorted = useMemo(() => {
    const rows = [...expenseLines];
    const dir = sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      if (sortKey === "amount") {
        if (a.totalAmount === b.totalAmount) {
          return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
        }
        return a.totalAmount < b.totalAmount ? dir : -dir;
      }
      if (a.date === b.date) {
        return a.totalAmount < b.totalAmount ? 1 : -1;
      }
      return a.date < b.date ? dir : -dir;
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

  const total = expenseLines.reduce((s, e) => s + e.totalAmount, 0);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mt-0! flex max-h-[90dvh] flex-col gap-0 overflow-hidden border-border/50 bg-background p-0">
        <div className="shrink-0 border-b border-border/40 px-4 pb-3 pt-1">
          <DrawerHeader className="space-y-1 p-0 text-start">
            <DrawerTitle className="text-body font-bold text-foreground">
              همه هزینه‌ها
            </DrawerTitle>
            <DrawerDescription className="text-caption text-muted-foreground">
              {periodLabel ? `${periodLabel} · ` : ""}
              {expenseLines.length} مورد · {formatCurrency(total, currency)}
            </DrawerDescription>
          </DrawerHeader>

          <div
            role="group"
            aria-label="مرتب‌سازی"
            className="mt-3 flex items-center gap-1.5"
          >
            <SortChip
              label="مبلغ"
              active={sortKey === "amount"}
              dir={sortKey === "amount" ? sortDir : null}
              onClick={() => pickSort("amount")}
            />
            <SortChip
              label="تاریخ"
              active={sortKey === "date"}
              dir={sortKey === "date" ? sortDir : null}
              onClick={() => pickSort("date")}
            />
            <p className="ms-auto text-micro text-muted-foreground">
              {sortKey === "amount"
                ? sortDir === "desc"
                  ? "گران‌ترین اول"
                  : "ارزان‌ترین اول"
                : sortDir === "desc"
                  ? "جدیدترین اول"
                  : "قدیمی‌ترین اول"}
            </p>
          </div>
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-border/35 overflow-y-auto overscroll-contain px-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {sorted.map((line, index) => (
            <li
              key={line.id}
              className="flex items-center gap-2.5 px-3 py-2.5"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-[10px] font-bold tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-semibold text-foreground">
                  {line.title}
                </p>
                <p className="truncate text-micro text-muted-foreground">
                  {categoryLine(line)} · {formatDateFaShort(line.date)}
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-secondary/70 px-2 py-1 text-caption font-bold tabular-nums text-secondary-foreground">
                {formatCurrency(line.totalAmount, currency)}
              </span>
            </li>
          ))}
        </ul>
      </DrawerContent>
    </Drawer>
  );
}

function SortChip({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir | null;
  onClick: () => void;
}) {
  const arrow =
    dir === "desc" ? "↓" : dir === "asc" ? "↑" : "";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-xl px-3 text-caption font-semibold transition-colors active:scale-[0.98]",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/80 text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {arrow ? (
        <span className="text-micro opacity-90" aria-hidden>
          {arrow}
        </span>
      ) : null}
    </button>
  );
}
