"use client";

import { useEffect } from "react";

/**
 * Chromium Speculation Rules — prerender likely space navigations on hover
 * (~200ms). Progressive enhancement; Safari/Firefox ignore the script.
 *
 * Injected via DOM (not JSX `<script>`) so React 19 client renders don't warn
 * that scripts inside components never execute.
 *
 * Scoped to `/spaces/*` entry routes (not settings/board) to avoid burning
 * bandwidth on admin chrome the user rarely opens from home.
 */
const RULES = {
  prerender: [
    {
      where: {
        and: [
          { href_matches: "/spaces/*" },
          { not: { href_matches: "/spaces/*/settings*" } },
          { not: { href_matches: "/spaces/*/board*" } },
        ],
      },
      eagerness: "moderate",
    },
  ],
  prefetch: [
    {
      where: {
        and: [
          { href_matches: "/spaces/*" },
          { not: { href_matches: "/spaces/*/settings*" } },
          { not: { href_matches: "/spaces/*/board*" } },
        ],
      },
      eagerness: "moderate",
    },
  ],
} as const;

const SCRIPT_ID = "home-space-speculation-rules";

export function HomeSpaceSpeculation() {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return;

    const el = document.createElement("script");
    el.id = SCRIPT_ID;
    el.type = "speculationrules";
    el.textContent = JSON.stringify(RULES);
    document.head.appendChild(el);

    return () => {
      el.remove();
    };
  }, []);

  return null;
}
