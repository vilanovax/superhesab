# SuperHesab UX Audit — 2026-08-10

═══════════════════════════════════════════════════════════
VERDICT: Fail

Persona: iranian-traveler-mobile (مسافر ایرانی، موبایل‌اول، عجله، نگران «کی چقدر بدهکاره»)
Surfaces audited: 9 / ~12 product routes (login, register, /app, trip space expenses/balances/settings/invite, partner space; Personal create N/A)
Interaction Manifest: complete (see MANIFEST.md)

Hard Gates: console errors ≥1 (hydration), warnings ≥1 (hydration overlay), network 5xx 0, 403/404 auth 0, layout-collapse 1 (375 overflowX), axe Critical 1 (meta-viewport), axe Serious 1 (aria-prohibited-attr)
Performance (on /app): LCP n/a (API null on soft nav) / FCP ~1.07s / CLS 0 / INP n/a — thresholds 4.0s / 0.25 / 500ms (pragmatic OK where measured)

Findings:
  Critical: 2    High: 4    Medium: 5    Low: 1

Self-critique pass (sub-agent): Drafted: 12  Kept: 8  Generic: 3  Duplicate: 1
(Hard-gate items F2/F4 retained despite “generic” tag — gates cannot be dropped.)

Time per phase: Phase 3 ~12m / Total ~20m
Manifest plausibility: ≥20 entries, median gap >0.5s, 8 screenshots, console/axe reads on key routes

TOP 5 (ranked by impact × ease, senior-designer pick):
  1. F3 Expense list stale after create — ledger trust break for debt-anxious user
  2. F1 Hydration errors on money home/hero — hard gate + trust
  3. F5 Trip “۴ سهم” equal-split copy — confuses equal split
  4. F2 Viewport maximumScale:1 — axe Critical hard gate
  5. F7 Settlement arrow direction vs “علی به شما بدهد” — who paid whom
═══════════════════════════════════════════════════════════

## Persona Lock

- نقش: مسافر ایرانی که می‌خواهد خرج سفر را با دوستان تسویه کند  
- دستگاه: موبایل 375 اول، دسکتاپ 1440 بعد  
- tech comfort: متوسط  
- احساس: نگران گم‌شدن بدهکاری‌ها  
- First-time-user lens: applied on auth, create trip, invite, expense, settlement  

## Sitemap (product)

| Route | Purpose |
|-------|---------|
| `/login` | OTP / password login |
| `/register` | Name + phone signup |
| `/app` | Spaces list + net balance hero |
| `/spaces/[id]` | Trip/Partner ledger (tabs) |
| `/spaces/[id]/settings` | Name, currency, members, invite |
| `/invite/[id]` | Join space |
| `/app/archive` | Archived spaces |
| `/app/settings` | App settings |
| Personal create | **Not in create TEMPLATES** |

Admin routes out of persona scope.

## Threads walked

1. **Auth → Spaces** — Logout → login Ali OTP `09120000001` / `111111` → `/app`. Register page UI verified (`/register`).  
2. **Create Trip → invite → join EDITOR** — Created `سفر تست UX`; invite `/invite/cmsmt9mpd00006ot8uyphw1rt`; Sara `09120000002` joined → 2 members, role ویرایشگر.  
3. **Expense equal split** — Sara added `ناهار رستوران` 200٬000؛ splits 100k+100k؛ sum OK.  
4. **Balances → Settlement** — تراز showed «علی به شما بدهد»؛ confirmed «بله، پرداخت شد» → balances cleared.  
5. **Partner** — Opened `حساب مشترک من و سارا`؛ added `قهوه دونفره` 50٬000 (۵۰–۵۰). Balance moved −115k → −90k.  
6. **Personal** — Not creatable from «دفتر جدید» (no PERSONAL tile). Skipped dashboard/budget.  

Skipped: heavy seed 500+, destructive deletes (awaiting confirmation).

---

## Findings

### F1 — React hydration errors on home & space chrome
- **Layer:** Architecture  
- **Severity:** Critical (hard gate: console errors)  
- **Surface:** `/app`, `/spaces/[id]` · 375 · default  
- **Persona:** iranian-traveler-mobile  
- **Reproduce:**  
  1. Login as seed user.  
  2. Open `/app` or any space.  
  3. Observe Next.js Dev Tools “1 Issue” / hydration overlay.  
