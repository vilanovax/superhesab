# SuperHesab — Performance Notes

**Audience:** agents and humans changing space tabs, expense lists, or auth LCP.  
**Status as of:** product code around `APP_VERSION` **3.46** (`lib/app-version.ts`).  
**See also:** [architecture.md](./architecture.md) · [PERF_VERCEL_REACT_AUDIT.md](./PERF_VERCEL_REACT_AUDIT.md) · `.cursorrules` · `AGENTS.md`

This doc records **what was done and why**, verified against the current tree. Prefer extending these patterns over inventing parallel loaders.

---

## 1. Purpose / when to read

Read this before:

- Touching BUILDING / FAMILY / TRIP tab shells or `useDeferredSpaceTabs`
- Changing expense list Prisma selects or edit open flow
- Altering `loadSpaceTabData` / `loadDeferredTabData`
- Measuring or “optimizing” space page first paint

Dev server runs on **port 3003** (`npm run dev` → `http://localhost:3003`). Do not use 3000.

---

## 2. Architecture of deferred tabs

Space pages stream chrome first, then heavy tab payloads. The active tab is the only one that must block first paint for its data.

```
Space page (RSC)
  ├─ Hero / chrome
  └─ SpacePageBody
       ├─ needExpenses / needBuildingView / …  (tab-aware eager loads)
       └─ loadDeferredTabData(activeTab only)
            │
            ▼
       Client tab shells (Building / Family / Trip)
            └─ useDeferredSpaceTabs
                 ├─ initial payload for default tab
                 ├─ loadSpaceTabData on real switch (busy)
                 └─ prefetchTab({ silent: true }) on idle / hover / focus
```

### Server: tab-aware RSC (`app/spaces/[id]/space-page-body.tsx`)

- `needExpenses = activeTab === "expenses"` — expense ledger is **not** on the initial RSC when default tab is charges (BUILDING) or another non-expenses tab.
- Parallel `Promise.all` only awaits heavy reads required by `activeTab` (building view, month rows, etc.).
- BUILDING charges on RSC: `includeChargeProofs: false` when `activeTab === "charges"` so proofs stay off the critical path (`skipChargeProofsOnRsc`).

### Server: deferred loader (`lib/spaces/load-deferred-tab.ts`)

- Shared by the space page and by `loadSpaceTabData`.
- Per-tab tasks: report / debts / funds / checklist / expenses / charges|units.
- `includeChargeProofs` (default `true`): when `false`, charges tab skips `listChargeProofsForManager` (client hydrates later).

### Client: hook (`components/spaces/use-deferred-space-tabs.ts`)

- `DEFERRED_TABS`: `report`, `debts`, `funds`, `checklist`, `charges`, `expenses`, `units`.
- Module-level `tabInflight` Map: dedupe concurrent fetches for the same `spaceId|tab|year|reportMonth`.
- **Do not** wrap fetches in `startTransition` — that delayed painting the list after a real switch.
- `hydrateChargeProofs` → `loadSpaceChargeProofs` after paint without blocking charges first paint.

---

## 3. Prefetch contract (silent vs busy)

| Path | API | Skeleton (`tabBusy` / `expensesWaiting`) |
|------|-----|------------------------------------------|
| Real tab change | `onTabChange` → `ensureTabData(next)` | Yes — `setPendingTab(next)` |
| Idle / hover / focus | `prefetchTab(next)` → `ensureTabData(next, { silent: true })` | **No** — must not flip skeleton |

**Invariant:** silent prefetch must never show a loading skeleton. Skeleton only when the user is on a deferred tab that is not yet `loaded` **and** `tabBusy` is true (real switch in flight).

Pattern in shells:

```ts
const expensesWaiting =
  tab === "expenses" && !loaded.has("expenses") && tabBusy;
```

Idle warm: `requestIdleCallback(..., { timeout: 1200 })` with `setTimeout(350)` fallback.  
Intent warm: `TabsTrigger` `onPointerEnter` / `onFocus` → `prefetchTab(...)`.

`components/ui/tabs.tsx`: `TabsTrigger` accepts and forwards `onPointerEnter` / `onFocus`.

### Client action path (`app/actions/spaceTab.ts`)

