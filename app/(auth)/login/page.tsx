import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/session";

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
    <main className="mx-auto flex min-h-full w-full flex-1 flex-col items-center justify-center px-6 py-16">
      <LoginForm callbackUrl={callbackUrl} />
    </main>
  );
}
