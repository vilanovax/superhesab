# Pilot Dogfood — Create Trip flow

**Date:** 2026-08-10  
**Persona:** first-time trip organizer (time-pressed, Persian, mobile)  
**Environment:** `http://localhost:3003` (dev), logged-in account «علی»  
**Note:** Account was **not** empty (5 spaces) — pilot ran the **returning-user** create path (`دفتر جدید`). Empty-home path still needs a fresh account for human sessions.

Related: [usability-test-plan-trip-create.md](./usability-test-plan-trip-create.md), [usability-tasks-trip-create.md](./usability-tasks-trip-create.md)

---

## Verdict: Fail (pilot)

Create Trip works. Post-create invite path is discoverable. **First expense sheet opens empty** — Task 3 blocked. Dev hydration/runtime errors present on home and space pages.

---

## Interaction Manifest

```
INTERACTION MANIFEST — Create Trip pilot
  Persona: trip organizer, first-run mental model, mobile viewport
  [✓] Opened /app (returning user: ۵ دفتر فعال)
  [✓] Clicked «دفتر جدید»
  [✓] Typed name «سفر پایلوت UX» into نام دفتر
  [✓] Left type = سفر (پیش‌فرض پیشنهادی)
  [✓] Clicked «ساخت «سفر پایلوت UX»» → pending «در حال ساخت…»
  [✓] Redirected to /spaces/cmsmtxgcg000a6ot8x9smuejx — heading «سفر پایلوت UX», ۱ عضو · ۰ هزینه
  [✓] Clicked «دعوت همسفر» → sheet «مدیریت اعضا»
  [✓] Clicked «کپی لینک فضا»
  [✓] Typed «سارا» + «افزودن» → UI stuck «در حال افزودن…»
  [✓] After reload: hero shows ۲ عضو (server succeeded; UI never cleared busy)
  [✗] Opened «ثبت هزینه» sheet — dialog open but no inputs (empty form)
  [✓] Console/dev overlay: hydration error AppHomePage; useDeferredSpaceTabs error
```

---

## Task outcomes

| Task | Result | Notes |
|---|---|---|
| 1 Create trip | **Pass** | Clear CTA, Trip default, pending label, redirect with correct name |
| 2 Invite / add friend | **Conditional** | Invite sheet + copy link OK; ghost-member pending state stuck until reload |
| 3 First expense | **Fail** | Sheet title only — no amount/title/split fields |

---

## Findings

### Critical

**P1 — Expense create sheet renders empty**  
- **Surface:** `/spaces/{id}?tab=expenses` → «ثبت هزینه» / FAB  
- **Observed:** Dialog opens; DOM has `role=dialog` but `inputs=[]`; a11y only shows heading «ثبت هزینه»  
- **Expected:** Amount, title, payer, split controls  
- **Blocks:** Task 3 / killer flow after create  
- **Suspected:** runtime error in `components/spaces/use-deferred-space-tabs.ts` (dev overlay) cascading into expense sheet mount  

### High

**P2 — Ghost member add leaves UI stuck in busy**  
- **Surface:** Members sheet → «افزودن دستی»  
- **Observed:** Button stays «در حال افزودن…», fields disabled; after hard reload member count is ۲  
- **Expected:** Busy clears, list shows new member without reload  
- **Impact:** User thinks invite failed  

**P3 — React hydration error on `/app`**  
- **Surface:** `app/(app)/app/page.tsx` (~line 433 `AppHomePage`)  
- **Observed:** Next.js issues overlay: hydration mismatch (locale/date/`typeof window` class of causes)  
- **Impact:** Dev noise; can break interactive tree / confuse a11y automation  

### Medium

**P4 — No success confirmation after create**  
- Redirect-only; no toast. Worked for pilot but first-time users may hesitate («ساخته شد؟»). Worth probing in human sessions.

**P5 — Terminology mix on landing**  
- Hero: «فضای مشترک» + badge «سفر و دورهمی» + create copy «دفتر». Capture in debrief Q2 of human script.

### What worked

- «دفتر جدید» easy to find for returning users  
- Trip preselected + «پیشنهادی»  
- Submit label mirrors typed name  
- Empty expenses CTA pair («ثبت اولین هزینه» / «دعوت همسفر») is goal-shaped for Tasks 2–3  
- Invite sheet structure (link + ghost member) matches real trip prep  

---

## Recommendations (pilot → before human batch)

1. Fix expense sheet empty mount (P1) — block human Task 3 until green  
2. Fix members-sheet pending/revalidate (P2)  
3. Fix/suppress AppHomePage hydration (P3)  
4. Recruit with **empty** accounts for Task 1 empty-home path  
5. Keep task wording as written — pilot did not need path hints  

---

## Next steps

- [ ] Fix P1–P3  
- [ ] Re-run this pilot (same 3 tasks) on empty account  
- [ ] Run 5 moderated sessions per the plan  
- [ ] Publish `usability-findings-trip-create.md` after batch  
