# سند نیازمندی‌های محصول (PRD) - تمپلیت خانواده (`FAMILY`)

## ۱. هویت و هدف محصول (Product Vision)

یک کیف پول مشترک برای مدیریت یکپارچه اقتصاد خانواده. این تمپلیت پیچیدگی‌های دنگ‌ودونگ و تسویه‌حساب (Settlement) را به طور کامل حذف می‌کند تا زوجین و اعضای خانواده بتوانند درآمدهای مشترک و هزینه‌های روزمره (از پرداخت قبوض و خرید سوپرمارکت تا هزینه‌های مربوط به سه گربه‌ خانگی) را به صورت یکپارچه ثبت کنند.

*نکته محصولی: این تمپلیت کاملاً از تمپلیت `PARTNER` متمایز است. `PARTNER` برای هزینه‌های دونفره با قابلیت تسویه است، در حالی که `FAMILY` نقش یک لجر (Ledger) مشترک **بدون تسویه بین اعضا** را ایفا می‌کند. ماژول جداگانهٔ بدهی/طلب بیرونی (`debts`) مجاز است و با Settlement مخلوط نمی‌شود.*

## ۲. محدودیت‌ها و پیکربندی هسته (Registry & Flags)

در `lib/templates/registry.ts` رفتار آن با پرچم‌های زیر کنترل می‌شود:

- `type: 'FAMILY'`
- `incomeExpense: true`
- `budget: true`
- `categoryBudgets: true` / `recurring: true` — عمق حسابداری مثل PERSONAL — [`docs/personal-depth-prd.md`](./personal-depth-prd.md)
- `invites: true`
- `settlements: false`
- `manualSplits: false`
- `householdLedger: true` — در بک‌اند یک Split صددرصدی به نام شخص پرداخت‌کننده ثبت می‌شود تا با Schema سازگار بماند؛ هیچ تراز/Settlement بین اعضا تولید یا نمایش داده نمی‌شود.
- `debts: true` — وام/اقساط به طرف‌های بیرون از خانواده (جداول `Debt` / `DebtPayment`؛ نه Expense).
- `savingsPot: true` / `internalLoans: true` — صندوق پس‌انداز و وام داخلی بین اعضا؛ جدا از Expense/Debt/Settlement — [`docs/family-savings-loan-prd.md`](./family-savings-loan-prd.md).
- **ظرفیت اعضا:** ۲ الی ۸ نفر (حداکثر سخت؛ حداقل نرم برای دعوت).

## ۳. حقوق دسترسی و نقش‌ها (RBAC)

- **OWNER:** تنظیمات، بودجه، حذف اعضا، ویرایش/حذف تمام تراکنش‌ها؛ انتخاب نقش هنگام ساخت لینک دعوت.
- **EDITOR:** ثبت درآمد/هزینه؛ فقط ویرایش/حذف تراکنش‌هایی که خودش ساخته (`createdById === session.userId`).
- **VIEWER:** فقط مشاهده (بدون FAB ثبت).

لینک دعوت: `/invite/[spaceId]?role=EDITOR|VIEWER`.

## ۴. UI/UX

سه تب: **تراکنش‌ها** (با «ثبت‌شده توسط»)، **گزارش** (Donut + بودجه + فیلتر `paidById`)، **بدهی / طلب**.

فرم: درآمد/هزینه، عنوان، چیپ دسته، مبلغ، تاریخ، Paid By — بدون Split Mode.

بدهی/طلب: لیست مشترک خانواده با نام ثبت‌کننده؛ OWNER/EDITOR می‌توانند پرداخت جزئی ثبت کنند.

## ۵. ترتیب پیاده‌سازی

1. `SpaceType.FAMILY` + migration + registry ✅  
2. پوسته دو تبی + دعوت ✅  
3. مسیر هزینه household + قفل EDITOR ✅  
4. Role picker لینک دعوت ✅  
5. گزارش خانوادگی با فیلتر پرداخت‌کننده ✅  
6. تب بدهی / طلب (`debts: true`) ✅  
7. عمق حسابداری مشترک با PERSONAL (`categoryBudgets` + `recurring`) ✅  
