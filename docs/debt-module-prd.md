# سند نیازمندی‌های محصول (PRD) - ماژول بدهی و طلب (Debt Module)

## ۱. هدف محصول

یک سیستم مستقل برای پیگیری مطالبات و بدهی‌های شخصی که کاملاً از بودجه ماهانه و سیستم تسویه شرکا (Settlement) جداست. این ماژول برای ثبت وام‌ها، قرض دادن به دوستان یا خرید اقساطی طراحی شده و بر بازپرداخت‌های مرحله‌ای تمرکز دارد.

## ۲. معماری داده و مالکیت (Ownership)

- **Space-Centric:** تمام بدهی‌ها باید به یک `spaceId` متصل باشند تا از سیستم RBAC موجود ارث‌بری کنند.
- **ایزوله از Expense:** این تراکنش‌ها نباید در جدول `Expense` ثبت شوند تا گزارش‌های بودجه و دونات چارت‌ها مخدوش نشوند.
- **جداول جدید:**
  - `Debt`: ذخیره اطلاعات پایه (مبلغ کل، طرف حساب، تاریخ سررسید، نوع).
  - `DebtPayment`: ذخیره تاریخچه پرداخت‌های مرحله‌ای متصل به هر Debt.

### فیلدهای حداقلی

**Debt**

| فیلد | نوع | توضیح |
|------|-----|--------|
| `type` | `LENT` \| `BORROWED` | طلب / بدهی |
| `counterparty` | string | طرف حساب |
| `initialAmount` | Int | مبلغ اولیه |
| `dueDate` | DateTime? | سررسید اختیاری |
| `status` | `ACTIVE` \| `SETTLED` | وضعیت |
| `createdById` | string | ثبت‌کننده |
| `spaceId` | string | مالکیت فضا |

**DebtPayment:** `debtId`, `amount` (Int > 0), `date`, `note?`, `createdById`

مانده = `initialAmount - sum(payments)`. وقتی مانده ≤ 0 → auto `SETTLED`.

## ۳. پیکربندی (Registry Flags)

- فلگ `debts: true` روی تمپلیت‌های مجاز (فاز اول فقط `PERSONAL`؛ آینده `FAMILY`).
- `TRIP` و `PARTNER` → `debts: false` (موتور Settlement جداست).

## ۴. رابط کاربری (UI/UX)

- تب سوم «بدهی / طلب» فقط وقتی `debts: true`.
- کارت پیشرفت با Progress Bar پویا.
- ACTIVE در لیست اصلی؛ SETTLED در آرشیو.
- بنر سررسید (≤ ۳ روز) بالای تب؛ تجمیع UI-only روی داشبورد `/app`.

## ۵. ترتیب پیاده‌سازی

1. Schema + migration + registry  
2. Server Actions (CRUD debt + payment)  
3. تب UI + بنر سررسید  
4. بنر تجمیعی داشبورد  
