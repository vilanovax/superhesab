import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateSpaceSheet } from "@/components/spaces/create-space-sheet";
import { HomeEmptyActions } from "@/components/spaces/home-empty-actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTemplate } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";

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

function roleLabel(role: string) {
  if (role === "OWNER") return "مالک";
  if (role === "VIEWER") return "ناظر";
  return "ویرایشگر";
}

function Chevron({ className }: { className?: string }) {
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
      <path d="M15 18l-6-6 6-6" />
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

  const displayName = user.name?.trim() || user.phone;
  const spaceCount = memberships.length;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-5">
      {/* Slim identity bar */}
      <div className="mb-3 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            user.avatarUrl ??
            `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(user.phone)}`
          }
          alt=""
          width={36}
          height={36}
          className="size-9 rounded-full ring-2 ring-white/80"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">
            سلام، {displayName}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {spaceCount === 0 ? "دفترت خالی است" : `${spaceCount} دفتر فعال`}
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          size="icon"
          className="size-9 shrink-0 rounded-xl border-border/70 bg-white shadow-sm"
          aria-label="تنظیمات اپ"
        >
          <Link href="/app/settings">
            <SettingsIcon className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Full-bleed brand thesis — not a form */}
      <header className="surface-hero animate-fade-up relative mb-6 overflow-hidden rounded-[1.35rem] px-5 pb-5 pt-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage:
              "radial-gradient(ellipse at 70% 20%, black 20%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-e-10 -top-16 size-44 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative space-y-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium tracking-[0.14em] text-white/55">
              دفتر سفر
            </p>
            <h1 className="text-[2rem] font-bold leading-[1.05] tracking-tight text-white">
              SuperHesab
            </h1>
            <p className="max-w-[17rem] text-[13px] leading-relaxed text-white/78">
              خرج‌ها را با هم ثبت کن؛ تراز و تسویه خودش سر جایش می‌نشیند.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-white/12 px-2.5 py-1 text-[11px] font-medium text-white/85">
              سفر
            </span>
            <span className="rounded-lg bg-white/12 px-2.5 py-1 text-[11px] font-medium text-white/85">
              دورهمی
            </span>
            <span className="rounded-lg bg-white/12 px-2.5 py-1 text-[11px] font-medium text-white/85">
              دونفره
            </span>
          </div>
        </div>
      </header>

      {/* Spaces list is the product */}
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">
              فضاهای من
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              دفاتر مشترک حساب‌وکتاب
            </p>
          </div>
        </div>

        {memberships.length === 0 ? (
          <EmptyState
            icon="space"
            title="هیچ حساب و کتابی ندارید"
            description="برای شروع، یک سفر گروهی جدید بسازید یا حساب مشترک دونفره خود را ایجاد کنید."
            className="flex-1 justify-center"
            actionNode={<HomeEmptyActions error={error} />}
          />
        ) : (
          <ul className="space-y-2.5">
            {memberships.map(({ space, role }, index) => {
              const template = getTemplate(space.type);
              const isTrip = space.type === "TRIP";
              return (
                <li
                  key={space.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
                >
                  <Link
                    href={`/spaces/${space.id}`}
                    className={cn(
                      "group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border/55 bg-white px-3.5 py-3.5",
                      "transition-[transform,box-shadow,border-color] duration-150 ease-out",
                      "hover:border-primary/25 hover:shadow-[0_12px_32px_-20px_rgba(15,92,87,0.5)]",
                      "active:scale-[0.985]",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-3 start-0 w-[3px] rounded-full",
                        isTrip ? "bg-primary" : "bg-highlight",
                      )}
                    />
                    <span
                      className={cn(
                        "flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl text-[11px] font-bold leading-tight",
                        isTrip
                          ? "bg-[linear-gradient(145deg,#e7f3f1,#d5ebe7)] text-primary"
                          : "bg-[linear-gradient(145deg,#e8f6f3,#d0ebe4)] text-ink",
                      )}
                    >
                      {isTrip ? "سفر" : "۲نفر"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.95rem] font-semibold text-foreground">
                        {space.name}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {template.label}
                        <span className="mx-1.5 text-border">·</span>
                        {roleLabel(role)}
                        <span className="mx-1.5 text-border">·</span>
                        {space._count.members} عضو
                        <span className="mx-1.5 text-border">·</span>
                        {space._count.expenses} هزینه
                      </p>
                    </div>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <Chevron className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Create CTA — fixed, not a form block on the page */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto w-full max-w-lg">
          <CreateSpaceSheet error={error} layout="fab" />
        </div>
      </div>
    </main>
  );
}
