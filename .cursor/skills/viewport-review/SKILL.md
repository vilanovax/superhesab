---
name: viewport-review
description: >-
  Live multi-viewport review of SuperHesab (mobile, tablet, desktop) using the
  browser tools. Captures screenshots, runs layout probes (overflow, clipping,
  touch targets), and reports per-breakpoint findings. Use when the user asks
  to check responsive layout, mobile/tablet/desktop view, viewport review,
  بررسی موبایل، تبلت، دسکتاپ، ریسپانسیو، or "viewport review".
---

# Viewport Review (Mobile / Tablet / Desktop)

Live browser pass across fixed viewports. Evidence-first: screenshot + layout probe per breakpoint. Not a full UX audit — focused on layout, overflow, and breakpoint-specific UI.

## Defaults (SuperHesab)

| Setting | Value |
|---------|--------|
| Base URL | `http://localhost:3003` (never 3000) |
| Desktop media query | `min-width: 768px` (`useIsDesktop`) |
| Language / dir | Persian UI, expect `dir="rtl"` |
| Tool | `cursor-ide-browser` MCP |

If the user names routes, review those. Otherwise default to: `/app`, then one open space (`/spaces/[id]`), then any sheet/dialog they mention.

## Viewport matrix (always run all three)

| Breakpoint | Width × Height | Device class | Notes |
|------------|----------------|--------------|--------|
| **mobile** | `375 × 812` | phone | Primary PWA surface; Drawer UI |
| **tablet** | `768 × 1024` | tablet | Desktop threshold starts here (`md` / `useIsDesktop`) |
| **desktop** | `1440 × 900` | laptop | Dialog UI, wider chrome |

Optional extras only if user asks or a bug is suspected near the edge:

- `390 × 844` (iPhone 14)
- `1024 × 768` (small laptop / landscape tablet — high-bug zone)
- `1280 × 800`

Do **not** go above `1920` width.

## Workflow

Copy and track:

```
Viewport Review Progress:
- [ ] 0. Preflight (URL + auth + lock)
- [ ] 1. mobile 375×812
- [ ] 2. tablet 768×1024
- [ ] 3. desktop 1440×900
- [ ] 4. Report
```

### 0. Preflight

1. Confirm dev server: prefer `http://localhost:3003`. If down, tell the user to run `npm run dev`.
2. `browser_tabs` → list. If a tab exists, `browser_lock` first; else `browser_navigate` then lock.
3. Navigate to the target route.
4. If login wall: stop and ask the user to sign in (do not invent auth).
5. Prove tools: one **CDP** screenshot (`Page.captureScreenshot`) + one `Runtime.evaluate` layout probe.
   Prefer CDP captures over `browser_take_screenshot` when the latter looks empty/wrong.

### Hydration false positive (Cursor browser)

`browser_snapshot` injects `data-cursor-ref="…"` into the live DOM **before** React hydrates.
That produces Next.js “hydration mismatch” overlays that blame random RSC lines (often
`app/(app)/app/page.tsx` header). Diffs look like:

```
- data-cursor-ref="e1"
+ سوپرحساب
```

**Do not file these as product bugs.** To verify real hydration:

1. Navigate with `browser_navigate` or `location.href = …` (no snapshot first).
2. Wait for load; check the Next issues badge / terminal for mismatches **without** calling `browser_snapshot`.
3. Only treat as a finding if the server/client **text** differs (e.g. Latin `4` vs Persian `۴`), not attributes.

Persian digits on home must use `formatFaDigits` / `formatMoney` (deterministic) — never
`Intl.NumberFormat("fa-IR")` in RSC output.

### 1–3. Per viewport

For each row in the matrix:

1. **Resize** via CDP (see below).
2. Confirm size: `window.innerWidth` / `window.innerHeight`.
3. Confirm desktop flag when relevant: `window.matchMedia('(min-width: 768px)').matches`.
4. Wait for layout settle (~300ms via short CDP poll / snapshot).
5. **Screenshot** above-the-fold (`browser_take_screenshot`).
6. **Scroll** through the main column; screenshot any broken section.
7. Run the **layout probe** (see [checklist.md](checklist.md)).
8. Spot-check SuperHesab-specific UI for that width (below).
9. Log findings with severity before moving on.

#### Resize via CDP

```
browser_cdp
  method: Emulation.setDeviceMetricsOverride
  params: {
    width: <W>,
    height: <H>,
    deviceScaleFactor: 1,
    mobile: <true for mobile/tablet portrait phone-like, false for desktop>
  }
```

Use `mobile: true` for 375; `mobile: true` for 768 tablet; `mobile: false` for 1440.

Clear override when done (optional):

```
browser_cdp
  method: Emulation.clearDeviceMetricsOverride
  params: {}
```

### SuperHesab spot-checks by width

**Mobile (375)**

- No horizontal page scroll (`document.documentElement.scrollWidth <= innerWidth`).
- Bottom nav / safe-area padding not covering CTAs.
- Sheets/drawers open full-width; primary actions reachable with thumb.
- Touch targets ≥ 44×44 CSS px on primary controls.
- Quick actions / chips do not blow `overflow-x` on `/app`.

**Tablet (768)** — critical transition

- `useIsDesktop` is `true` at ≥768 — expect Dialog (not Drawer) for create/invite/edit flows that branch on desktop.
- Content should not look like a stretched phone nor a cramped desktop.
- Side sheets / dialogs fit without clipped footer buttons.

**Desktop (1440)**

- `max-w-lg` columns stay readable (not ultra-wide empty void without purpose).
- Dialogs centered; no truncated titles/actions.
- Hover/focus states visible where applicable.
- No accidental mobile-only sticky bars colliding with desktop chrome.

### Auth / destructive

- Do not submit real settlements/expenses unless the user asks.
- Prefer opening sheets/dialogs and dismissing them.
- If session expires mid-review → stop, report Incomplete for remaining breakpoints.

## Report format

Lead with a one-line verdict, then the table.

```markdown
# Viewport Review — [route(s)] — [date]

**Verdict:** Pass | Issues found | Blocked (auth/server)

| Breakpoint | Size | overflowX | clipped | touch<44 | Notes |
|------------|------|-----------|---------|----------|-------|
| mobile | 375×812 | 0/… | … | … | … |
| tablet | 768×1024 | … | … | … | … |
| desktop | 1440×900 | … | … | … | … |

## Findings

### V1 — [title]
- **Severity:** Critical | High | Medium | Low
- **Breakpoint:** mobile | tablet | desktop
- **Surface:** `/path`
- **Observed:** …
- **Expected:** …
- **Evidence:** screenshot + probe snippet
- **Suspected:** `file` or component name if obvious

## Passed checks
- …
```

Severity guide:

| Severity | Examples |
|----------|----------|
| Critical | Unusable (cut-off submit, content unreachable) |
| High | Horizontal overflow, wrong Drawer/Dialog at breakpoint, overlapping controls |
| Medium | Tight spacing, weak touch target, awkward tablet stretch |
| Low | Optical polish only |

## Autonomy

- **Do:** navigate, resize, screenshot, scroll, open/close non-destructive UI, write the report in chat (and to `.jez/viewport-review/YYYY-MM-DD.md` if the user wants a file).
- **Ask first:** anything that creates/deletes money or members.
- **Stop:** login required and session missing.

## Related

- Full interaction/UX audit → use `ux-audit` skill instead.
- Layout probe details → [checklist.md](checklist.md).
