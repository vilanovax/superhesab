# PRD: بک‌آپ و بازیابی دفاتر

**Status:** Phase 1 (+ admin platform export) · **App backup schema:** `version: 2`

## ۱. تصمیم‌های قفل‌شده

| موضوع | تصمیم |
|--------|--------|
| دامنه | بک‌آپ **حساب** (همه یا زیرمجموعهٔ دفاتر OWNER؛ فیلتر قالب + انتخاب دفتر در UI) + بک‌آپ **تک‌دفتر** |
| RBAC | فقط **OWNER** JSON کامل می‌گیرد؛ EDITOR/VIEWER از Excel/PDF استفاده می‌کنند |
| Restore | همیشه **دفتر جدید** می‌سازد؛ overwrite روی فضای موجود ممنوع |
| فایل باینری | رسیدهای S3 (`ChargePaymentProof`) فقط متادیتا در export؛ فایل بازیابی نمی‌شود |
| اعلان‌ها | `BuildingNotification` در بک‌آپ نیست (ephemeral) |

## ۲. لایه ۰ (خارج از اپ)

بک‌آپ خودکار Postgres توسط عملیات — جدا از این PRD.

## ۳. فرمت فایل

```json
{
  "version": 2,
  "exportedAt": "ISO-8601",
  "app": "SuperHesab",
  "scope": "account" | "space" | "platform" | "user",
  "user": { "id", "phone", "name", "email" },
  "users": [ /* optional — admin platform/user export; no passwordHash */ ],
  "spaces": [ /* BackupSpacePayload */ ]
}
```

شناسه‌های داخل فایل `original*` هستند و هنگام restore دوباره ساخته می‌شوند.

## ۴. فاز ۱ (این سند) — ✅ هدف اجرا

1. Export v2 کامل همه قالب‌ها  
2. UI تنظیمات اپ: دانلود (انتخاب دفتر / فیلتر قالب) + بازیابی از فایل  
3. UI تنظیمات فضا: دانلود این دفتر (OWNER)  
4. Restore → فضای جدید با نام `… (بازیابی)`  

## ۵. خارج از فاز ۱

- زمان‌بندی / یادآوری ماهانه  
- آپلود cloud رمزگذاری‌شده  
- Import overwrite  
- بازیابی بایت‌های رسید پرداخت  

## ۶. نگاشت اعضا هنگام restore

- کاربر فعلی → OWNER فضای جدید  
- عضو دیگر با `phone` موجود در سیستم → عضویت روی همان User  
- در غیر این صورت → User مجازی جدید با همان نام  
