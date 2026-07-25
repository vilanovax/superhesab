# PRD: قالب صندوق نوبتی (`FUND`)

## ۱. هویت

صندوق قرض‌الحسنه / نوبتی (ROSCA): اعضا هر دوره سهم می‌پردازند؛ یک نفر در هر دوره کل جمع را می‌گیرد.

- **جدا از** `Expense` / `Debt` / `Settlement` / `SavingsPot`
- الگوی additive: `FundPlan` + `FundTurn` + `FundPayment` + `FundPaymentProof`

## ۲. فاز A ✅

| قابلیت | وضعیت |
|--------|--------|
| پلن، نوبت دستی، تیک وصول | ✅ |
| جلوگیری از نوبت تکراری + گزارش دوره | ✅ |
| داشبورد مدیر | ✅ |

## ۳. فاز B (این سند) — پرتال عضو + فیش

| قابلیت | MVP |
|--------|-----|
| پرتال عضو برای `VIEWER` در `/spaces/[id]/member` | ✅ هدف |
| مشاهده دوره، سهم مورد انتظار، وضعیت پرداخت، برنده | ✅ |
| آپلود فیش (S3/R2 presign؛ jpg/png/webp/pdf ≤ ۸MB) | ✅ |
| صندوق رسید مدیر روی داشبورد (تایید → ثبت `FundPayment`) | ✅ |
| قرعه خودکار / پیامک | ❌ فاز C |

### مدل

`FundPaymentProof`: `spaceId`, `periodIndex`, `memberId`, `uploadedById`, `storageKey`, `mimeType`, `byteSize`, `note?`, `status` (`PENDING`\|`APPROVED`\|`REJECTED`), review fields.

### RBAC

- OWNER / EDITOR: داشبورد مدیر + بررسی فیش
- VIEWER: فقط پرتال عضو (ریدایرکت از `/spaces/[id]`)
- آپلود فیش: عضو برای **خودش** (membership خود)

### جریان فیش

1. عضو → intent + PUT به S3  
2. confirm  
3. مدیر → تایید ⇒ `FundPayment` با مبلغ مورد انتظار؛ یا رد با یادداشت  

## ۴. Registry

`fundRotating: true` · `invites: true` · بدون Expense/Settlement

## ۵. ترتیب اجرا

1. Schema + migration  
2. Actions + پرتال + صندوق رسید  
3. ریدایرکت VIEWER + لینک خانه  
4. فاز C: قرعه / پیامک — بعدی  
