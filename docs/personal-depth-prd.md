# سند نیازمندی‌های محصول (PRD) — عمق حسابداری شخصی (Personal Depth)

## ۱. هدف

گسترش تمپلیت `PERSONAL` فراتر از بودجه ماهانهٔ ساده: سقف per-category، پیش‌بینی run-rate تا پایان ماه، و قوانین تراکنش تکرارپذیر ماهانه که به `Expense` واقعی تبدیل می‌شوند.

## ۲. مرزها

- `PERSONAL` و `FAMILY` (`categoryBudgets` + `recurring` در registry).
- بدون فورک Expense؛ بدون cron — materialize هنگام باز کردن فضا.
- بودجه دسته‌ای: فقط enumهای هزینه (`SPEND_CATEGORIES`)؛ بدون `categoryLabel` سفارشی در v1.
- `Space.monthlyBudget` سقف کل می‌ماند؛ دسته‌ای مکمل است.
- روی `FAMILY`: materialize با `paidById = ownerId` و split صددرصدی (سازگار با `householdLedger`).

## ۳. مدل داده

### CategoryBudget

`spaceId` + `category` (unique) + `amount` (Int).

### RecurringRule

`title`, `amount`, `transactionType`, `category`, `dayOfMonth` (1–28), `active`, `createdById`.

### RecurringOccurrence

`ruleId` + `monthKey` (Tehran `yyyy-mm`) + `expenseId` — `@@unique([ruleId, monthKey])` برای idempotency.

## ۴. Run-rate

`projectedMonthSpend = round(expensesSoFar / dayOfMonth * daysInMonth)` در Asia/Tehran.
نمایش زیر نوار بودجه هیرو؛ هشدار اگر projected > monthlyBudget.

## ۵. Materialize تکرارپذیر

روی باز شدن فضای PERSONAL یا FAMILY: برای هر rule فعال اگر `dayOfMonth` رسیده و occurrence برای ماه جاری نباشد → Expense + split 100٪ به مالک + RecurringOccurrence.

## ۶. UI

- تنظیمات: سقف ماهانه + لیست بودجه دسته + CRUD قوانین تکرارپذیر (OWNER).
- گزارش: سقف دسته روی نمودار هزینه (PERSONAL و FAMILY).
- هیرو PERSONAL: run-rate زیر نوار بودجه.
- گزارش: نوار مصرف در برابر سقف دسته (در صورت تعریف).
