import Link from "next/link";
import { redirect } from "next/navigation";
import { claimUnit } from "@/app/actions/building";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db/prisma";

type UnitInvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function UnitInviteClaimPage({
  params,
}: UnitInvitePageProps) {
  const { token } = await params;
  const callbackPath = `/invite/unit/${encodeURIComponent(token)}`;

  const session = await getSession();
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true },
  });
  if (!user) {
    redirect(
      `/auth/session/clear?next=${encodeURIComponent(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`)}`,
    );
  }

  const result = await claimUnit(token);
  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center gap-5 px-4 py-12">
        <div className="rounded-2xl border border-destructive/25 bg-destructive-soft/40 px-5 py-6 text-center">
          <h1 className="text-body font-bold text-foreground">
            اتصال به واحد ممکن نیست
          </h1>
          <p className="mt-2 text-body-sm leading-relaxed text-muted-foreground">
            {result.error}
          </p>
          <Button asChild className="mt-5 h-11 rounded-xl">
            <Link href="/app">بازگشت به خانه</Link>
          </Button>
        </div>
      </main>
    );
  }

  redirect(`/spaces/${result.spaceId}/resident`);
}
