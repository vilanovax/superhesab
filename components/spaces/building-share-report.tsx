import { formatJalaliYear, monthLabelFa, tehranCivilMonth } from "@/lib/building";
import type { BuildingShareReport } from "@/lib/building-share";
import { CATEGORY_EMOJI } from "@/lib/categorizer";
import { formatDateFaShort, formatMoney } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

function faPct(n: number): string {
  return `${n.toLocaleString("fa-IR")}٪`;
}

export function BuildingShareReportView({
  report,
}: {
  report: BuildingShareReport;
}) {
  const monthName = monthLabelFa(tehranCivilMonth());
  const yearLabel = formatJalaliYear(report.year);
  const unit = report.currency;

  return (
    <div className="space-y-3">
      {report.chargesSummary ? (
        <section
          className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm"
          aria-label="وصول شارژ"
        >
          <p className="text-caption font-bold text-foreground">
            وصول شارژ {yearLabel}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {report.chargesSummary.activeUnits.toLocaleString("fa-IR")} واحد فعال
            {report.chargesSummary.baseCharge > 0
              ? ` · پایه ${formatCurrency(report.chargesSummary.baseCharge, unit)}`
              : ""}
          </p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-micro font-semibold text-muted-foreground">
                پیشرفت وصول
              </p>
              <p className="mt-1 text-[1.5rem] font-bold leading-none tabular-nums text-foreground">
                {faPct(report.chargesSummary.collectPct)}
              </p>
            </div>
            <div className="text-end text-caption tabular-nums text-muted-foreground">
              <p>
                وصول‌شده{" "}
                <span className="font-semibold text-foreground">
                  {formatMoney(report.chargesSummary.collectedYtd)}
                </span>
              </p>
              {report.chargesSummary.arrearsTotal > 0 ? (
                <p className="mt-0.5 text-amber-800">
                  معوق {formatMoney(report.chargesSummary.arrearsTotal)}
                </p>
              ) : (
                <p className="mt-0.5">بدون معوق</p>
              )}
            </div>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/70"
            role="progressbar"
            aria-valuenow={report.chargesSummary.collectPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(
                "h-full rounded-full",
                report.chargesSummary.arrearsTotal > 0
                  ? "bg-amber-500"
                  : "bg-primary",
              )}
              style={{ width: `${report.chargesSummary.collectPct}%` }}
            />
          </div>
        </section>
      ) : null}

      {report.expensesSummary ? (
        <section
          className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm"
          aria-label="هزینه مشاع"
        >
          <p className="text-caption font-bold text-foreground">خرج مشاع</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-primary/8 px-3 py-2.5 ring-1 ring-primary/12">
              <p className="text-micro text-muted-foreground">{monthName}</p>
              <p className="mt-1 text-body font-bold tabular-nums text-foreground">
                {formatMoney(report.expensesSummary.monthTotal)}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 px-3 py-2.5">
              <p className="text-micro text-muted-foreground">امسال</p>
              <p className="mt-1 text-body font-bold tabular-nums text-foreground">
                {formatMoney(report.expensesSummary.yearTotal)}
              </p>
            </div>
          </div>
          {report.expensesSummary.monthCategories.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {report.expensesSummary.monthCategories.slice(0, 6).map((row) => (
                <li
                  key={row.key}
                  className="flex items-center justify-between gap-2 text-caption"
                >
                  <span className="min-w-0 truncate text-muted-foreground">
                    <span aria-hidden className="me-1">
                      {CATEGORY_EMOJI[row.category] ?? "📦"}
                    </span>
                    {row.label}
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-foreground">
                    {formatMoney(row.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[11px] text-muted-foreground">
              این ماه هزینه مشاعی ثبت نشده.
            </p>
          )}
        </section>
      ) : null}

      {report.expensesList && report.expensesList.length > 0 ? (
        <section
          className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm"
          aria-label="لیست هزینه‌ها"
        >
          <p className="text-caption font-bold text-foreground">هزینه‌های امسال</p>
          <ul className="mt-2.5 divide-y divide-border/35">
            {report.expensesList.map((line) => (
              <li
                key={line.id}
                className="flex items-start justify-between gap-2 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-caption font-semibold text-foreground">
                    {line.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateFaShort(line.date)}
                  </p>
                </div>
                <span className="shrink-0 text-caption font-bold tabular-nums text-foreground">
                  {formatMoney(line.totalAmount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.chargesUnits && report.chargesUnits.length > 0 ? (
        <section
          className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm"
          aria-label="وضعیت واحدها"
        >
          <p className="text-caption font-bold text-foreground">وضعیت واحدها</p>
          <ul className="mt-2.5 divide-y divide-border/35">
            {report.chargesUnits.map((u, index) => (
              <li
                key={`${u.name}-${index}`}
                className="flex items-center justify-between gap-2 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-caption font-semibold text-foreground">
                    واحد {u.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    شارژ ماهانه {formatMoney(u.monthlyCharge)}
                  </p>
                </div>
                {u.arrears > 0 ? (
                  <span className="shrink-0 text-caption font-bold tabular-nums text-amber-800">
                    معوق {formatMoney(u.arrears)}
                  </span>
                ) : (
                  <span className="shrink-0 text-caption font-semibold text-muted-foreground">
                    تسویه
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.announcements && report.announcements.length > 0 ? (
        <section
          className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm"
          aria-label="اعلانات"
        >
          <p className="text-caption font-bold text-foreground">اعلانات</p>
          <ul className="mt-2.5 space-y-2.5">
            {report.announcements.map((a) => (
              <li
                key={a.id}
                className="rounded-xl bg-muted/30 px-3 py-2.5"
              >
                <p className="text-caption font-semibold text-foreground">
                  {a.pinned ? "📌 " : ""}
                  {a.title}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground">
                  {a.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
