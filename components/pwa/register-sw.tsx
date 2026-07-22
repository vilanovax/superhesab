"use client";

import { useEffect } from "react";

/** Registers the minimal offline service worker (production / HTTPS / localhost). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
      } catch {
        // SW registration failures are non-fatal for the app shell
      }
    };

    // Delay slightly so first paint isn't blocked
    const id = window.setTimeout(register, 800);
    return () => window.clearTimeout(id);
  }, []);

  return null;
}
