# Vercel React Best Practices — remediation log

**Date:** 2026-08-09  
**Guide:** [vercel-react-best-practices](https://github.com/vercel-labs/agent-skills) (Vercel Engineering)  
**App version:** `3.44` → `3.45` (`lib/app-version.ts`)  
**Audit canvas:** workspace `canvases/vercel-react-best-practices-audit.canvas.tsx`

This document records what was fixed after the project audit, in the agreed fix order (phases 1–5).

---

## Phase 1 — Authenticate server actions (`server-auth-actions`)

| ID | Change |
|----|--------|
| S1 | `listDueSoonDebtsForUser()` — no client `userId`; binds to `requireUser().userId` |
| S2 | `ensureRecurringExpenses(spaceId)` — requires session + `requireSpaceMember` before materializing |
| S3 | `listDueSoonInternalLoansForUser()` — same session bind as debts |

**Files:** `app/actions/debt.ts`, `app/actions/internalLoan.ts`, `app/actions/recurring.ts`, `app/(app)/app/page.tsx`

---

## Phase 2 — Kill waterfalls & duplicate fetches (`async-*`)

| ID | Change |
|----|--------|
| W1 | Space page: `Promise.all([params, searchParams, requireUser()])` then membership |
| W3 | `getHomeSummary`: privacy query runs in parallel with balance aggregates; spend `groupBy` after |
| W4 | `loadDeferredTabData({ skipExpenses })` when body already loaded the ledger |
| W7 | Charges: manager view + proofs in `Promise.all`; `skipBuildingView` avoids second view load |
| — | Hero board badge: `loadOpenBoardCount(spaceId)` without awaiting full `ctxPromise` |
| — | Same params/`requireUser` parallelization on resident, board, settings, member pages |

**Files:** `app/spaces/[id]/page.tsx`, `resident/page.tsx`, `board/page.tsx`, `settings/page.tsx`, `member/page.tsx`, `space-page-hero.tsx`, `space-page-body.tsx`, `lib/home-summary.ts`, `lib/spaces/load-deferred-tab.ts`

---

## Phase 3 — Shrink RSC → client payload (`server-serialization`, `server-dedup-props`)

| ID | Change |
|----|--------|
| S5 | `getShareSummaryText(spaceId)` server action; hero icon only passes `spaceId` |
| S8 | Single `members` array passed as both `members` and `inviteMembers` (same reference) |
| S4 | Tab-heavy props (`expenses`, `debts`, `funds`, building, report) only when `activeTab` needs them; `familyReportMembers` derived client-side |

**Files:** `app/actions/settlement.ts`, `components/spaces/share-summary-button.tsx`, `app/spaces/[id]/space-page-hero.tsx`, `space-page-body.tsx`, `components/spaces/family-space-tabs.tsx`, `space-tabs-types.ts`

---

## Phase 4 — Home streaming + non-blocking notify (`async-suspense-boundaries`, `async-dependencies`, `server-after-nonblocking`)

| ID | Change |
|----|--------|
| W2 | Home wave 1: user + memberships + archivedCount + debts + disabledTypes together |
| W5 | Home header paints after wave 1; summary / quick actions / space list stream via `Suspense` sharing one `summaryPromise` |
| S6 | Building mutations: `after(() => { void notifyBuildingUsers/Managers(...) })` |

**Files:** `app/(app)/app/page.tsx`, `app/actions/building.ts`

---

## Phase 5 — Bundle + hydration polish

| ID | Change |
|----|--------|
| B1 | Dialog (Radix) vs Drawer (vaul) split into separate dynamic chunks for invite, add-expense, expense-edit |
| B2 | `experimental.optimizePackageImports: ['recharts']` in `next.config.ts` |
| R1 | Inline bootstrap script in `app/layout.tsx` reads `superhesab-app-settings` before paint |
| R2 | Shared `useIsDesktop()` returns `null` until media known — no Dialog↔Drawer first-paint flip |
| — | `home-user-menu` `touchstart` listener is `{ passive: true }` |

**Files:** `components/hooks/use-is-desktop.ts`, `components/spaces/invite-members-*.tsx`, `components/expenses/add-expense-*.tsx`, `components/expenses/expense-edit-*.tsx`, `expense-list.tsx`, `next.config.ts`, `app/layout.tsx`, `home-user-menu.tsx`

---

## Regression checklist

- [ ] Unauthenticated call to `listDueSoonDebtsForUser` / `ensureRecurringExpenses` from client cannot target another user/space
- [ ] Space expenses tab: Network shows one ledger page fetch (not two)
- [ ] Share icon on trip/partner: no large expense array in RSC payload; text loads on click
- [ ] Home: greeting paints while summary skeleton may still show
- [ ] Building charge payment / announcement / proof review returns before notify finishes
- [ ] Desktop vs mobile: only one of Dialog/Drawer chunk loads for invite + FAB + expense edit
- [ ] Theme/accent from localStorage applies without flash on reload

---

## Intentionally deferred

- Further home auth dedupe (`requireUser` + second `user.findUnique` for profile fields)
- Zod-before-auth reorder on every mutation (`async-cheap-condition-before-await`)
- `content-visibility` on debt / savings / loan card lists
- localStorage schema versioning for custom categories / bill tags
