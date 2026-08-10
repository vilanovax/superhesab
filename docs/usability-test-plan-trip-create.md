# Usability Test Plan — Create Trip flow

## Summary

Moderated usability study for first-time users creating a Trip space and getting it ready for co-travelers. Decisions hinge on empty-home clarity, template choice, post-create next steps, and invite discovery.

## Goals

| Research question | Decision if it fails |
|---|---|
| Does the user understand this app is for shared trip expenses? | Rework empty-home / onboarding copy |
| Do they correctly choose «سفر و دورهمی»? | Template labels / hints |
| Can they name and create without friction? | Form, validation, feedback |
| After create, do they know the next step? | Empty-state CTAs |
| Can they invite a co-traveler? | Invite path / link UX |

## Method

| Item | Value |
|---|---|
| Format | Moderated + think-aloud |
| Sample | 5–6 participants (one segment) |
| Session length | 35–45 min |
| Devices | 3 mobile, 2 desktop |
| Environment | `http://localhost:3003` or staging; fresh account with **zero** spaces |
| Pilot | 1 session before main batch |

### Recruit criteria

- Age ~20–45, goes on group trips or gatherings
- Has split shared costs before (Splitwise, spreadsheet, chat, cash)
- Not friends/family/team of the product
- Persian speaker, mobile-first preferred

### Success thresholds

- Tasks 1–3 completed without help by ≥4/5 (Task 3 ≥3/5)
- Mean SEQ ≥ 4/5 for Tasks 1 and 3
- Median time to first Trip ≤ 180s from land on `/app`

## Scope under test

- Entry: `/` → auth → `/app` empty home
- Template pick → create sheet/drawer → submit
- Landing on `/spaces/{id}` empty expenses
- Invite / ghost member path
- First expense (killer follow-on)

Out of scope for this study: full settlement math, Partner/Family templates, auth redesign (pre-login accounts).

## Metrics

| Metric | Target |
|---|---|
| Task 1 completion | ≥ 4/5 |
| Task 2 completion | ≥ 4/5 |
| Task 3 completion | ≥ 3/5 |
| SEQ Task 1 | mean ≥ 4 |
| Wrong template then corrected | Major if ≥2 participants |
| Hesitation on «دفتر» | count pauses/questions |

Severity after synthesis: Critical / Major / Minor / Cosmetic.

## Session structure

1. Warm-up (2–3 min)
2. Pre-test questions (3–5 min)
3. Tasks 1–3 (+ optional 4) with post-task SEQ
4. Debrief (5–10 min)
5. Close

Facilitation script and task wording: [usability-tasks-trip-create.md](./usability-tasks-trip-create.md).

## Observation checklist

| Moment | Watch for |
|---|---|
| Empty home | Chooses trip template? Does «پیشنهادی» help or confuse? |
| Sheet «دفتر جدید» | Understands «دفتر»? Fear of irreversible type? |
| Name field | Placeholder enough? Validation confusing? |
| Hidden currency | Looks for toman/rial picker? |
| After redirect | Expects success toast? Knows create worked? |
| Empty expenses | Picks «ثبت اولین هزینه» vs «دعوت همسفر» first? |
| Invite | Finds link? Understands role if shown? |
| User language | Words they use: گروه، سفر، حساب، چت، لیست… |

## Setup per session

1. Fresh account (0 spaces), already logged in
2. Correct viewport (375 mobile / 1440 desktop)
3. Screen + audio recording (internal)
4. Start URL: `http://localhost:3003/app`
5. Printed/digital observer notes

## Deliverables after batch

1. Issue inventory (participant × task × severity)
2. Findings report with Top 3 priorities
3. Re-test only Critical tasks after fixes

## Related code

- Empty home: `components/spaces/home-empty-actions.tsx`
- Create sheet/form: `components/spaces/create-space-sheet.tsx`, `create-space-form.tsx`
- Actions: `app/actions/space.ts`
- Space empty + invite: `components/expenses/expense-list.tsx`, `components/spaces/invite-members-button.tsx`
