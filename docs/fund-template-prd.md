# PRD: قالب صندوق نوبتی (`FUND`) — فاز A (MVP)

## ۱. هویت

صندوق قرض‌الحسنه / نوبتی (ROSCA): اعضا هر دوره سهم می‌پردازند؛ یک نفر در هر دوره کل جمع را می‌گیرد.

- **جدا از** `Expense` / `Debt` / `Settlement` / `SavingsPot`
- الگوی additive مثل ساختمان: `FundPlan` + `FundTurn` + `FundPayment`

## ۲. فاز A (این سند)

| قابلیت | MVP |
|--------|-----|
| `SpaceType.FUND` | ✅ |
| تعریف پلن (مبلغ سهم پایه + تعداد دوره) | ✅ |
| سهم اعضا | `SpaceMember.defaultShare` half-units (Int؛ بدون Float) |
| نوبت‌دهی | **دستی** توسط OWNER/EDITOR |
| جلوگیری از نوبت تکراری | ✅ یک عضو حداکثر یک دوره در چرخه (اعتبارسنجی اکشن + غیرفعال‌سازی در UI) |
| وصول | تیک پرداخت؛ مبلغ = دقیقاً سهم مورد انتظار |
| گزارش دوره | ✅ وصول / کسری / باقی‌مانده‌ها + خلاصه چرخه |
| داشبورد | برنده دوره + جمع‌شده / مورد انتظار |
| قرعه خودکار / فیش / پیامک | ❌ فاز B/C |

## ۳. مدل‌ها

- `FundPlan`: `spaceId` (یکتا), `shareAmount`, `periodCount`
- `FundTurn`: `spaceId`, `periodIndex` (۱…N), `winnerMemberId?`, `status`
- `FundPayment`: `spaceId`, `periodIndex`, `memberId`, `amount`, یکتا per (space, period, member)

مبلغ مورد انتظار عضو = `(shareAmount * defaultShare) / 2` (integer).

## ۴. Registry

```
fundRotating: true
invites: true
settlements: false
incomeExpense: false
debts: false
…
```

## ۵. RBAC

- OWNER: پلن، نوبت، وصول، دعوت
- EDITOR: نوبت + وصول
- VIEWER: فقط مشاهده (فاز B پرتال)

## ۶. ترتیب

1. Schema + migration + registry ✅  
2. Server Actions + داشبورد مدیر ✅  
3. ایجاد فضا از UI ✅  
4. فاز B: claim/فیش — بعدی  
