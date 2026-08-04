import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/session";

const LoginForm = dynamic(
  () =>
    import("@/components/auth/login-form").then((m) => m.LoginForm),
  {
    loading: () => (
      <div
        className="min-h-[22rem] overflow-hidden rounded-[1.35rem] border border-border/60 bg-card shadow-lg"
        aria-hidden
      >
        <div className="surface-hero h-[7.5rem] animate-pulse" />
        <div className="space-y-3 p-5">
          <div className="h-11 animate-pulse rounded-xl bg-muted/70" />
          <div className="h-11 animate-pulse rounded-xl bg-muted/50" />
          <div className="h-11 animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>
    ),
  },
);

function safeCallbackUrl(raw: string | undefined): string {
  if (!raw) return "/app";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/app";
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; next?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl ?? params.next);

  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true },
    });
    if (user) {
      redirect(callbackUrl);
    }
    redirect("/auth/session/clear?next=/login");
  }

  return (
    <AuthShell>
      <LoginForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}
