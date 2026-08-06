import Link from "next/link";
import { AppSettingsPanel } from "@/components/settings/app-settings-panel";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { parseSettingsTab } from "@/lib/settings-tab";
import { redirect } from "next/navigation";

type AppSettingsPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

function BackChevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default async function AppSettingsPage({
  searchParams,
}: AppSettingsPageProps) {
  const session = await requireUser();
  const { tab: tabParam } = await searchParams;
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
  const initialTab = parseSettingsTab(tabParam);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/app"
          className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-full border border-border/55 bg-card px-3 text-caption font-semibold text-foreground shadow-sm transition-colors duration-150 hover:border-primary/25 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BackChevron className="size-4 text-muted-foreground" />
          بازگشت
        </Link>
      </div>

      <header className="surface-hero animate-fade-up relative mb-5 overflow-hidden rounded-3xl px-5 py-5 shadow-md">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-e-10 -top-14 size-40 rounded-full bg-on-hero/12 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-s-12 -bottom-10 size-36 rounded-full bg-ink/25 blur-3xl"
        />
        <div className="relative flex items-center gap-3.5">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-on-hero/15 text-lg font-bold text-on-hero ring-1 ring-on-hero/20"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-caption font-medium text-on-hero/70">حساب شما</p>
            <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight text-on-hero">
              تنظیمات
            </h1>
            <p className="mt-1 truncate text-caption text-on-hero/72">
              {displayName}
            </p>
          </div>
        </div>
      </header>

      <AppSettingsPanel
        initialName={user.name ?? ""}
        phone={user.phone}
        hasPassword={hasPassword}
        initialTab={initialTab}
      />
    </main>
  );
}
