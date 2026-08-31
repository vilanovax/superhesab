"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { archiveSpace } from "@/app/actions/space";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 7h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
      <path d="M9 3h6l1 4H8l1-4Z" />
      <path d="M10 12h4" />
    </svg>
  );
}

export function SpaceArchiveButton({
  spaceId,
  spaceName,
  variant = "icon",
}: {
  spaceId: string;
  spaceName: string;
  /** icon = compact (legacy); panel = settings row; compact = button in shared card */
  variant?: "icon" | "panel" | "compact";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onArchive() {
    setError(null);
    startTransition(async () => {
      const result = await archiveSpace(spaceId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmOpen(false);
      // Do not refresh the current space route — archived spaces return 404
      // via requireSpaceMember. Leave for the archive list instead.
      router.replace(
        `/app/archive?archived=${encodeURIComponent(result.name)}`,
      );
    });
  }

  function openConfirm() {
    setError(null);
    setConfirmOpen(true);
  }

  return (
    <>
      {variant === "panel" ? (
        <section className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur-sm">
          <div>
            <h2 className="text-pretty text-body-sm font-semibold text-foreground">
              آرشیو دفتر
            </h2>
            <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
              دفتر از لیست اصلی خارج می‌شود. بعداً از صفحه آرشیو قابل بازگردانی
              یا حذف دائمی است.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive-soft hover:text-destructive"
            onClick={openConfirm}
          >
            <ArchiveIcon className="size-4" />
            آرشیو این دفتر
          </Button>
        </section>
      ) : variant === "compact" ? (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full rounded-xl border-destructive/30 text-caption text-destructive hover:bg-destructive-soft hover:text-destructive"
          onClick={openConfirm}
        >
          <ArchiveIcon className="size-3.5" />
          آرشیو دفتر
        </Button>
      ) : (
        <button
          type="button"
          aria-label={`آرشیو ${spaceName}`}
          title="آرشیو"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary active:scale-95",
          )}
          onClick={openConfirm}
        >
          <ArchiveIcon className="size-3.5" />
        </button>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="آرشیو دفتر"
        description={`دفتر «${spaceName}» از لیست اصلی خارج می‌شود. بعداً می‌توانید از صفحه آرشیو آن را برگردانید یا برای همیشه حذف کنید.`}
        confirmLabel="آرشیو شود"
        pending={pending}
        error={error}
        onConfirm={onArchive}
      />
    </>
  );
}
