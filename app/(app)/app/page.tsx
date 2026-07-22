import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";
import { logout } from "@/app/actions/auth";

export default async function AppHomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, phone: true, name: true, avatarUrl: true },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.avatarUrl ?? "https://api.dicebear.com/9.x/thumbs/svg?seed=user"}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full bg-zinc-100"
          />
          <div>
            <p className="text-sm text-zinc-500">خوش آمدید</p>
            <p className="font-medium text-zinc-900" dir="ltr">
              {user.name ?? user.phone}
            </p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            خروج
          </button>
        </form>
      </header>

      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          داشبورد
        </h1>
        <p className="text-sm leading-relaxed text-zinc-600">
          احراز هویت آماده است. مرحله بعد: Spaces، دعوت، و ثبت هزینه.
        </p>
      </section>
    </main>
  );
}
