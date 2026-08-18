/**
 * Home headline card — the viewer's net position across settlement spaces,
 * with this month's ledger spend as a secondary stat.
 *
 * Spend is labeled by template (خانه / ساختمان) so a mixed home never looks
 * like a single unlabeled total. Totals stay per currency.
 *
 * If the viewer has no settlement spaces at all, the card falls back to the
 * month spend so the slot is never an empty box.
 */

import { SpaceTypeIcon } from "@/components/spaces/space-type-icon";
import type { HomeSummary } from "@/lib/home-summary";
import { currencyLabel, formatMoney, type SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { getTemplate } from "@/lib/templates/registry";
import type { SpaceType } from "@/types";

type SpendByTemplate = HomeSummary["monthSpendByTemplate"][number];

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

function TemplateChip({
  type,
  compact,
}: {
  type: SpaceType;
  compact?: boolean;
}) {
  return (
    <span
      className={
        compact
          ? "inline-flex max-w-full items-center gap-1 text-caption font-semibold text-on-hero"
          : "inline-flex max-w-full items-center gap-1.5 rounded-2xl bg-on-hero/12 px-2.5 py-1.5 ring-1 ring-on-hero/15"
      }
    >
      <SpaceTypeIcon
        type={type}
        className={compact ? "size-3.5 shrink-0" : "size-4 shrink-0 text-on-hero"}
      />
      <span className={compact ? undefined : "truncate text-caption font-semibold text-on-hero"}>
        {getTemplate(type).label}
      </span>
    </span>
  );
}

function SpendSource({
  rows,
  currency,
  variant,
}: {
  rows: SpendByTemplate[];
  currency: SpaceCurrency;
  variant: "hero" | "bar";
}) {
  const matching = rows.filter((r) => r.currency === currency);

  if (variant === "hero") {
    if (matching.length === 0) return null;
    if (matching.length === 1) {
      return (
        <TemplateChip type={matching[0]!.type} />
      );
    }
    return (
      <ul className="flex min-w-0 flex-col items-end gap-1">
        {matching.map((row) => (
          <li key={`${row.type}:${row.currency}`} className="max-w-full">
            <TemplateChip type={row.type} />
          </li>
        ))}
      </ul>
    );
  }

  if (matching.length === 0) {
    return (
      <span className="text-caption font-medium text-on-hero/70">خرج این ماه</span>
    );
  }

  if (matching.length === 1) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <span className="text-caption font-medium text-on-hero/70">خرج این ماه</span>
        <span className="text-on-hero/40" aria-hidden>
          ·
        </span>
        <TemplateChip type={matching[0]!.type} compact />
      </span>
    );
  }

  return (
    <span className="min-w-0 truncate text-caption font-medium text-on-hero/70">
      خرج این ماه ·{" "}
      {matching.map((row) => getTemplate(row.type).label).join(" و ")}
    </span>
  );
}

function SpendBreakdown({
  rows,
  currency,
}: {
  rows: SpendByTemplate[];
  currency: SpaceCurrency;
}) {
  const matching = rows.filter((r) => r.currency === currency);
  if (matching.length < 2) return null;

  return (
    <p className="mt-3 text-caption tabular-nums text-on-hero/75">
      {matching
        .map(
          (row) =>
            `${getTemplate(row.type).label} ${formatCurrency(row.amount, row.currency)}`,
        )
        .join(" · ")}
    </p>
  );
}

export function HomeSummaryCard({ summary }: { summary: HomeSummary }) {
  const { netByCurrency, monthSpendByCurrency, monthSpendByTemplate } = summary;
  const primaryNet = netByCurrency[0];
  const extraNets = netByCurrency.slice(1);
  const primarySpend = monthSpendByCurrency[0];
  const spendRows = monthSpendByTemplate;

  if (!primaryNet && !primarySpend) return null;

  return (
    <section
      className="surface-hero animate-fade-up relative mb-5 overflow-hidden rounded-3xl px-5 py-5 shadow-md"
      aria-label="خلاصه مالی"
    >
      {/* Soft light wells — clipped in a paint-contained layer so blur/negative
          insets cannot widen document scrollWidth on narrow phones. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        <div className="absolute -inset-e-10 -top-14 size-40 rounded-full bg-on-hero/12 blur-3xl" />
        <div className="absolute -inset-s-12 -bottom-10 size-36 rounded-full bg-ink/25 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-l from-transparent via-on-hero/25 to-transparent" />
      </div>

      <div className="relative min-w-0">
        {primaryNet ? (
          <NetHeadline row={primaryNet} />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
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
            <SpendSource
              rows={spendRows}
              currency={primarySpend!.currency}
              variant="hero"
            />
          </div>
        )}

        {!primaryNet && primarySpend ? (
          <SpendBreakdown
            rows={spendRows}
            currency={primarySpend.currency}
          />
        ) : null}

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
            <SpendSource
              rows={spendRows}
              currency={primarySpend.currency}
              variant="bar"
            />
            <span className="shrink-0 text-body-sm font-semibold tabular-nums text-on-hero">
              {formatCurrency(primarySpend.amount, primarySpend.currency)}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
