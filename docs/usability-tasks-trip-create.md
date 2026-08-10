# Usability Task Script — Create Trip flow

Use with [usability-test-plan-trip-create.md](./usability-test-plan-trip-create.md).

**Rules:** Goal-framed tasks. No product jargon («دفتر»، «Trip»، «تمپلیت»، «Space»). Do not reveal the path.

---

## Opener (≈2 min)

> ممنون که اومدی. داریم خود اپ را تست می‌کنیم، نه تو را. راه درست و غلط نداریم. اگر گیر کردی یا گیج شدی، همان برای ما داده است.
>
> لطفاً بلند فکر کن: چی می‌بینی، چی توقع داری، چی مبهمه.
> وسط تسک‌ها کمک زیادی نمی‌کنم. بعد از هر تسک کوتاه حرف می‌زنیم.
> جلسه ضبط می‌شود و داخلی می‌ماند. اوکی؟
>
> سؤالی قبل از شروع؟

---

## Pre-test (≈3–5 min)

1. آخرین باری که خرج سفر/دورهمی را با دوست‌ها حساب کردی چطور بود؟
2. از چه ابزاری استفاده کردی؟ چه چیزی اذیتت کرد؟
3. امروز با موبایل راحت‌تری یا دسکتاپ؟

---

## Task framing (before each task)

> تسک بعدی اینه. عجله نکن، بلند فکر کن.
>
> [Read task aloud. If remote, paste in chat.]
>
> هر وقت آماده بودی شروع کن.

---

## Tasks

### Task 1 — Start for a group trip (create)

> هفتهٔ بعد با ۳ تا دوست می‌رید شمال. می‌خوای خرج‌ها یک‌جا ثبت بشه تا آخر سفر حساب‌ها مشخص باشه.
> با این اپ شروع کن تا فضای مشترکتون برای اون سفر آماده بشه.

| Field | Value |
|---|---|
| Success | Lands on created space; name related to trip; trip-type chosen |
| Target time | ≤ 3 min |
| Start URL | `/app` (empty account) |

**Observer notes**

- [ ] Chose trip-like template first try
- [ ] Hesitated on «دفتر» / template labels
- [ ] Edited type after pick
- [ ] Looked for currency
- [ ] Expected success confirmation after submit
- [ ] SEQ ___ / 5

**Post-task probes**

> از ۱ تا ۵ چقدر آسان/سخت بود؟
> سخت‌ترین بخش؟ آسان‌ترین؟
> یک چیز که عوض می‌کردی؟

---

### Task 2 — Next step: bring a friend in

> الان که اینو ساختی، بگو قدم بعدی‌ت چیه تا دوستات هم بتونن خرج بزنن.
> همون کارو انجام بده — فعلاً فقط یکی از دوست‌ها رو اضافه/دعوت کن (پیام واقعی لازم نیست؛ لینک دعوت کافیه).

| Field | Value |
|---|---|
| Success | Opens invite path and copies/sees invite link **or** adds a named ghost member |
| Target time | ≤ 4 min |

**Observer notes**

- [ ] Went to invite from empty-state CTA
- [ ] Went via hero avatars / +
- [ ] Added ghost member instead of link
- [ ] Confused about roles
- [ ] SEQ ___ / 5

**Post-task probes** (same as Task 1)

---

### Task 3 — First expense (killer follow-on)

> خودت بنزین زدی، ۸۵۰ هزار تومان. ثبتش کن طوری که بین ۴ نفر تقسیم بشه (تو + ۳ دوست — اگر دوست‌ها هنوز جوین نشدن، با چیزی که اپ اجازه می‌ده پیش برو).

| Field | Value |
|---|---|
| Success | At least one expense with correct amount saved, **or** clear UI block with understandable reason |
| Target time | ≤ 5 min |

**Observer notes**

- [ ] Found add-expense CTA / FAB
- [ ] Amount entry friction (format, zeros, toman)
- [ ] Split UI clear with 1 vs 4 members
- [ ] Blocked because others not joined — understood why?
- [ ] SEQ ___ / 5

---

### Task 4 — Optional returning user

> فردا دوباره باز می‌کنی. یک سفر دیگه برای دورهمی آخر هفته بساز.

| Field | Value |
|---|---|
| Success | From non-empty home, finds create and builds a second trip |
| Target time | ≤ 2 min |

---

## Mid-task probes (sparingly)

| Situation | Say |
|---|---|
| Silent >10s | «چی تو ذهنته؟» |
| Pause on a label | «این که می‌بینی یعنی چی به نظرت؟» |
| Unexpected action | «اینجا چی توقع داشتی؟» |
| Stuck >30s | «معمولاً این موقع چیکار می‌کنی؟» |
| Still stuck +30s | Soft hint only as last resort |

Do **not** lead («منوی بالا رو دیدی؟»). Do **not** defend the design.

---

## Debrief (≈5–10 min)

1. اگر هفتهٔ بعد واقعاً برای سفر شمال استفاده کنی، چی کمِ؟
2. بین کلمه‌هایی که دیدی («دفتر»، «سفر»، «فضای مشترک») کدوم برات واضح‌تر بود؟
3. به دوستت پیشنهاد می‌کنی؟ چرا / چرا نه؟
4. Overall impression in one sentence.

---

## Close

> ممنون. کمکتون خیلی به درد می‌خوره. اگر چیزی بعداً یادت اومد بفرست.

---

## Pilot dogfood note

Internal agent/person can run Tasks 1–3 once on a throwaway account before recruiting humans. Capture Interaction Manifest (typed name, submitted create, opened invite, attempted expense) and console errors. Pilot findings refine wording — they do not replace the 5-participant batch.
