# Perf review — probes & SuperHesab hotspots

## Timing probe (`browser_cdp` → `Runtime.evaluate`)

```js
(() => {
  const nav = performance.getEntriesByType("navigation")[0];
  const paint = performance.getEntriesByType("paint");
  const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
  const resources = performance.getEntriesByType("resource");

  const byType = {};
  let transfer = 0;
  for (const r of resources) {
    const t = r.initiatorType || "other";
    byType[t] = (byType[t] || 0) + 1;
    transfer += r.transferSize || 0;
  }

  const slowResources = resources
    .filter((r) => r.duration >= 100)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 8)
    .map((r) => ({
      name: String(r.name).replace(location.origin, "").slice(0, 120),
      type: r.initiatorType,
      dur: Math.round(r.duration),
      transfer: r.transferSize || 0,
    }));

  return {
    href: location.pathname + location.search,
    readyState: document.readyState,
    nav: nav
      ? {
          type: nav.type,
          ttfb: Math.round(nav.responseStart),
          responseEnd: Math.round(nav.responseEnd),
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
          load: Math.round(nav.loadEventEnd),
          transferSize: nav.transferSize,
          encodedBodySize: nav.encodedBodySize,
        }
      : null,
    paint: Object.fromEntries(
      paint.map((p) => [p.name, Math.round(p.startTime)])
    ),
    lcp: lcpEntries.length
      ? Math.round(lcpEntries[lcpEntries.length - 1].startTime)
      : null,
    resourceCount: resources.length,
    resourcesByType: byType,
    approxTransferBytes: transfer,
    slowResources,
  };
})()
```

Call shape:

```
browser_cdp
  method: Runtime.evaluate
  params: {
    expression: "<probe above>",
    returnByValue: true
  }
```

### How to read results

| Field | Investigate when |
|-------|------------------|
| `nav.ttfb` (`responseStart`) | > 800ms on **warm** load |
| `nav.domContentLoaded` | > 3000ms warm |
| `lcp` | > 4000ms or null while UI feels stuck |
| `slowResources` | large JS chunks or repeated RSC fetches on soft nav |
| `nav.type` | `reload` vs `navigate` — label cold/warm accordingly |

Optional: PerformanceObserver for LCP if `largest-contentful-paint` entries are empty (buffer may be cleared). Prefer second navigation after warm.

## Prisma / query checklist

When reading loaders and actions:

- [ ] No `await` in a loop over members/expenses/units → batch with `in` / `groupBy` / `Promise.all`
- [ ] List paths use `select`; splits loaded only on edit/detail (`expense-ledger` is the reference)
- [ ] Independent fetches start together (`Promise.all`), not waterfall
- [ ] `React.cache` on guards/ctx (`lib/auth/guards.ts`, `space-page-ctx.ts`) — avoid duplicate membership hits
- [ ] Relation filters have a plan: `ExpenseSplit` → via `expense.spaceId`; `ChargePayment` → via `unit.spaceId`
- [ ] Building units/charge-plan go through `lib/spaces/building-cache.ts` tags when cached
- [ ] Mutations: narrow `revalidatePath`; building writes update the right tags

### Hot files to grep / read

```
lib/home-summary.ts
lib/spaces/space-page-ctx.ts
lib/spaces/load-deferred-tab.ts
lib/spaces/expense-ledger.ts
lib/spaces/space-tab-data.ts
lib/spaces/building-cache.ts
app/actions/expense.ts
app/actions/settlement.ts
app/actions/building.ts
app/actions/fund.ts
app/actions/spaceTab.ts
prisma/schema.prisma
```

Useful greps:

```bash
rg -n "for \\(.*\\) \\{[\\s\\S]*?await prisma" -g 'app/**' -g 'lib/**'
rg -n "include:\\s*\\{" app lib -g '*.ts' -g '*.tsx'
rg -n "findMany\\(" lib/home-summary.ts lib/spaces app/actions
rg -n "revalidatePath|updateTag|unstable_cache|React\\.cache" app lib
```

## Index watch list

Confirm indexes match **actual** `where` / `orderBy` (do not add speculative composites).

| Area | Watch |
|------|--------|
| `Expense` | `[spaceId, date, transactionType]` — list/ledger |
| `ExpenseSplit` | no `spaceId` — aggregates join through Expense |
| `Settlement` | frequent `{ spaceId, status: "COMPLETED" }` — composite may help if measured |
| `ChargePayment` | space+year via `unit` relation — plan/EXPLAINable |
| `Debt` | `[spaceId, status]` + `dueDate` filters on home |

Prefer `EXPLAIN (ANALYZE, BUFFERS)` on a suspect query over guessing indexes.

## Client bundle checklist

Default-tab / first paint should **not** eagerly mount:

| Island | Path | Expectation |
|--------|------|-------------|
| Expense form | `components/ExpenseForm.tsx` | `next/dynamic` |
| Building units/charges | `building-*-panel.tsx` | deferred tab |
| Charts / calendar | `PersonalReportChart`, annual calendar | dynamic |
| Jalali picker | `jalali-date-picker` | dynamic |
| PWA runtime | `deferred-pwa-runtime.tsx` | after idle |

On `/app`, check create-space sheet and menus do not pull the expense form into the home graph.

## Fix preference order

1. Parallelize independent server awaits
2. Kill N+1 / unbounded `findMany`
3. Slim `select` / drop unused includes
4. Defer non-default tab data + heavy client
5. Index only with measured evidence
6. Cache only when keyed/invalidated correctly (building tags pattern)

## Evidence folder (optional)

```
.jez/perf-review/YYYY-MM-DD/
  app-home.json          # timing probe output
  space-default.json
  REPORT.md
```

## Manual smoke (after fix)

- [ ] Warm `/app` timing improved or unchanged (no regression)
- [ ] Warm `/spaces/[id]` hero usable; default tab still correct
- [ ] Deferred tab still loads on select
- [ ] Money amounts still integer-correct (spot-check one expense/balance)
- [ ] `APP_VERSION` bumped if product code changed