- **Observed:** Hydration mismatch referenced `app/(app)/app/page.tsx` (~419), `home-summary-card.tsx` `NetHeadline`, `space-page-hero.tsx`. Visible Latin `4 دفتر فعال` vs Persian digits elsewhere.  
- **Expected:** Zero hydration mismatches; consistent fa-IR numerals server+client.  
- **Evidence:** Next overlay text; screenshots audit-01, audit-06.  
- **Suspected location:** `app/(app)/app/page.tsx:430` (`${spaceCount}`), `components/spaces/home-summary-card.tsx:47`, `app/spaces/[id]/space-page-hero.tsx`  
- **Smallest possible patch:** Format counts with `new Intl.NumberFormat("fa-IR")` (or shared helper) in RSC output; audit Amount/hero for client-only formatting.

### F2 — Viewport disables pinch-zoom
- **Layer:** Interaction / a11y  
- **Severity:** Critical (axe hard gate)  
- **Surface:** All pages  
- **Persona:** iranian-traveler-mobile  
- **Reproduce:** Inject axe → `meta-viewport` critical.  
- **Observed:** `maximum-scale=1` in viewport meta.  
- **Expected:** Users can zoom (esp. money amounts).  
- **Evidence:** axe on `/app`, trip, login.  
- **Suspected location:** `app/layout.tsx:78-87` (`maximumScale: 1`)  
- **Smallest possible patch:** Remove `maximumScale: 1` from `viewport` export.

### F3 — Expense list stale after successful create
- **Layer:** Feedback / Interaction  
- **Severity:** High  
- **Surface:** Trip + Partner expenses tab · 375  
- **Persona:** iranian-traveler-mobile  
- **Reproduce:**  
  1. In trip with empty list, add equal-split expense.  
  2. Watch hero update to «۱ هزینه» while body still shows «هنوز هزینه‌ای ثبت نشده».  
  3. Hard reload → list appears. Partner: toast «ثبت شد», balance updates, count stays «۲ هزینه».  
- **Observed:** Soft navigation / cache does not refresh expense list.  
- **Expected:** List + count update immediately after mutation (round-trip integrity).  
- **Evidence:** audit-06-after-expense.png; partner post-create DOM text.  
- **Suspected location:** `components/expenses/expense-list.tsx`, `app/actions/expense.ts` revalidatePath, `app/spaces/[id]/space-page-body.tsx` deferred tab cache  
- **Smallest possible patch:** Ensure `revalidatePath`/`router.refresh()` after create closes drawer and invalidates expenses payload; don’t keep empty-state branch when hero count > 0.

### F4 — `aria-label` on roleless div (member avatars)
- **Layer:** Interaction / a11y  
- **Severity:** High (axe Serious hard gate)  
- **Surface:** Trip space hero  
- **Persona:** iranian-traveler-mobile  
- **Reproduce:** axe on trip expenses → `aria-prohibited-attr`.  
- **Observed:** `<div … aria-label="2 عضو">` without role.  
- **Expected:** Use `role="group"` or put label on interactive control.  
- **Evidence:** axe sample HTML.  
- **Suspected location:** `app/spaces/[id]/space-page-hero.tsx:583-586`  
- **Smallest possible patch:** Add `role="group"` (or wrap avatars in that role).

### F5 — Equal split summary «۲ نفر · ۴ سهم»
- **Layer:** Feedback  
- **Severity:** High  
- **Surface:** Trip ExpenseForm · 375  
- **Persona:** iranian-traveler-mobile  
- **Reproduce:** Open expense form with 2 members, equal split, coeffs ×۱.  
- **Observed:** Copy shows ۴ سهم (half-units: 2+2). Amounts still correct (100k+100k).  
- **Expected:** «۲ نفر · مساوی» or «هر نفر ۱ سهم» without half-unit jargon.  
- **Evidence:** audit-05-expense-equal-split.png; a11y name `۲ نفر · ۴ سهم · مساوی`.  
- **Suspected location:** `components/ExpenseForm.tsx:1479-1480` (`totalShareWeight` half-units)  
- **Smallest possible patch:** Display `totalShareWeight / 2` person-shares, or hide سهم count when all weights equal.

