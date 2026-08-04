/**
 * Home headline card — the viewer's net position across settlement spaces,
 * with this month's ledger spend as a secondary stat.
 *
 * Totals are per currency (never summed across currencies). If the viewer has
 * no settlement spaces at all, the card falls back to the month spend so the
 * slot is never an empty box.
 */

import type { HomeSummary } from "@/lib/home-summary";
import { currencyLabel, formatMoney, type SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";

/**
 * Digits at display size, currency label at body size — a full TOMAN amount
 * rendered entirely at 2rem overflows a 320px content column.
 */
function Amount({
  amount,
  currency,
}: {
  amount: number;
  currency: SpaceCurrency;
}) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      <span className="text-[1.85rem] font-bold leading-none tabular-nums tracking-tight sm:text-display">
        {formatMoney(amount)}
      </span>
      <span className="text-body-sm font-medium text-on-hero/75">
        {currencyLabel(currency)}
      </span>
    </span>
  );
}

function NetHeadline({
  row,
}: {
  row: HomeSummary["netByCurrency"][number];
}) {
  const settled = row.net === 0;
  const isCredit = row.net > 0;

  return (
    <div>
      <p className="text-caption font-medium text-on-hero/70">
        {settled ? "وضعیت شما" : isCredit ? "طلب شما" : "بدهی شما"}
      </p>
      <p className="mt-1.5 text-on-hero">
        {settled ? (
          <span className="text-[1.85rem] font-bold leading-none tracking-tight sm:text-display">
            تسویه
          </span>
        ) : (
          <Amount amount={Math.abs(row.net)} currency={row.currency} />
        )}
      </p>
      {row.credit > 0 && row.debit > 0 ? (
        <p className="mt-2.5 text-caption tabular-nums text-on-hero/70">
          طلب {formatCurrency(row.credit, row.currency)}
          {" · "}
          بدهی {formatCurrency(row.debit, row.currency)}
        </p>
      ) : null}
    </div>
  );
}

export function HomeSummaryCard({ summary }: { summary: HomeSummary }) {
  const { netByCurrency, monthSpendByCurrency } = summary;
  const primaryNet = netByCurrency[0];
  const extraNets = netByCurrency.slice(1);
  const primarySpend = monthSpendByCurrency[0];

  if (!primaryNet && !primarySpend) return null;

  return (
    <section
      className="surface-hero animate-fade-up relative mb-5 overflow-hidden rounded-3xl px-5 py-5 shadow-md"
      aria-label="خلاصه مالی"
    >
      {/* Soft light wells — depth without competing with the amount */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-e-10 -top-14 size-40 rounded-full bg-on-hero/12 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-s-12 -bottom-10 size-36 rounded-full bg-ink/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-l from-transparent via-on-hero/25 to-transparent"
      />

      <div className="relative">
        {primaryNet ? (
          <NetHeadline row={primaryNet} />
        ) : (
          <div>
            <p className="text-caption font-medium text-on-hero/70">
              خرج این ماه
            </p>
            <p className="mt-1.5 text-on-hero">
              <Amount
                amount={primarySpend!.amount}
                currency={primarySpend!.currency}
              />
            </p>
          </div>
        )}

        {extraNets.length > 0 ? (
          <p className="mt-2.5 text-caption tabular-nums text-on-hero/70">
            {extraNets
              .map(
                (r) =>
                  `${r.net > 0 ? "طلب" : "بدهی"} ${formatCurrency(Math.abs(r.net), r.currency)}`,
              )
              .join(" · ")}
          </p>
        ) : null}

        {primaryNet && primarySpend ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-on-hero/10 px-3.5 py-2.5 ring-1 ring-on-hero/10">
            <span className="text-caption font-medium text-on-hero/70">
              خرج این ماه
            </span>
            <span className="text-body-sm font-semibold tabular-nums text-on-hero">
              {formatCurrency(primarySpend.amount, primarySpend.currency)}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
