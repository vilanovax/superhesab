"use client";

import { useEffect } from "react";

function syncVvBottom() {
  const root = document.documentElement;
  const vv = window.visualViewport;
  if (!vv) {
    root.style.setProperty("--vv-bottom", "0px");
    return;
  }
  /** Layout pixels covered by a bottom browser/system bar. */
  const occluded = Math.max(
    0,
    Math.round(window.innerHeight - vv.height - vv.offsetTop),
  );
  root.style.setProperty("--vv-bottom", `${occluded}px`);
}

/**
 * Keeps `--vv-bottom` aligned with chrome that overlays the layout viewport
 * (Safari/Chrome toolbars, Android nav). Safe-area is applied in CSS.
 */
export function ViewportInsets() {
  useEffect(() => {
    syncVvBottom();
    const vv = window.visualViewport;
    window.addEventListener("resize", syncVvBottom);
    vv?.addEventListener("resize", syncVvBottom);
    vv?.addEventListener("scroll", syncVvBottom);
    return () => {
      window.removeEventListener("resize", syncVvBottom);
      vv?.removeEventListener("resize", syncVvBottom);
      vv?.removeEventListener("scroll", syncVvBottom);
    };
  }, []);

  return null;
}