`loadSpaceTabData` is intentionally lighter than a full page load:

- `reportRange` only when `tab === "report"` (BUILDING expenses use `planYear` inside `loadDeferredTabData`, not report bounds).
- Category privacy query only when `features.categoryPrivacy` and tab is `expenses` or `report`.
- Always `includeChargeProofs: false` for client tab loads; proofs via `loadSpaceChargeProofs`.

---

## 4. Expense list vs edit payload

List paint used to pull every expense with nested `splits`. That is gone for ledger pages.

| Concern | Location | Behavior |
|---------|----------|----------|
| List select | `lib/spaces/expense-ledger.ts` → `expenseListSelect` | Omits `splits`; keeps paidBy / createdBy / updatedBy |
| Edit select | same file → `expenseEditSelect` | Expense + splits for the form |
| Query | `queryExpenseLedgerPage` | Keyset page (`EXPENSE_PAGE_SIZE = 30`), uses `expenseListSelect` |
| Edit fetch | `app/actions/expense.ts` → `getExpenseForEdit` | Auth via `assertCanMutateExpense`; EDITOR only own rows; category privacy check |
| UI | `components/expenses/expense-list.tsx` | `splits?` optional on list items; edit awaits `getExpenseForEdit` with `loadingEditId` / `pendingEdit` row state |

**Do not** re-attach splits to the list select “for convenience.” Edit must keep fetching on open.

Money remains integers (`totalAmount`, `owedAmount`, etc.). Mutations stay Server Actions only.

---

## 5. Per-template notes

### BUILDING (`components/spaces/building-space-tabs.tsx`)

- Default tab: `charges` (unless URL/`initialTab` says otherwise).
- Static import of `ExpenseList` (not `next/dynamic`) so idle/hover prefetch does not wait on a chunk.
- Idle prefetch of `expenses` when default is not expenses.
- Hover/focus prefetch on expenses / charges / units / report.
- `expensesWaiting` gated by `tabBusy` (silent prefetch OK).
- Charge proofs: `hydrateChargeProofs` after first charges paint when manager can mutate.

### FAMILY (`components/spaces/family-space-tabs.tsx`)

- Default tab: `expenses`.
- Static `ExpenseList`.
- Idle + hover/focus silent prefetch for non-default deferred tabs (`expenses`, `report`, `debts`, `funds` as featured).
- Same `expensesWaiting` + `tabBusy` contract.

### TRIP / PARTNER (`components/spaces/trip-space-tabs.tsx`)

- Default tab: `expenses` (or balances/checklist from URL).
- Static `ExpenseList`.
- Idle + hover/focus silent prefetch for `expenses` / `checklist` when not default.
- Balances use RSC-provided props (not in `DEFERRED_TABS` data fetch the same way); checklist uses deferred payload + busy skeleton.

---

## 6. Earlier related work (still present)

These landed in earlier commits and remain in the tree — do not “rediscover” or undo casually.

| Area | Where | Notes |
|------|--------|--------|
| Tab-aware expense loading | `space-page-body.tsx` | `needExpenses` |
| Deferred tab loader | `load-deferred-tab.ts` | Shared RSC + client |
| Home → space prefetch | `PrefetchSpaceLink`, `HomeSpaceSpeculation` | Next `router.prefetch` on intent; Chromium Speculation Rules for `/spaces/*` (excludes settings/board) |
| Font / LCP | `app/layout.tsx` | Vazir trimmed to Regular + Bold WOFF2; `display: "optional"`; 500→Regular, 600→Bold |
| Auth LCP | login/register, `auth-shell`, deferred PWA | Auth polish + SW/install off critical path (see commits ~v2.87–v2.88) |
| Lazy panels | BUILDING/FAMILY shells | Heavy panels still `next/dynamic`; expense **list** stayed static for instant tab paint |

---

## 7. Key files index

