import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFundMemberPortal } from "@/app/actions/fund";
import { FundMemberPortal } from "@/components/spaces/fund-member-portal";
import { SpaceTheme } from "@/components/spaces/space-theme";
import { Button } from "@/components/ui/button";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { canMutateMoney } from "@/lib/rbac";
import { getTemplate, getTemplateDataset } from "@/lib/templates/registry";

type MemberPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
};

export default async function FundMemberPage({
  params,
  searchParams,
}: MemberPageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { period: periodParam } = sp;
  const session = await requireUser();
  const membership = await requireSpaceMember(id, session.userId);
  if (!membership) notFound();

  if (canMutateMoney(membership.role)) {
    redirect(`/spaces/${id}`);
  }

  const space = membership.space;
  if (!getTemplate(space.type).features.fundRotating) {
    notFound();
  }

  const periodRaw = Number.parseInt(
    String(periodParam ?? "").replace(/\D/g, ""),
    10,
  );
  const periodIndex =
    Number.isFinite(periodRaw) && periodRaw >= 1 ? periodRaw : undefined;

  const portal = await getFundMemberPortal(id, periodIndex);
  if (!portal) notFound();

  return (
    <main
      data-template={getTemplateDataset(space.type)}
      className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3"
    >
      <SpaceTheme type={space.type} />
      <div className="mb-3 flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-10 gap-1 rounded-full border border-border/55 bg-card px-3 text-sm font-medium shadow-none"
        >
          <Link href="/app">← بازگشت</Link>
        </Button>
        <span className="rounded-full bg-primary/10 px-3 py-1.5 text-caption font-semibold text-primary">
          پرتال عضو
        </span>
      </div>
      <FundMemberPortal portal={portal} />
    </main>
  );
}
