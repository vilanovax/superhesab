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
          className="h-9 gap-1 rounded-xl border-border/70 bg-card pe-3 ps-2 text-sm font-medium shadow-sm"
        >
          <Link href="/app">← بازگشت</Link>
        </Button>
        <span className="ms-auto truncate rounded-lg bg-ink px-2.5 py-1.5 text-caption font-medium text-primary-foreground">
          تنظیمات اپ
        </span>
      </div>

      <header className="surface-hero animate-fade-up relative mb-3 overflow-hidden rounded-[1.35rem] px-4 py-3.5 shadow-md">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-s-8 -top-10 size-28 rounded-full bg-on-hero-soft blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-e-6 -bottom-12 size-32 rounded-full bg-black/20 blur-2xl"
        />
        <div className="relative flex items-center gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-on-hero/15 text-title font-bold text-on-hero ring-1 ring-on-hero/20"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-caption font-medium tracking-wide text-on-hero/65">
              SuperHesab
            </p>
            <h1 className="truncate text-title font-bold tracking-tight text-on-hero">
              تنظیمات کلی
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