| File | Role |
|------|------|
| `lib/app-version.ts` | `APP_VERSION` (bump **+0.01** per product change-set) |
| `app/spaces/[id]/space-page-body.tsx` | Tab-aware RSC loads |
| `lib/spaces/load-deferred-tab.ts` | Per-tab server data assembly |
| `lib/spaces/expense-ledger.ts` | List vs edit selects + keyset paging |
| `lib/spaces/space-page-ctx.ts` | Cached space page helpers |
| `app/actions/spaceTab.ts` | `loadSpaceTabData`, `loadSpaceChargeProofs` |
| `app/actions/expense.ts` | `getExpenseForEdit`, `loadMoreSpaceExpenses` |
| `components/spaces/use-deferred-space-tabs.ts` | Dedupe, silent prefetch, hydrate proofs |
| `components/spaces/building-space-tabs.tsx` | BUILDING idle/hover + proofs |
| `components/spaces/family-space-tabs.tsx` | FAMILY idle/hover |
| `components/spaces/trip-space-tabs.tsx` | TRIP idle/hover |
| `components/expenses/expense-list.tsx` | Slim list + edit fetch UX |
| `components/ui/tabs.tsx` | Trigger hover/focus hooks |
| `components/spaces/prefetch-space-link.tsx` | Home intent prefetch |
| `components/spaces/home-space-speculation.tsx` | Speculation Rules |
| `app/layout.tsx` | Font subsetting / LCP |

---

## 8. What NOT to regress

1. **Silent prefetch ≠ busy.** Idle/hover/focus must use `{ silent: true }` / `prefetchTab`. Never set `pendingTab` for warm paths.
2. **No `startTransition` around tab data fetches** in `useDeferredSpaceTabs` (delays list paint).
3. **Keep `tabInflight` dedupe** — rapid switches / double prefetch must share one promise.
4. **List without splits; edit with `getExpenseForEdit`.** Re-bundling splits into list queries undoes the slim ledger win.
5. **BUILDING default charges:** do not force expenses onto initial RSC when `activeTab !== "expenses"`.
6. **Client tab loads:** keep `includeChargeProofs: false`; hydrate via `loadSpaceChargeProofs`.
7. **Static `ExpenseList`** in BUILDING/FAMILY/TRIP shells (dynamic import regresses perceived tab speed).
8. **Money = integers**; mutations = Server Actions only.
9. **Bump `APP_VERSION` by 0.01** on every product code change-set.

---

## 9. Vercel React Best Practices pass (3.45–3.46)

Full write-up: [PERF_VERCEL_REACT_AUDIT.md](./PERF_VERCEL_REACT_AUDIT.md).

Highlights landed in this pass:

- Auth on `listDueSoonDebtsForUser` / `listDueSoonInternalLoansForUser` / `ensureRecurringExpenses`
- `Promise.all` on space/resident/board/settings/member gates; skip deferred double-fetch for expenses + building view
- Share summary built on click via `getShareSummaryText` (no 200-row hero payload)
- Home streams summary/list behind Suspense; membership-independent queries in one wave
- Building `notify*` scheduled with `after()`
- Dialog vs Drawer code-split for invite / add-expense / expense-edit; theme bootstrap script; `optimizePackageImports: ['recharts']`
- **3.46:** `requireCurrentUser` cache, Zod-before-auth on expense/building mutations, content-visibility on fund lists, localStorage `:v1:` keys, chart derived active key, bill-tags lazy init

---

## 10. Optional follow-ups (NOT done)

- Real Network-throttling measurement (Chrome DevTools Slow 3G / Fast 3G) of BUILDING charges → expenses with and without idle prefetch — no formal numbers recorded here.
- Composite DB indexes tuned to ledger keyset (`spaceId` + `date` + `id`). Expense already has `@@index([spaceId, date, transactionType])` and single-column `date` / `spaceId`; a dedicated keyset index was **not** added as part of this work.
- Broader FUND / resident-portal latency passes beyond existing parallel loads (see older lazy-load commits) — out of scope of the recent tab/prefetch pass unless re-measured.

---

## 11. Quick regression checklist

When changing this area:

- [ ] Default BUILDING tab = charges → Network: no full expense ledger on first document for that visit
- [ ] Hover expenses tab (without click) → fetch may run; **no** skeleton flash
- [ ] Click expenses before idle warm finishes → skeleton OK, then list; no stuck busy state
- [ ] Open expense edit → one `getExpenseForEdit` call; list rows still lack splits
- [ ] Charges paint without waiting on proofs; proofs appear shortly after for managers
- [ ] `APP_VERSION` bumped if product code changed
