import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "آفلاین — SuperHesab",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div className="surface-hero w-full rounded-2xl px-6 py-8">
        <div className="flex justify-center">
          <BrandLockup
            size="md"
            className="[&_span]:text-on-hero text-on-hero"
          />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-on-hero">آفلاین هستی</h1>
        <p className="mt-2 text-sm leading-relaxed text-on-hero/75">
          اتصال اینترنت برقرار نیست. وقتی آنلاین شدی دوباره تلاش کن.
        </p>
      </div>

      <Button asChild className="h-12 w-full max-w-xs rounded-xl">
        <Link href="/app">تلاش دوباره</Link>
      </Button>
    </main>
  );
}