### F6 — Create-space submit name includes `تومان`
- **Layer:** Interaction  
- **Severity:** Medium  
- **Surface:** `/app` create dialog  
- **Persona:** iranian-traveler-mobile  
- **Reproduce:** Open دفتر جدید, type name → button name `ساخت «سفر تست UX» تومان`.  
- **Observed:** Currency leaks into accessible/visible CTA.  
- **Expected:** `ساخت «سفر تست UX»` only.  
- **Evidence:** Interaction snapshot during create.  
- **Suspected location:** `components/spaces/create-space-form.tsx` submit label  
- **Smallest possible patch:** Separate currency control from submit label string.

### F7 — Settlement direction arrow ambiguous in RTL
- **Layer:** Feedback  
- **Severity:** Medium  
- **Surface:** Trip balances confirm dialog  
- **Persona:** iranian-traveler-mobile  
- **Reproduce:** On تراز, tap ثبت on «علی به شما بدهد» → dialog shows `علی ← من`.  
- **Observed:** Arrow can be read opposite of suggestion copy.  
- **Expected:** Explicit verb: «علی به من پرداخت کرد» / same wording as list.  
- **Evidence:** audit confirmation dialog (settlement).  
- **Suspected location:** settlement confirm component under balances UI  
- **Smallest possible patch:** Replace arrow with sentence matching suggestion row.

### F8 — Horizontal overflow on `/app` @ 375
- **Layer:** Visual  
- **Severity:** Medium  
- **Surface:** `/app` · 375  
- **Persona:** iranian-traveler-mobile  
- **Reproduce:** `document.documentElement.scrollWidth > clientWidth` → true.  
- **Observed:** Document-level overflow-x.  
- **Expected:** No horizontal scroll on home.  
- **Evidence:** Capability JS on audit start.  
- **Suspected location:** Home quick-action row / summary card widths  
- **Smallest possible patch:** Constrain quick actions (`min-w-0`, overflow hidden) and re-test at 375.

### F9 — Personal template not creatable
- **Layer:** Architecture  
- **Severity:** Medium  
- **Surface:** Create space dialog  
- **Persona:** iranian-traveler-mobile  
- **Reproduce:** Open دفتر جدید — templates are Trip/Partner/Family/Fund/Building only.  
- **Observed:** `PERSONAL` exists in schema/actions but not `TEMPLATES`.  
- **Expected:** If Personal is product-active, show tile + budget dashboard; else hide completely from docs.  
- **Evidence:** `components/spaces/create-space-form.tsx:22-49`  
- **Smallest possible patch:** Add PERSONAL tile **or** document as deprecated and remove leftover UI copy.

### F10 — Invite exposes ناظر (VIEWER)
- **Layer:** Architecture  
- **Severity:** Low–Medium (product rule)  
- **Surface:** Members manage drawer  
- **Persona:** iranian-traveler-mobile  
- **Reproduce:** Settings → مدیریت اعضا → نقش عضو جدید shows ویرایشگر + ناظر.  
- **Observed:** VIEWER selectable; product rules say Viewer is v2.  
- **Expected:** EDITOR only for Trip/Partner invites.  
- **Evidence:** Drawer text during invite.  
- **Suspected location:** `components/MembersList.tsx` role select  
- **Smallest possible patch:** Filter VIEWER out of role options for Trip/Partner.

### F11 — Empty trip hero says «تسویه‌شده»
- **Layer:** Delight / Feedback  
- **Severity:** Medium  
- **Surface:** New trip empty state  
- **Persona:** iranian-traveler-mobile  
- **Reproduce:** Create trip with 0 expenses → hero «مانده شما / تسویه‌شده».  
- **Observed:** Reads as “all settled” before any money exists.  
- **Expected:** «هنوز هزینه‌ای نیست» / neutral empty balance.  
- **Evidence:** audit-04-trip-empty.png  
- **Suspected location:** `app/spaces/[id]/space-page-hero.tsx` balance empty branch  
- **Smallest possible patch:** If expenseCount===0, show empty copy instead of settled.

---

## Interaction Manifest (summary)

