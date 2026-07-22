import Link from "next/link";
import { AppSettingsPanel } from "@/components/settings/app-settings-panel";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";

export default async function AppSettingsPage() {
  const session = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, phone: true },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-xl bg-white/50 px-3 backdrop-blur-sm"
        >
          <Link href="/app">← بازگشت</Link>
        </Button>
        <span className="rounded-xl bg-ink/90 px-3 py-1.5 text-xs font-medium text-primary-foreground">
          تنظیمات اپ
        </span>
      </div>

      <header className="surface-hero animate-fade-up rounded-2xl p-5">
        <p className="text-xs font-medium text-white/70">SuperHesab</p>
        <h1 className="mt-1 text-2xl font-bold text-white">تنظیمات کلی</h1>
        <p className="mt-2 text-sm text-white/75">
          تم، واحد پول پیش‌فرض، پروفایل و بک‌آپ
        </p>
      </header>

      <AppSettingsPanel
        initialName={user.name ?? ""}
        phone={user.phone}
      />
    </main>
  );
}
