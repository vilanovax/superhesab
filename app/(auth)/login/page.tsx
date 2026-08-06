import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/session";

function safeCallbackUrl(raw: string | undefined): string {
  if (!raw) return "/app";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/app";
  return raw;
}

/**
 * Login stays fully SSR — a large dynamic() skeleton was winning LCP and
 * delaying paint until the client chunk arrived. Session check is cookie-only
 * for guests (no DB); DB only when a token is present.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; next?: string }>;
}) {
  const [params, session] = await Promise.all([searchParams, getSession()]);
  const callbackUrl = safeCallbackUrl(params.callbackUrl ?? params.next);

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
