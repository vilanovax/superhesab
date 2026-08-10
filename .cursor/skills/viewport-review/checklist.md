# Viewport review — layout probe & checklist

## Layout probe (run via `browser_cdp` → `Runtime.evaluate`)

```js
(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const doc = document.documentElement;
  const body = document.body;

  const overflowX = Math.max(doc.scrollWidth, body.scrollWidth) - vw;

  const clipped = [];
  const smallTouch = [];
  const offscreen = [];

  const candidates = Array.from(
    document.querySelectorAll(
      'a, button, [role="button"], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).slice(0, 80);

  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") continue;
    if (r.width === 0 && r.height === 0) continue;

    if (r.right > vw + 1 || r.left < -1) {
      offscreen.push({
        tag: el.tagName,
        text: (el.innerText || el.getAttribute("aria-label") || "").slice(0, 40),
        left: Math.round(r.left),
        right: Math.round(r.right),
      });
    }

    const tooNarrow = r.width > 0 && r.width < 44;
    const tooShort = r.height > 0 && r.height < 44;
    if ((tooNarrow || tooShort) && (el.tagName === "BUTTON" || el.getAttribute("role") === "button" || el.tagName === "A")) {
      smallTouch.push({
        tag: el.tagName,
        text: (el.innerText || el.getAttribute("aria-label") || "").slice(0, 40),
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    }
  }

  // Fixed/sticky bars that may cover content
  const fixed = Array.from(document.querySelectorAll("*"))
    .filter((el) => {
      const p = getComputedStyle(el).position;
      return p === "fixed" || p === "sticky";
    })
    .slice(0, 20)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (el.className || "").toString().slice(0, 60),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        h: Math.round(r.height),
      };
    });

  // Text overflow on descendants (sample)
  const overflowEls = [];
  for (const el of Array.from(document.querySelectorAll("main, [role='main'], body *")).slice(0, 200)) {
    if (el.scrollWidth > el.clientWidth + 2) {
      overflowEls.push({
        tag: el.tagName,
        cls: (el.className || "").toString().slice(0, 60),
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
      });
      if (overflowEls.length >= 8) break;
    }
  }

  return {
    viewport: { w: vw, h: vh, dpr: window.devicePixelRatio },
    isDesktopMq: window.matchMedia("(min-width: 768px)").matches,
    dir: doc.getAttribute("dir") || getComputedStyle(doc).direction,
    overflowXPx: overflowX,
    pageScrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
    offscreenInteractive: offscreen.slice(0, 10),
    smallTouchTargets: smallTouch.slice(0, 10),
    fixedOrSticky: fixed,
    overflowContainers: overflowEls,
  };
})()
```

Call shape:

```
browser_cdp
  method: Runtime.evaluate
  params: {
    expression: "<probe above>",
    returnByValue: true
  }
```

### How to read results

| Field | Fail when |
|-------|-----------|
| `overflowXPx` | `> 1` |
| `offscreenInteractive` | any primary control listed |
| `smallTouchTargets` | primary CTAs under 44×44 on mobile/tablet |
| `isDesktopMq` | mismatches expected breakpoint (false @375, true @768+) |
| `overflowContainers` | non-intentional horizontal scroll regions |
| `dir` | not `rtl` on Persian surfaces (investigate) |

## Manual checklist (per breakpoint)

- [ ] Above-the-fold screenshot captured
- [ ] Scrolled to longest content; no clipped footer / CTA
- [ ] Open one sheet or dialog appropriate to width; dismiss
- [ ] Primary nav still usable
- [ ] No text overflow / truncated labels on money amounts
- [ ] Safe-area: bottom actions clear of home indicator zone (mobile)
- [ ] Tablet: Dialog vs Drawer matches `min-width: 768px`
- [ ] Desktop: dialog max-width readable; no stretched form fields across full 1440

## Quick smoke routes (SuperHesab)

1. `/app` — home, quick actions, space list
2. `/spaces/[id]` — trip/partner board (expenses tab)
3. Create-space or invite sheet/dialog (open + cancel)
4. Expense create/edit surface if already on a space

## Evidence folder (optional)

If saving files:

```
.jez/viewport-review/YYYY-MM-DD/
  mobile-375.png
  tablet-768.png
  desktop-1440.png
  REPORT.md
```
