"use client";

import dynamic from "next/dynamic";

const PwaRuntime = dynamic(
  () => import("@/components/pwa/pwa-runtime").then((m) => m.PwaRuntime),
  { ssr: false },
);

/** Client island — keeps SW/install JS off the RSC critical path. */
export function DeferredPwaRuntime() {
  return <PwaRuntime />;
}