See `MANIFEST.md`. Key proofs:
- Typed phone + OTP (Ali, Sara)  
- Created trip, copied invite path, Sara joined  
- Typed expense title/amount; verified 100k+100k=200k  
- Confirmed settlement → zero open balance  
- Partner expense 50k; net debt −90k  
- Screenshots before/after primary actions  
- Console/axe after key routes  

## Scenario battery (abbrev)

| # | Scenario | Result |
|---|----------|--------|
| 1 | First Contact | Auth clear; «دفتر» learnable; «۴ سهم» fails lens |
| 2 | Interrupted | Not fully re-tested mid-form |
| 3 | Wrong Turn | Settings ↔ space recoverable |
| 4 | Returning | Home shows balances; quick actions help |
| 5 | Keyboard | Partial (tabs present); not exhaustive |
| 6 | Heavy Data | **Skipped** (per request) |
| 7 | Destructive | **Ask before** delete |
| 8 | Second User | Sara EDITOR join OK |
| 9 | Lifecycle | Owner Ali vs invitee Sara exercised |
| 10 | Round-trip | **FAIL** F3 |
| 11 | Data seasoning | Seed Day-ish data used; not full horizons |

## Perfection roadmap

**Quick wins (24–48h)**  
F2 viewport, F4 role=group, F5 share label, F6 CTA label, F11 empty settled copy, F10 hide VIEWER  

**Structural (1–2w)**  
F1 hydration numeral consistency, F3 expense list revalidation, F7 settlement copy  

**Advanced**  
Personal template decision, skeleton/list optimistic UX polish  

## Hold this in your hands

SuperHesab already feels like a real Iranian money notebook — Persian copy, OTP, trip invite, and settlement confirmation are close to something you’d trust on a late-night bus. But the moment after you save a lunch expense and the screen still says “هنوز هزینه‌ای ثبت نشده” while the hero claims one expense, the anxious traveler’s worst fear flashes: *did my money land?* Fix that round-trip and the half-unit “۴ سهم” jargon, and this object goes from “almost” to something you’d actually hand your friends.

---

## Fix-and-verify offer

Found **2 Critical** and **4 High** issues (plus Mediums).  
**Fix them now and re-verify?**

---

## Re-verify — 2026-08-10 (post-fix, `APP_VERSION` 3.47)

| ID | Status | Evidence |
|----|--------|----------|
| F1 | ✓ | `/app` shows `۶ دفتر فعال` (Persian digits). Money via deterministic `formatMoney` / `formatFaDigits`. |
| F2 | ✓ | Viewport `width=device-width, initial-scale=1, viewport-fit=cover` — no `maximumScale`. axe Critical `meta-viewport` gone. |
| F3 | ✓ | Created `تاکسی فرودگاه` 100k equal-split → hero `۲ هزینه · جمع ۳۰۰٬۰۰۰` and list shows both expenses without hard reload. |
| F4 | ✓ | Non-owner member avatars: `role="group"` + `aria-label`. axe Serious `aria-prohibited-attr` gone on `/app` + trip. |
| F5 | ✓ | Equal split copy: `۲ نفر · مساوی` + per-person amounts; no `N سهم`. |
| F6 | ✓ | Create submit `aria-label={ساخت «…»}`; currency `aria-hidden`. |
| F7 | ✓ | Confirm dialog: `سارا به من پرداخت کرد` (no RTL arrow). |
| F10 | ✓ | Trip/Partner: `allowViewerRole` false unless family invite picker. |
| F11 | ✓ | `expenseCount === 0` → `بدون هزینه` in `TripHeroStats`. |
| F8/F9 | — | Not in this fix pass (Medium / product decision). |

**Hard gates (re-check):** axe Critical/Serious = 0 on `/app` and trip expenses. No `Maximum update depth` after removing the deferred-tabs sync effect (that effect had caused empty streaming shell).  

**Note:** Cursor browser a11y injection (`data-cursor-ref`) can false-trigger Next hydration overlays during automation; diffs showed attribute injection, not numeral drift. Real-user path verified via Persian digit copy + expense round-trip.

**Verdict after fix:** Pass for Critical/High audit items (F1–F5, F7, F10, F11). Mediums F8/F9 remain open.
