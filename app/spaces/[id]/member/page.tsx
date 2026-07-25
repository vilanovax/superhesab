import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFundMemberPortal } from "@/app/actions/fund";
import { FundMemberPortal } from "@/components/spaces/fund-member-portal";
import { SpaceTheme } from "@/components/spaces/space-theme";
import { Button } from "@/components/ui/button";
import { requireSpaceMember, requireUser } from "@/lib/auth/guards";
import { canMutateMoney } from "@/lib/rbac";
import { getTemplate, getTemplateDataset } from "@/lib/templates/registry";
import { prisma } from "@/lib/db/prisma";

type MemberPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
};

export default async function FundMemberPage({
  params,
  searchParams,
}: MemberPageProps) {
  const { id } = await params;
  const { period: periodParam } = await searchParams;
  const session = await requireUser();
  const membership = await requireSpaceMember(id, session.userId);
  if (!membership) notFound();

  if (canMutateMoney(membership.role)) {
    redirect(`/spaces/${id}`);
  }

  const space = await prisma.space.findUnique({
    where: { id },
    select: { type: true, name: true },
  });
  if (!space || !getTemplate(space.type).features.fundRotating) {
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
          variant="outline"
          size="sm"
          className="h-9 gap-1 rounded-xl border-border/60 bg-card pe-3 ps-2 text-sm font-medium shadow-sm"
        >
          <Link href="/app">← بازگشت</Link>
        </Button>
        <span className="rounded-xl bg-muted px-2.5 py-1 text-caption font-medium text-muted-foreground">
          پرتال عضو
        </span>
      </div>
      <FundMemberPortal portal={portal} />
    </main>
  );
}
