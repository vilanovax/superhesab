# PRD: ماژول‌های افزایشی خانواده (پس‌انداز و وام داخلی)

## ۰. اصل معماری

این دو ماژول **فقط** روی قالب `FAMILY` فعال می‌شوند (`savingsPot` / `internalLoans` در registry). جداول additive هستند؛ هستهٔ `Expense` / `Debt` / `Settlement` را تغییر نمی‌دهند و با آن‌ها مخلوط نمی‌شوند.

---

## ۱. صندوق پس‌انداز (Savings Pot)

- **هدف:** یک هدف مشترک مالی (مثل خرید ماشین یا سفر) داخل فضای `FAMILY`.
- **معماری:** مدل `SavingsPot` (spaceId, title, targetAmount, deadline, status).
- **تراکنش‌ها:** مدل `SavingsTransaction` (potId, memberId, amount, type: DEPOSIT/WITHDRAWAL).
- *قانون سخت:* این مبالغ وارد `Expense` نمی‌شوند تا بودجه مصرفی ماهانه را مخدوش نکنند.

### جزئیات فیلدها

| مدل | فیلد | توضیح |
|-----|------|--------|
| `SavingsPot` | `targetAmount` | Int (واحد کوچک پول)؛ اختیاری در آینده می‌تواند null باشد — MVP الزامی |
| `SavingsPot` | `deadline` | DateTime? |
| `SavingsPot` | `status` | `ACTIVE` \| `COMPLETED` \| `ARCHIVED` |
| `SavingsTransaction` | `memberId` | FK به `SpaceMember` (نه User خام) |
| `SavingsTransaction` | `amount` | Int > 0 |
| `SavingsTransaction` | `type` | `DEPOSIT` \| `WITHDRAWAL` |

موجودی صندوق = مجموع DEPOSIT − مجموع WITHDRAWAL (محاسبهٔ پویا؛ فیلد cached الزامی نیست).

---

## ۲. وام خانوادگی (Internal Family Loan)

- **هدف:** قرض دادن پول بین اعضای یک فضا.
- **معماری:** مدل `InternalLoan` (spaceId, fromMemberId, toMemberId, initialAmount, dueDate, status).
- **بازپرداخت:** مدل `InternalLoanPayment` (loanId, amount, date).
- *قانون سخت:* این ماژول کاملاً از `Debt` (که برای بیرون از فضاست) و `Settlement` (که برای دنگ‌ودونگ است) جداست.

### جزئیات فیلدها

| مدل | فیلد | توضیح |
|-----|------|--------|
| `InternalLoan` | `fromMemberId` / `toMemberId` | FK به `SpaceMember`؛ هر دو باید عضو همان `spaceId` باشند |
| `InternalLoan` | `initialAmount` | Int |
| `InternalLoan` | `dueDate` | DateTime? |
| `InternalLoan` | `status` | `ACTIVE` \| `SETTLED` |
| `InternalLoanPayment` | `amount` | Int > 0 |

مانده = `initialAmount − sum(payments)`. وقتی مانده ≤ 0 → `SETTLED`.

---

## ۳. Registry

```ts
features.savingsPot === true   // فقط FAMILY
features.internalLoans === true // فقط FAMILY
```

---

## ۴. ترتیب پیاده‌سازی

1. این PRD + schema + migration + registry ✅ (فاز ۲۶ اسکیما)
2. Server Actions + RBAC (OWNER/EDITOR mutate؛ VIEWER read) ✅
3. UI تب «صندوق و وام» داخل فضای FAMILY ✅
4. بنر سررسید وام + پیشرفت صندوق ✅ (در پنل؛ تجمیع داشبورد خانه اختیاری بعدی)
