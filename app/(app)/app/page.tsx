import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateSpaceForm } from "@/components/spaces/create-space-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTemplate } from "@/lib/templates/registry";

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export default async function AppHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireUser();
  const { error } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, phone: true, name: true, avatarUrl: true },
  });

  if (!user) {
    redirect("/login");
  }

  const memberships = await prisma.spaceMember.findMany({
    where: { userId: session.userId },
    include: {
      space: {
        select: {
          id: true,
          name: true,
          type: true,
          _count: { select: { expenses: true, members: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="surface-glass animate-fade-up flex items-center justify-between gap-4 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              user.avatarUrl ??
              "https://api.dicebear.com/9.x/thumbs/svg?seed=user"
            }
            alt=""
            width={44}
            height={44}
            className="size-11 rounded-full ring-2 ring-primary/20"
          />
          <div>
            <p className="text-xs font-medium text-primary">SuperHesab</p>
            <p className="font-semibold text-foreground" dir="ltr">
              {user.name ?? user.phone}
            </p>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          size="icon"
          className="size-11 rounded-xl"
          aria-label="تنظیمات اپ"
        >
          <Link href="/app/settings">
            <SettingsIcon className="size-5" />
          </Link>
        </Button>
      </header>

      <section className="animate-fade-up space-y-4 overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-5 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              فضای جدید
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              سفر، دورهمی یا حساب دونفره — یک هسته، چند قالب.
            </p>
          </div>
          <span className="rounded-xl bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
            سریع
          </span>
        </div>
        <CreateSpaceForm error={error} />
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold text-foreground">فضاهای من</h2>
        {memberships.length === 0 ? (
          <EmptyState
            icon="expense"
            title="هنوز فضایی ندارید"
            description="اولین فضای حساب‌وکتاب را بسازید تا بتوانید هزینه و تسویه ثبت کنید."
          />
        ) : (
          <ul className="space-y-2.5">
            {memberships.map(({ space, role }) => (
              <li key={space.id}>
                <Link
                  href={`/spaces/${space.id}`}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/85 px-4 py-3.5 backdrop-blur-sm transition-all hover:border-primary/35 hover:bg-white/90"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                      {space.type === "TRIP" ? "سفر" : "۲نفر"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {space.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getTemplate(space.type).label} · {role} ·{" "}
                        {space._count.members} عضو · {space._count.expenses}{" "}
                        هزینه
                      </p>
                    </div>
                  </div>
                  <span className="text-primary transition-transform group-hover:-translate-x-0.5">
                    ←
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
