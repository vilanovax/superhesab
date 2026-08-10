# INTERACTION MANIFEST — SuperHesab UX Audit 2026-08-10

Persona: Iranian traveler, mobile-first (375), medium tech comfort, anxious about “who owes what”

## Capability tests
- [✓] 09:16 Screenshot `/app` mobile (audit-01)
- [✓] 09:16 Element query (interactive count, dir=rtl)
- [✓] 09:16 Console collector + Network.enable
- [✓] overflowXDoc true on `/app` @375

## Thread 1 — Auth → Spaces
- [✓] 09:17 Opened user menu → خروج (first click sticky; second → `/login`)
- [✓] 09:17 Screenshot login (audit-02)
- [✓] Typed `09120000001` into موبایل
- [✓] Clicked دریافت کد → OTP step (loading «در حال ارسال…»)
- [✓] Typed `111111` into کد تأیید
- [✓] Clicked تأیید و ورود → `/app` «سلام، علی»
- [✓] `/register` verified (نام نمایشی + موبایل + دریافت کد تأیید)

## Thread 2 — Trip + invite + join
- [✓] 09:18 Clicked دفتر جدید → Trip selected
- [✓] Typed `سفر تست UX` → screenshot (audit-03)
- [✓] Clicked ساخت → `/spaces/cmsmt9mpd00006ot8uyphw1rt` empty (audit-04)
- [✓] Settings → مدیریت اعضا → کپی لینک دعوت path `/invite/{id}`
- [✓] Ali on invite: «از قبل عضو»
- [✓] Logout → Sara `09120000002` / OTP → invite → پیوستن به فضا
- [✓] Verified `2 عضو` + Sara can open expense form (EDITOR)

## Thread 3 — Expense equal split
- [✓] 09:21 Opened ثبت اولین هزینه
- [✓] Typed title `ناهار رستوران`, amount `200000`, category خوراک, split مساوی
- [✓] Verified splits علی ۱۰۰٬۰۰۰ + من ۱۰۰٬۰۰۰ (= total)
- [✓] Noted confusing `۲ نفر · ۴ سهم` (half-units)
- [✓] Screenshot (audit-05) → ثبت هزینه
- [✓] Hero updated; empty state stale (audit-06) — F3
- [✓] Hard reload expenses → list shows ناهار رستوران

## Thread 4 — Balances + Settlement
- [✓] `?tab=balances` → «علی به شما بدهد ۱۰۰٬۰۰۰»
- [✓] Screenshot (audit-07) → ثبت → تأیید «بله، پرداخت شد»
- [✓] Verified «حساب‌ها صاف است» / تسویه باز صفر

## Thread 5 — Partner
- [✓] Opened `/spaces/cmrzz4dwh000r5st8v5sg09us`
- [✓] Added `قهوه دونفره` 50٬000 (۵۰–۵۰ copy clear)
- [✓] Balance −۱۱۵٬۰۰۰ → −۹۰٬۰۰۰; list count stale until refresh

## Thread 6 — Personal
- [✓] Confirmed PERSONAL absent from create TEMPLATES — skipped budget dashboard

## Polish / gates
- [✓] axe `/app`: critical meta-viewport
- [✓] axe trip: critical meta-viewport + serious aria-prohibited-attr
- [✓] axe login: critical meta-viewport
- [✓] Desktop 1440 screenshot (audit-08)
- [✓] Perf /app: FCP ~1.07s, CLS 0
- [✓] Hydration issues observed throughout Phase 3

## Skipped (explicit)
- Heavy seed 500+
- Destructive delete (needs confirmation)
