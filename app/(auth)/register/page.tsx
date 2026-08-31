import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { prisma } from "@/lib/db/prisma";
import { safeCallbackUrl } from "@/lib/safe-callback-url";
import { getSession } from "@/lib/session";

export default async function RegisterPage({
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
    redirect("/auth/session/clear?next=/register");
  }

  return (
    <AuthShell>
      <RegisterForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}
