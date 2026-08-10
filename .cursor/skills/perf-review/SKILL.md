---
name: perf-review
description: >-
  Measure and fix SuperHesab performance (Next.js App Router + Prisma + Postgres):
  live TTFB/LCP/navigation timing, RSC data-load waterfalls, Prisma N+1 and
  over-fetch, indexes, and heavy client bundles. Use when the user asks for
  performance, speed, slow load, DB query optimization, Prisma N+1, TTFB,
  Core Web Vitals, پرفورمنس، سرعت اپ، کندی لود، بهینه‌سازی کوئری، or "perf review".
---

# Perf Review (Measure → Fix → Remeasure)

Evidence-first performance pass for SuperHesab. Not a visual/UX audit — focused on **server response time, data-loading efficiency, and client cost**.

Also load when relevant (already installed):

- `vercel-react-best-practices` — RSC/async/bundle rules
- `core-web-vitals` — LCP / INP / CLS thresholds

## Defaults (SuperHesab)

| Setting | Value |
|---------|--------|
| Base URL | `http://localhost:3003` (never 3000) |
| Stack | Next.js App Router, Server Actions, Prisma + Postgres |
| Money | Integer smallest units only (`lib/money`) — never change for “perf” |
| Tool | `cursor-ide-browser` MCP + codebase inspection |
| Auth | Stop on login wall; do not invent credentials |

If the user names routes, review those. Otherwise default to:

1. `/app` (home)
2. One open space `/spaces/[id]` (hero + default tab)
3. One deferred tab on that space (expenses / building / fund as applicable)

## Budgets (dev targets)

Treat as **regression budgets**, not production SLOs. Flag when clearly worse.

| Metric | Good | Investigate |
|--------|------|-------------|
| Navigation `responseStart` (TTFB proxy) | ≤ 400ms | > 800ms |
| `domContentLoaded` | ≤ 1.5s | > 3s |
| LCP (when available) | ≤ 2.5s | > 4s |
| Prisma queries per route wave | low tens | obvious N+1 / unbounded `findMany` |
| Default-tab JS | heavy panels behind `next/dynamic` + deferred fetch | fat client on first paint |

Cold next-dev compiles inflate the first hit — **warm the route once**, then measure.

## Workflow

Copy and track:

```
Perf Review Progress:
- [ ] 0. Preflight (URL + auth + warm)
- [ ] 1. Measure (browser timings + screenshot)
- [ ] 2. Trace data path (RSC → Prisma)
- [ ] 3. Diagnose (rank findings)
- [ ] 4. Fix highest-impact issue(s)
- [ ] 5. Remeasure + report
```

### 0. Preflight

1. Confirm `http://localhost:3003`. If down: ask user to run `npm run dev`.
2. `browser_tabs` → list. Lock existing tab, or navigate then lock.
3. Navigate target route; if login wall → stop and ask user to sign in.
4. Warm: hard navigate once, wait for settle, then measure on the **second** load (or soft nav from `/app` → space).

### 1. Measure (live)

For each target route:

1. Navigate (full load or soft nav as relevant).
2. Run the **timing probe** in [checklist.md](checklist.md) via `browser_cdp` → `Runtime.evaluate`.
3. Capture above-the-fold screenshot for context (optional evidence).
4. Record: route, warm/cold, TTFB proxy, DCL, LCP, transfer size if available.

Do **not** treat Cursor `data-cursor-ref` hydration overlays as product bugs (same rule as viewport-review).

### 2. Trace data path

Map the route to loaders (read these first):

| Route | Primary files |
|-------|----------------|
| `/app` | `app/(app)/app/page.tsx`, `lib/home-summary.ts` |
| `/spaces/[id]` | `app/spaces/[id]/page.tsx`, `space-page-content.tsx`, `lib/spaces/space-page-ctx.ts`, `lib/spaces/load-deferred-tab.ts`, `lib/spaces/expense-ledger.ts` |
| Tab fetches | `app/actions/spaceTab.ts`, `components/spaces/use-deferred-space-tabs.ts` |
| Guards | `lib/auth/guards.ts` (`React.cache`) |
| Prisma | `lib/db/prisma.ts` |
| Building cache | `lib/spaces/building-cache.ts` (`unstable_cache` + tags) |

For each slow surface, answer:

1. Which awaits are **serial** that could be `Promise.all`?
2. Does the query use `select` (good) or fat `include` (risk)?
3. Is there a loop with per-item `prisma.*` (N+1)?
4. Are relation filters used without supporting indexes (`ExpenseSplit` via `expense.spaceId`, `ChargePayment` via `unit.spaceId`)?
5. Is default-tab shipping a huge `"use client"` island that should stay `dynamic()` / deferred?

### 3. Diagnose

Rank findings by impact. Prefer:

1. **Server waterfalls / duplicate auth+membership loads**
2. **N+1 or unbounded list queries**
3. **Over-fetch** (splits/relations on list paths)
4. **Missing / mismatched indexes** for real `where` clauses
5. **Client bundle on first paint** (ExpenseForm, building panels, charts)
6. **Cache correctness** (`React.cache` keys, building tag invalidation) — only when evidence points there

See hotspot checklist in [checklist.md](checklist.md).

### 4. Fix

- Fix **highest-impact** issues the user asked for (or top 1–3 if open-ended).
- Preserve product rules: Server Actions for mutations, integer money, SpaceMember checks, Trip/Partner template reuse.
- Prefer extending existing loaders (`home-summary`, `space-page-ctx`, `expense-ledger`) over parallel caches.
- After product code changes: bump `APP_VERSION` in `lib/app-version.ts` by `0.01` (once per change-set).
- Do **not** broaden `revalidatePath("/app")` without need; respect building cache tags when touching units/charge plans.
- Schema/index changes need a Prisma migration — call that out and only migrate when the fix requires it.

### 5. Remeasure + report

Re-run the timing probe on the same warm path. Report before/after when you fixed something.

## Report format

```markdown
# Perf Review — [route(s)] — [date]

**Verdict:** Healthy | Regressions found | Fixed + verified | Blocked (auth/server)

| Route | Warm? | TTFB (responseStart) | DCL | LCP | Notes |
|-------|-------|----------------------|-----|-----|-------|
| /app | yes | …ms | …ms | …ms | … |
| /spaces/… | yes | …ms | …ms | …ms | … |

## Findings

### P1 — [title]
- **Severity:** Critical | High | Medium | Low
- **Surface:** `/path` + loader/action file
- **Observed:** timing / query pattern evidence
- **Cause:** …
- **Fix:** what changed (or proposed)
- **Remeasure:** before → after (if fixed)

## Passed / already good
- …
```

Severity guide:

| Severity | Examples |
|----------|----------|
| Critical | Multi-second TTFB on warm `/app` or space; N+1 that scales with members×expenses |
| High | Serial waterfalls; list path loading all splits; missing index on hot filter |
| Medium | Over-fetch; deferrable work on critical path; fat client on default tab |
| Low | Micro-opts, speculative indexes without measured pain |

## Autonomy

- **Do:** navigate, measure via CDP, read loaders/actions/schema, implement safe query/RSC/bundle fixes, remeasure, write report (and `.jez/perf-review/YYYY-MM-DD/REPORT.md` if user wants a file).
- **Ask first:** migrations that rewrite data, broad cache strategy changes, anything that changes money semantics.
- **Stop:** login required and session missing; cannot reach Postgres / Prisma errors blocking measure.

## Related

- Layout/responsive → `viewport-review`
- Interaction/UX bugs → `ux-audit`
- Probe scripts + SuperHesab hotspots → [checklist.md](checklist.md)
