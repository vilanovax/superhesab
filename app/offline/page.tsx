import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "آفلاین — SuperHesab",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div className="surface-hero w-full rounded-2xl px-6 py-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-white/70">
          SUPERHESAB
        </p>
        <h1 className="mt-3 text-2xl font-bold text-white">آفلاین هستی</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          اتصال اینترنت برقرار نیست. وقتی آنلاین شدی دوباره تلاش کن.
        </p>
      </div>

      <Button asChild className="h-12 w-full max-w-xs rounded-xl">
        <Link href="/app">تلاش دوباره</Link>
      </Button>
    </main>
  );
}
