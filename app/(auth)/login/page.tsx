import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/app");
  }

  return (
    <main className="mx-auto flex min-h-full w-full flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16">
      <LoginForm />
    </main>
  );
}
