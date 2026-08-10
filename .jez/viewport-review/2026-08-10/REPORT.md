# Viewport Review — `/app` + `/spaces/[id]` — 2026-08-10

**Verdict:** Issues found (V1 withdrawn — false positive)

| Breakpoint | Size | overflowX | clipped | touch&lt;44 | Notes |
|------------|------|-----------|---------|------------|-------|
| mobile | 375×812 | 0 | 0 | yes (آرشیو/جدید ۴۰px؛ اشتراک ۳۶×۳۶) | Drawer برای دفتر جدید ✓ |
| tablet | 768×1024 | 0 | 0 | 0 | `isDesktopMq=true`؛ Dialog وسط‌چین ✓؛ ستون `max-w-lg` (۵۱۲px) |
| desktop | 1440×900 | 0 | 0 | 0 | ستون ۵۱۲px با حاشیه ~۴۶۴px هر طرف |

Routes: `/app`, `/spaces/cmsmtxgcg000a6ot8x9smuejx` (سفر پایلوت UX)

## Findings

### V1 — Hydration error روی `/app` → **withdrawn**
- **Severity:** ~~High~~ false positive (Cursor automation)
- **Surface:** `/app`
- **Observed during review:** Next overlay after `browser_snapshot`; diff was only `data-cursor-ref` attrs vs text (`سوپرحساب`, `۶ دفتر فعال`).
- **Clean re-check:** hard reload without snapshot → `data-cursor-ref` count = 0, no Issues badge, no hydration log, Persian digits OK (`formatFaDigits` already in place).
- **Action:** none in product code; skill updated to ignore cursor-ref mismatches.

### V2 — Touch targetهای زیر ۴۴px روی موبایل → **fixed** (v3.49)
- **Severity:** Medium
- **Breakpoint:** mobile
- **Surface:** `/app`, `/spaces/[id]`
- **Fix:** آرشیو/جدید، بازگشت، اشتراک، تنظیمات، تب‌ها → `h-11` / `size-11` (۴۴px)؛ TabsList `p-0.5`
- **Verified:** probe @375 — همهٔ کنترل‌های بالا `ok: true`

### V3 — تبلت/دسکتاپ همان ستون موبایل (`max-w-lg`)
- **Severity:** Low (احتمالاً عمدی برای PWA)
- **Breakpoint:** tablet, desktop
- **Surface:** `/app`, `/spaces/[id]`
- **Observed:** عرض محتوا ۵۱۲px وسط صفحه؛ در ۱۴۴۰ حاشیهٔ زیاد دو طرف
- **Expected:** اگر هدف «اپ موبایل در دسکتاپ» است OK؛ اگر استفادهٔ تبلت غنی‌تر می‌خواهید، layout جدا برای `md+`
- **Evidence:** `tablet-768-app.png`, `desktop-1440-app.png`

## Passed checks
- بدون horizontal page overflow در هر سه سایز
- `dir=rtl` صحیح
- زیر ۷۶۸: create-space = **Drawer** (vaul، پایین صفحه)
- ≥۷۶۸: create-space = **Dialog** وسط‌چین (`useIsDesktop`)
- لیست فضاها و hero روی موبایل قابل استفاده؛ CTAهای ثبت خرج / تسویه عرض مناسب دارند

## Evidence
`.jez/viewport-review/2026-08-10/`
- `mobile-375-app.png`
- `mobile-375-create-drawer.png`
- `mobile-375-space.png`
- `tablet-768-app.png`
- `tablet-768-create-dialog.png`
- `desktop-1440-app.png`
- `desktop-1440-space.png`
