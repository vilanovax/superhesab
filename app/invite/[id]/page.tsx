import Link from "next/link";
import { notFound } from "next/navigation";
import { getInviteMeta } from "@/app/actions/invite";
import { getClaimPreview } from "@/app/actions/members";
import { JoinSpaceButton } from "@/components/spaces/join-space-button";
import { SpaceTheme } from "@/components/spaces/space-theme";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { currencyLabel } from "@/lib/format";
import { roleLabelFa } from "@/lib/rbac";
import { getTemplateDataset } from "@/lib/templates/registry";
import type { SpaceRole } from "@/types";

type InvitePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; claim?: string; role?: string }>;
};

export default async function InvitePage({
  params,
  searchParams,
}: InvitePageProps) {
  const { id } = await params;
  const { error, claim, role } = await searchParams;
  const session = await requireUser();

  const meta = await getInviteMeta(id);
  if (!meta) {
    notFound();
  }

  const membership = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: { spaceId: id, userId: session.userId },
    },
  });

  const claimPreview = claim ? await getClaimPreview(id, claim) : null;
  const lockedRole: SpaceRole | null = claimPreview
    ? claimPreview.role === "OWNER"
      ? "EDITOR"
      : (claimPreview.role as SpaceRole)
    : role === "VIEWER" || role === "EDITOR"
      ? role
      : null;
  const templateDataset = getTemplateDataset(meta.type);

  return (
    <main
      data-template={templateDataset}
      className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6"
    >
      <SpaceTheme type={meta.type} />
      <div className="surface-hero animate-fade-up relative overflow-hidden rounded-2xl p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-8 -top-10 size-32 rounded-full bg-on-hero/15 blur-2xl"
        />
        <p className="text-xs font-medium text-on-hero/70">{meta.templateLabel}</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug text-on-hero">
          {claimPreview
            ? `شما دعوت شده‌اید تا حساب ${claimPreview.name} را مدیریت کنید`
            : `شما به «${meta.name}» دعوت شده‌اید`}
        </h1>
        <p className="mt-3 text-sm text-on-hero/75">
          {meta._count.members} عضو فعلی · واحد پول{" "}
          {currencyLabel(meta.currency)}
          {lockedRole ? ` · نقش: ${roleLabelFa(lockedRole)}` : null}
        </p>
      </div>

      <section className="animate-fade-up space-y-4 rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur-sm">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {claimPreview
            ? `با تأیید، هزینه‌ها و بدهی‌های «${claimPreview.name}» به حساب شما منتقل می‌شود و نقش ${roleLabelFa(lockedRole ?? "EDITOR")} برای شما ثبت می‌شود.`
            : meta.allowInviteRolePick
              ? "با پیوستن، تراکنش‌های خانواده را می‌بینید و بر اساس نقش دعوت‌شده می‌توانید ثبت کنید."
              : "با پیوستن، می‌توانید هزینه ثبت کنید، چک‌لیست را ببینید و در تسویه مشارکت داشته باشید."}
        </p>

        {claim && !claimPreview ? (
          <p className="text-sm text-destructive" role="alert">
            این لینک ادعا معتبر نیست یا قبلاً استفاده شده.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {membership && !claimPreview ? (
          <p className="rounded-xl bg-success-soft px-3 py-2 text-sm text-success">
            شما از قبل عضو این فضا هستید.
          </p>
        ) : null}

        <JoinSpaceButton
          spaceId={meta.id}
          alreadyMember={Boolean(membership)}
          claimVirtualUserId={claimPreview?.id ?? null}
          claimLabel={claimPreview?.name ?? null}
          inviteRole={role ?? null}
        />

        <Button asChild variant="ghost" className="h-12 w-full rounded-xl">
          <Link href="/app">بازگشت به داشبورد</Link>
        </Button>
      </section>
    </main>
  );
}
