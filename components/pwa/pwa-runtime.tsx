"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaBridge = {
  canInstall: boolean;
  installing: boolean;
  installed: boolean;
  install: () => void;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || iosStandalone;
}

/**
 * Registers SW, surfaces install prompt + update-to-reload banner.
 */
export function PwaRuntime() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );
  const [installing, setInstalling] = useState(false);

  const onInstall = useCallback(async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } finally {
      setInstalling(false);
    }
  }, [deferred]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setInstalled(isStandaloneDisplay());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    let cancelled = false;
    let updateTimer: number | undefined;

    const boot = window.setTimeout(() => {
      if (!("serviceWorker" in navigator)) return;
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => {
          if (cancelled) return;

          const trackWaiting = (sw: ServiceWorker | null) => {
            if (!sw || cancelled) return;
            setWaitingWorker(sw);
            setUpdateReady(true);
          };

          if (reg.waiting) trackWaiting(reg.waiting);

          reg.addEventListener("updatefound", () => {
            const sw = reg.installing;
            if (!sw) return;
            sw.addEventListener("statechange", () => {
              if (
                sw.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                trackWaiting(reg.waiting);
              }
            });
          });

          updateTimer = window.setInterval(() => {
            void reg.update();
          }, 60 * 60 * 1000);
        })
        .catch(() => {
          // non-fatal
        });
    }, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(boot);
      if (updateTimer != null) window.clearInterval(updateTimer);
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    const detail: PwaBridge = {
      canInstall: Boolean(deferred) && !installed,
      installing,
      installed,
      install: () => {
        void onInstall();
      },
    };
    (
      window as Window & { __superhesabPwa?: PwaBridge }
    ).__superhesabPwa = detail;
    window.dispatchEvent(new CustomEvent("superhesab:pwa", { detail }));
  }, [deferred, installing, installed, onInstall]);

  function onUpdate() {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
    navigator.serviceWorker?.addEventListener(
      "controllerchange",
      () => {
        window.location.reload();
      },
      { once: true },
    );
    window.setTimeout(() => window.location.reload(), 1200);
  }

  return (
    <>
      {updateReady ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          role="status"
        >
          <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2 rounded-2xl border border-border/60 bg-card/95 px-3 py-2.5 shadow-lg backdrop-blur-md">
            <p className="min-w-0 flex-1 text-caption font-medium text-foreground">
              نسخه جدید آماده است
            </p>
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0 rounded-xl px-3"
              onClick={onUpdate}
            >
              بروزرسانی
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-9 shrink-0 rounded-xl px-2 text-muted-foreground"
              onClick={() => setUpdateReady(false)}
            >
              بعداً
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Card for settings → data tab */
export function PwaInstallCard({ className }: { className?: string }) {
  const [canInstall, setCanInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneDisplay());
    const ua = navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIosHint(ios && !isStandaloneDisplay());

    const sync = () => {
      const bridge = (window as Window & { __superhesabPwa?: PwaBridge })
        .__superhesabPwa;
      if (!bridge) return;
      setCanInstall(bridge.canInstall);
      setInstalling(bridge.installing);
      setInstalled(bridge.installed);
    };
    sync();
    window.addEventListener("superhesab:pwa", sync);
    const t = window.setInterval(sync, 1500);
    return () => {
      window.removeEventListener("superhesab:pwa", sync);
      window.clearInterval(t);
    };
  }, []);

  function install() {
    (window as Window & { __superhesabPwa?: PwaBridge }).__superhesabPwa?.install();
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-border/50 bg-card p-4 shadow-sm",
        className,
      )}
    >
      <h2 className="text-body-sm font-semibold text-foreground">نصب اپ</h2>
      <p className="mt-0.5 text-caption leading-relaxed text-muted-foreground">
        {installed
          ? "سوپرحساب روی این دستگاه نصب شده است."
          : "برای دسترسی سریع‌تر، اپ را به صفحهٔ اصلی اضافه کن."}
      </p>
      {installed ? null : canInstall ? (
        <Button
          type="button"
          className="mt-3 h-11 w-full rounded-xl"
          disabled={installing}
          onClick={install}
        >
          {installing ? "…" : "نصب سوپرحساب"}
        </Button>
      ) : iosHint ? (
        <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2.5 text-caption leading-relaxed text-muted-foreground">
          در Safari: دکمهٔ Share ← «Add to Home Screen»
        </p>
      ) : (
        <p className="mt-3 text-caption text-muted-foreground">
          اگر مرورگر پیشنهاد نصب ندهد، از منوی مرورگر «Install app» را بزن.
        </p>
      )}
    </section>
  );
}
