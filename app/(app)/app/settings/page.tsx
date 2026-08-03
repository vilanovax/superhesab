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
    select: { name: true, phone: true, passwordHash: true },
  });

  if (!user) {
    redirect("/login");
  }

  const displayName = user.name?.trim() || user.phone;
  const initial = (user.name?.trim()?.[0] || "ش").toUpperCase();
  const hasPassword = Boolean(user.passwordHash);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
      <div className="mb-2.5 flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 gap-1 rounded-xl border-border/60 bg-card pe-3 ps-2 text-sm font-medium shadow-sm"
        >
          <Link href="/app">← بازگشت</Link>
        </Button>
      </div>

      <header className="surface-hero animate-fade-up relative mb-3 overflow-hidden rounded-2xl px-3.5 py-3 shadow-md">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-8 -top-10 size-24 rounded-full bg-on-hero/15 blur-2xl"
        />
        <div className="relative flex items-center gap-2.5">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-on-hero/15 text-base font-bold text-on-hero ring-1 ring-on-hero/20"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-body font-bold tracking-tight text-on-hero">
              تنظیمات
            </h1>
            <p className="truncate text-caption text-on-hero/70">
              {displayName}
              <span className="mx-1 opacity-40">·</span>
              سوپرحساب
            </p>
          </div>
        </div>
      </header>

      <AppSettingsPanel
        initialName={user.name ?? ""}
        phone={user.phone}
        hasPassword={hasPassword}
      />
    </main>
  );
}
