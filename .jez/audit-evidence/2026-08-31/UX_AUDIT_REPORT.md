# SuperHesab UX Audit — 2026-08-31

═══════════════════════════════════════════════════════════
VERDICT: Conditional Pass (post fix-and-verify; axe not measured)

Findings (remaining):
  Critical: 0    High: 0    Medium: 0    Low: 0

Fixed this session: F1 ✓  F2 ✓  F3 ✓  F4 ✓  F5 ✓  F6 ✓  F7 ✓  F8 ✓

Self-critique pass (in-session prune): Drafted: 12  Kept: 8  Generic: 3  Duplicate: 1

Time per phase: Phase 3 ~12m / Total ~20m (+ fix-verify ~15m)
Manifest plausibility: ≥18 entries, median gap >0.5s, 12 screenshots, console reads on key flows

TOP 5 (original) — all High/Medium patched:
  1. F1 ✓ Hero year-scoped expense count
  2. F2 ✓ Persian digits in building hero
  3. F3 ✓ Home card shows واحد for BUILDING
  4. F4 ✓ Debt CTA «ثبت طلب یا بدهی»
  5. F5 ✓ تومان moved off create button
═══════════════════════════════════════════════════════════

## Persona Lock

- نقش: مدیر ساختمان که روزانه وصول شارژ و معوق واحدها را چک می‌کند
- دستگاه: موبایل 375 اول؛ دسکتاپ 1440 برای sanity
- tech comfort: متوسط
- احساس: عجله + بی‌اعتمادی به عددهای ناهماهنگ
- First-time-user lens: روی create space، طلب/بدهی، و تب شارژ اعمال شد

## Sitemap (product, this pass)

| Route | Purpose |
|-------|---------|
| `/app` | Spaces home + create |
| `/spaces/[id]?tab=charges` | وصول ماهانه |
| `?tab=units` | واحدها + دعوت |
| `?tab=debts` | طلب/بدهی موردی |
| `?tab=expenses` | هزینه مشاع |
| `?tab=report` | گزارش بازه |
| Create sheet | دفتر جدید |

Admin / invite / resident portal: out of this pass scope.

## Threads walked

1. **Home → Create drawer** — typed name, selected ساختمان, cancelled (no create)
2. **Building وصول** — open ثبت for ابراهیمی، نیمه‌پرداخت + مبلغ، dirty discard
3. **Units / Debts / Expenses / Report** — round-trip tabs; compared counts

---

## Findings

### F1 — Hero expense count ignores plan year (۲۶ vs ۲۲)
- **Layer:** Feedback / Architecture
- **Severity:** High
- **Surface:** Building hero + تب هزینه + تب گزارش · 375
- **Persona:** building-manager-mobile
- **Reproduce:**
  1. Open ظفر ۴۰۵ (year chip ۱۴۰۵).
  2. Read hero subtitle: `26 هزینه` (Latin).
  3. Open تب هزینه → chip `همه ۲۲`.
  4. Open تب گزارش → `۲۲ هزینه`.
- **Observed:** Hero all-time count; list/report year-scoped to ۱۴۰۵.
- **Expected:** Same scope as year chip / list (۲۲ for ۱۴۰۵), or label «همه سال‌ها».
- **Evidence:** screenshots 08-expenses, 11-report-tab; a11y text.
- **Suspected location:** `lib/spaces/space-page-ctx.ts` `loadExpenseHeroStats` (no year) vs `loadSpaceExpensesPage(..., planYear)`; `components/spaces/building-dashboard.tsx` rendering `expenseCount`.
- **Smallest possible patch:** Pass `planYear` into `loadExpenseHeroStats` and apply `jalaliYearBounds` like expenses page; format with `formatFaDigits`.

### F2 — Latin digits in building hero KPIs
- **Layer:** Visual / Interaction
- **Severity:** High
- **Surface:** Building hero (all tabs) · 375/1440
- **Persona:** building-manager-mobile
- **Reproduce:** Open any building tab; read subtitle and progress %.
- **Observed:** `12 واحد · 1 مدیر · 26 هزینه` and `31٪` (ASCII); money uses Persian digits.
- **Expected:** Persian digits throughout (`۱۲ واحد · ۱ مدیر · ۲۲ هزینه`, `۳۱٪`).
- **Evidence:** a11y snapshot; screenshot 03; DOM probe latinSamples.
- **Suspected location:** `components/spaces/building-dashboard.tsx` lines ~68–71, ~134–150 (`{activeUnits}`, `{memberCount}`, `{expenseCount}`, `{collectPct}` without `formatFaDigits`).
- **Smallest possible patch:** Wrap all numeric displays with `formatFaDigits` (and report % similarly).

### F3 — Home lists building as «۱ عضو» instead of units
- **Layer:** Interaction / Delight
- **Severity:** High
- **Surface:** `/app` space cards · 375
- **Persona:** building-manager-mobile
- **Reproduce:** Open `/app`; read ظفر ۴۰۵ meta line.
- **Observed:** `ساختمان · ۱ عضو` while space has ۱۲ واحد.
- **Expected:** e.g. `ساختمان · ۱۲ واحد` (or `۱ مدیر · ۱۲ واحد`).
- **Evidence:** a11y on `/app`; screenshot 02.
- **Suspected location:** `app/(app)/app/page.tsx` ~223 (`${formatFaDigits(space._count.members)} عضو` for all types).
- **Smallest possible patch:** Branch `space.type === "BUILDING"` to show unit count (needs `_count.units` or existing field on home query).

