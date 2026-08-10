# Perf Review — /app, trip space, building space — 2026-08-10

**Verdict:** Fixed + verified (baseline already healthy; one scaling query tightened)

| Route | Warm? | TTFB (responseStart) | DCL | Notes |
|-------|-------|----------------------|-----|-------|
| `/app` | yes (before) | 24ms | 408ms | 6 spaces; summary + list streamed |
| `/app` | yes (after) | 75ms | 506ms | Noise in next-dev; still ≪ 400ms budget |
| `/spaces/…` trip (شمال) | yes | 26ms | 369ms | hero + expenses default tab OK |
| `/spaces/…` building (ظفر) | yes | 28ms | 314ms | charges default tab; 9 units |

Dev budgets: TTFB ≤400ms good, DCL ≤1.5s good. All measured routes pass.

## Findings

### P1 — Home due-soon debts over-fetched via nested memberships
- **Severity:** Medium (scales poorly; not a warm-path crisis at current data size)
- **Surface:** `/app` + `app/actions/debt.ts` `listDueSoonDebtsForUser`
- **Observed:** Loaded every `spaceMember` for the user with nested `space.debts` (+ payments), including archived / non-debt templates; filtered `isDueSoon` in JS after fetch. Ran in Wave 1 alongside a separate memberships query.
- **Cause:** Membership-centric nested include instead of a Debt-scoped query.
- **Fix:** Query `prisma.debt.findMany` with `status: ACTIVE`, `dueDate <= horizon`, `space.archivedAt: null`, `type in FAMILY|PERSONAL`, `members.some.userId`. Same `isDueSoon` semantics.
- **Remeasure:** `/app` still healthy (TTFB tens of ms). `APP_VERSION` → 3.51.

### P2 — Settlement filter lacks composite index
- **Severity:** Low
- **Surface:** `getSpaceBalances` / `getHomeSummary` — `{ spaceId, status: "COMPLETED" }`
- **Observed:** Schema has separate `@@index([spaceId])` and `@@index([status])` only.
- **Cause:** Hot filter not covered by a left-prefix composite.
- **Fix:** Not applied (needs migration; no measured pain at current scale). Candidate: `@@index([spaceId, status])` on `Settlement`.

### P3 — Same nested pattern on unused internal-loan helper
- **Severity:** Low
- **Surface:** `listDueSoonInternalLoansForUser` in `app/actions/internalLoan.ts`
- **Observed:** Identical membership+nested include pattern; currently unused by pages.
- **Fix:** Deferred until wired into home UI.

## Passed / already good
- `/app` uses Suspense + shared `summaryPromise` (no duplicate home summary work)
- `getHomeSummary` fixed-query / `Promise.all` (anti-N+1)
- Space page: tab-aware eager loads + `loadDeferredTabData` skip flags
- Expense ledger paging (`EXPENSE_PAGE_SIZE`) and slim selects
- Building charges on critical path; proofs deferred
- Heavy client islands already behind `next/dynamic` / deferred tabs

## Files changed
- `app/actions/debt.ts` — due-soon query rewrite
- `lib/app-version.ts` — 3.50 → 3.51
