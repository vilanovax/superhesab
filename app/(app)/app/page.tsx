import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { createSpaceAndRedirect } from "@/app/actions/space";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTemplate } from "@/lib/templates/registry";

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
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              user.avatarUrl ??
              "https://api.dicebear.com/9.x/thumbs/svg?seed=user"
            }
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full bg-muted"
          />
          <div>
            <p className="text-sm text-muted-foreground">خوش آمدید</p>
            <p className="font-medium text-foreground" dir="ltr">
              {user.name ?? user.phone}
            </p>
          </div>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            خروج
          </Button>
        </form>
      </header>

      <section className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-none">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            فضای جدید
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            برای تست موتور هزینه، یک سفر یا حساب دونفره بسازید.
          </p>
        </div>
        <form action={createSpaceAndRedirect} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name">نام فضا</Label>
            <Input
              id="name"
              name="name"
              required
              minLength={2}
              placeholder="سفر شمال"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">نوع</Label>
            <select
              id="type"
              name="type"
              defaultValue="TRIP"
              className="flex h-12 w-full rounded-lg border border-input bg-card px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <option value="TRIP">سفر و دورهمی</option>
              <option value="PARTNER">حساب دونفره</option>
            </select>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full">
            ساخت فضا
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">فضاهای من</h2>
        {memberships.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            هنوز فضایی ندارید.
          </p>
        ) : (
          <ul className="space-y-2">
            {memberships.map(({ space, role }) => (
              <li key={space.id}>
                <Link
                  href={`/spaces/${space.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {space.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getTemplate(space.type).label} · {role} ·{" "}
                      {space._count.members} عضو · {space._count.expenses}{" "}
                      هزینه
                    </p>
                  </div>
                  <span className="text-muted-foreground">←</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