### F4 — Debt primary button repeats tab name
- **Layer:** Interaction
- **Severity:** Medium
- **Surface:** `?tab=debts` · 375
- **Persona:** first-time-user lens
- **Reproduce:** Open طلب و بدهی; look at full-width primary button.
- **Observed:** Button label `طلب / بدهی` (same as tab). Helper text explains «جدا از شارژ» but CTA itself is opaque.
- **Expected:** Action verb e.g. `ثبت طلب` / `ثبت طلب یا بدهی`.
- **Evidence:** screenshot 07-debts-tab; `debt-panel.tsx` ~617.
- **Suspected location:** `components/spaces/debt-panel.tsx` Button children `"طلب / بدهی"`.
- **Smallest possible patch:** Change label to `ثبت طلب` (already used elsewhere in same file ~702).

### F5 — Create-space CTA shows «تومان» under ساخت
- **Layer:** Feedback
- **Severity:** Medium
- **Surface:** دفتر جدید drawer · 375
- **Persona:** first-time-user
- **Reproduce:** `/app` → جدید → fill name; read primary button.
- **Observed:** `ساخت «تست UX حساب»` with secondary line `تومان` — reads like a fee.
- **Expected:** Currency as quiet caption near type, or «واحد پول: تومان» outside the button.
- **Evidence:** screenshot 10-create-space.png.
- **Suspected location:** `components/spaces/create-space-form.tsx` submit button content.
- **Smallest possible patch:** Move currency out of the primary button (caption under نوع دفتر).

### F6 — Report percentages use Latin digits
- **Layer:** Visual
- **Severity:** Medium (same root family as F2)
- **Surface:** `?tab=report`
- **Reproduce:** Open گزارش; read «50٪», «38٪».
- **Observed:** Latin % next to Persian money.
- **Expected:** `۵۰٪`.
- **Evidence:** a11y snapshot report tab.
- **Suspected location:** building report components rendering raw `%` numbers.
- **Smallest possible patch:** `formatFaDigits(pct)`.

### F7 — Dirty-close flash clears unit name in sheet title
- **Layer:** Feedback
- **Severity:** Low
- **Surface:** وصول sheet after «بستن بدون ذخیره»
- **Reproduce:** Edit وصول → انصراف → بستن بدون ذخیره; watch title before fully unmounted.
- **Observed:** Title briefly `وصول — واحد ` (name gone) while dialog `data-state=closed` still visible.
- **Expected:** Keep last name until unmount, or unmount immediately.
- **Evidence:** CDP after discard; screenshot 05.
- **Suspected location:** `components/spaces/building-charges-panel.tsx` (~799 `payUnit?.name`) clearing unit before close animation ends.
- **Smallest possible patch:** Don’t null `payUnit` until `onOpenChange(false)` animation complete / keep last label in local ref.

### F8 — «طلب / بدهی» tab wraps as دو خط روی موبایل
- **Layer:** Visual
- **Severity:** Low
- **Surface:** Building tabs · 375
- **Observed:** Visible label splits طلب / بدهی; a11y also shows duplicated text patterns.
- **Expected:** Single-line readable tab (shorter label or scrollable tabs).
- **Evidence:** screenshot 03; tab DOM.
- **Suspected location:** `components/spaces/building-space-tabs.tsx` TabsTrigger for debts.
- **Smallest possible patch:** Use `طلب` alone on xs, or `طلب‌بدهی` without slash wrap.

---

## Fixed since 2026-08-10 (regression check)

- Viewport `maximumScale: 1` removed — current meta has no max scale.
- No Next hydration overlay observed this session on `/app` / building.

## Hard-gate notes

- axe-core not runnable in this environment (CDN + public `.js` 404 except `sw.js`). Treat a11y gate as **unknown**; do not claim Pass.
- No console errors/warnings hooked during interactions.

## Perfection Roadmap

### Quick Wins (24–48h)
- F2/F6 `formatFaDigits` on building hero + report %
- F4 CTA copy → `ثبت طلب`
- F5 move تومان off create button
- F1 year-scope hero expense count

### Structural (1–2 weeks)
- F3 home meta by template (units for BUILDING)
- Align all building counts to `planYear` chip as single source of truth
- F7 close-animation state hygiene for sheets

### Advanced Polish
- Tab overflow / shorter labels on 5-tab building chrome
- Stronger first-run distinction: شارژ معوق vs طلب موردی

## Hold this in your hands

If this app were a physical ledger, the binding is handsome and the monthly charge pages feel like a real building office — but the cover page still says «one member» for a twelve-unit building, and the spine number (۲۶) doesn’t match the pages inside (۲۲). A manager under time pressure will stop trusting the ink. Fix the counts and the digits first; then the object feels worth carrying every morning.

---

## Fix-and-verify (2026-08-31 session)

| ID | Status | Re-walk proof |
|----|--------|---------------|
| F1 | ✓ fixed | Hero `۲۲ هزینه` matches expenses/report after rebuild |
| F2 | ✓ fixed | Hero `۱۲ واحد · ۱ مدیر · ۲۲ هزینه` + `۳۱٪` Persian |
| F3 | ✓ fixed | `/app` ظفر ۴۰۵ → `ساختمان · ۱۲ واحد` |
| F4 | ✓ fixed | Button text `ثبت طلب یا بدهی` |
| F5 | ✓ fixed | Create submit `ساخت «سفر»`; currency as `بعداً عوض نمی‌شود · تومان` |
| F6 | ✓ fixed | Report `۵۰٪` / `۳۸٪` / `۲۲ هزینه` Persian |
| F7 | ✓ fixed | Title kept `وصول — واحد ابراهیمی` on discard; payOpen + delayed clear |
| F8 | ✓ fixed | Mobile tab single-line `طلب` (aria-label طلب و بدهی) |

APP_VERSION bumped through `3.90`.

---

## Fix-and-verify?

Found **0 Critical / 3 High / 3 Medium**. Want me to patch F1–F5 now and re-walk those slices?
