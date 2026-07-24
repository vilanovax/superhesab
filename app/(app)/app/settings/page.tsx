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

  const displayName = user.name?.trim() || user.phone;
  const initial = (user.name?.trim()?.[0] || "ش").toUpperCase();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
      <div className="mb-3 flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 gap-1 rounded-xl border-border/60 bg-card pe-3 ps-2 text-sm font-medium shadow-sm"
        >
          <Link href="/app">← بازگشت</Link>
        </Button>
      </div>

      <header className="surface-hero animate-fade-up relative mb-4 overflow-hidden rounded-[1.35rem] px-4 py-4 shadow-md">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-8 -top-10 size-28 rounded-full bg-on-hero/15 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -start-10 bottom-[-2rem] size-24 rounded-full bg-black/15 blur-2xl"
        />
        <div className="relative flex items-center gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-on-hero/15 text-lg font-bold text-on-hero ring-1 ring-on-hero/20"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-caption font-medium text-on-hero/65">سوپرحساب</p>
            <h1 className="truncate text-lg font-bold tracking-tight text-on-hero">
              تنظیمات
            </h1>
            <p className="mt-0.5 truncate text-caption text-on-hero/70">
              {displayName}
            </p>
          </div>
        </div>
      </header>

      <AppSettingsPanel initialName={user.name ?? ""} phone={user.phone} />
    </main>
  );
}
