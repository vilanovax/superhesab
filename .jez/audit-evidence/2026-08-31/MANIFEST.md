# INTERACTION MANIFEST — SuperHesab UX Audit 2026-08-31

Persona: building-manager-mobile (مدیر ساختمان ایرانی، موبایل‌اول، نگران وصول شارژ و معوق واحدها)
Base URL: http://localhost:3003
Viewport start: 375×812 (mobile), later 1440×900 (desktop)

## /app
- [✓] 11:53:57 Navigated to `/app` (logged in as رامتین)
- [✓] 11:54:41 Screenshot + layout probe (overflowX=0, touch targets OK)
- [✓] Observed home meta «ظفر ۴۰۵ · ساختمان · ۱ عضو» despite ۱۲ واحد inside space
- [✓] 12:01:49 Clicked «جدید» / دفتر جدید
- [✓] 12:02:42 Create drawer open — typed «تست UX حساب» into نام دفتر
- [✓] Selected radio ساختمان شارژ; CTA became ساخت «تست UX حساب»; noted «تومان» under CTA
- [✓] Escape closed without create (no seed pollution)
- [✓] 12:05:44 Desktop 1440×900 — content centered max-w-lg, overflowX=false; FCP~1.2s CLS=0

## /spaces/cmse5tk02000101tawpay5zwh (ظفر ۴۰۵)
- [✓] 11:55:19 Charges / وصول ماهانه — hero «12 واحد · 1 مدیر · 26 هزینه» + Latin 31٪
- [✓] Screenshot 03-building-debts.png
- [✓] 11:55:51 Clicked ثبت on واحد ابراهیمی → sheet «وصول — واحد ابراهیمی»
- [✓] 11:57:01 Selected نیمه‌پرداخت; filled مبلغ ۲۵۰۰۰۰ → ۲۵۰٬۰۰۰; screenshot 04
- [✓] Clicked انصراف → dirty guard «تغییرات ذخیره نشده»
- [✓] Clicked بستن بدون ذخیره; Escape fully closed sheet
- [✓] Console hook: 0 errors/warnings buffered during walk
- [✓] 11:58:29 Tab واحد — ۱۲ فعال · ۰ متصل؛ کپی لینک‌ها؛ بدون ساکن
- [✓] 11:59:27 Tab طلب و بدهی — مانده ۲۰۰٬۰۰۰؛ CTA labeled «طلب / بدهی»
- [✓] Tab هزینه — chip «همه ۲۲» vs hero «26 هزینه»; edit rows=22
- [✓] 12:04:59 Tab گزارش — «۲۲ هزینه» year ۱۴۰۵; Latin «50٪»
- [✓] FAB overlap probe: last «ثبت» not blocked when scrolled; FAB covers main canvas at bottom

## Hard probes
- Viewport meta: `width=device-width, initial-scale=1, viewport-fit=cover` (no maximum-scale — prior F2 fixed)
- Next.js hydration overlay: not observed this session
- axe-core: **not measured** (CDN blocked in browser; `public/*.js` except `sw.js` returns 404 from Next)

## Console / network (session)
- Console errors: 0 observed via hook
- Console warnings: 0 observed via hook
- Network 5xx: 0 observed
- Auth 403/404: 0 on audited product pages
