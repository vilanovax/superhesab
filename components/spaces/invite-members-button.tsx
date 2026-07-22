"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addVirtualMember } from "@/app/actions/virtualMember";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { memberLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export type InviteMemberRow = {
  userId: string;
  name: string | null;
  phone: string;
  avatarUrl: string | null;
  role: "OWNER" | "EDITOR";
  isVirtual?: boolean;
};

type InviteMembersButtonProps = {
  spaceId: string;
  spaceName: string;
  members: InviteMemberRow[];
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

function UserPlusIcon({ className }: { className?: string }) {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

function roleLabel(role: "OWNER" | "EDITOR", isVirtual?: boolean) {
  if (isVirtual) return "عضو دستی";
  return role === "OWNER" ? "مالک" : "ویرایشگر";
}

function ShareIcon({ className }: { className?: string }) {
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
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function InvitePanel({
  spaceId,
  spaceName,
  members,
}: {
  spaceId: string;
  spaceName: string;
  members: InviteMemberRow[];
}) {
  const router = useRouter();
  const [shareState, setShareState] = useState<"idle" | "done">("idle");
  const [manualName, setManualName] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return `/invite/${spaceId}`;
    return `${window.location.origin}/invite/${spaceId}`;
  }, [spaceId]);

  async function shareInvite() {
    const title = `دعوت به ${spaceName}`;
    const text = `به «${spaceName}» در SuperHesab بپیوند`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url: inviteUrl });
        setShareState("done");
        window.setTimeout(() => setShareState("idle"), 2000);
        return;
      }
    } catch (err) {
      // User dismissed share sheet — don't fall through to copy noise
      if (err instanceof DOMException && err.name === "AbortError") return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setShareState("done");
      window.setTimeout(() => setShareState("idle"), 2000);
    } catch {
      setShareState("idle");
    }
  }

  function onAddVirtual(e: React.FormEvent) {
    e.preventDefault();
    setManualError(null);
    startTransition(async () => {
      const result = await addVirtualMember(spaceId, manualName);
      if (!result.ok) {
        setManualError(result.error);
        return;
      }
      setManualName("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Compact share — no URL shown */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-white/80 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">دعوت با لینک</p>
          <p className="text-[11px] text-muted-foreground">
            {shareState === "done"
              ? "آمادهٔ ارسال شد"
              : "شیر برای تلگرام، واتس‌اپ و …"}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          onClick={shareInvite}
          className={cn(
            "size-11 shrink-0 rounded-xl transition-colors",
            shareState === "done" && "bg-success hover:bg-success/90",
          )}
          aria-label={shareState === "done" ? "لینک آماده شد" : "اشتراک لینک دعوت"}
        >
          {shareState === "done" ? (
            <CheckIcon className="size-5" />
          ) : (
            <ShareIcon className="size-5" />
          )}
        </Button>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-border/60 bg-white/70 p-3.5">
        <div>
          <p className="text-sm font-medium text-foreground">افزودن دستی</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            بدون نصب اپ — فقط نام همسفر
          </p>
        </div>
        <form onSubmit={onAddVirtual} className="flex gap-2">
          <Input
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="مثلاً علی"
            className="h-11 rounded-xl border-border/70 bg-white"
            maxLength={40}
            required
            minLength={2}
          />
          <Button
            type="submit"
            className="h-11 shrink-0 rounded-xl px-4"
            disabled={pending}
          >
            {pending ? "…" : "افزودن"}
          </Button>
        </form>
        {manualError ? (
          <p className="text-xs text-destructive" role="alert">
            {manualError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          اعضا ({members.length})
        </p>
        <ul className="max-h-52 space-y-2 overflow-y-auto">
          {members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-3 py-2.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  m.avatarUrl ??
                  `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(m.name || m.phone)}`
                }
                alt=""
                width={36}
                height={36}
                className="size-9 rounded-full bg-secondary"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {memberLabel(m)}
                </p>
                {!m.isVirtual ? (
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {m.phone}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">بدون حساب اپ</p>
                )}
              </div>
              <span
                className={cn(
                  "rounded-lg px-2 py-1 text-[11px] font-semibold",
                  m.isVirtual
                    ? "bg-accent text-accent-foreground"
                    : m.role === "OWNER"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {roleLabel(m.role, m.isVirtual)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function InviteMembersButton({
  spaceId,
  spaceName,
  members,
}: InviteMembersButtonProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const trigger = (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-8 rounded-full border border-white/30 bg-white/15 text-white hover:bg-white/25 hover:text-white"
      aria-label="دعوت از اعضا"
    >
      <UserPlusIcon className="size-4" />
    </Button>
  );

  const panel = (
    <InvitePanel spaceId={spaceId} spaceName={spaceName} members={members} />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border/70 bg-card/95 sm:max-w-md">
          <DialogHeader className="text-start">
            <DialogTitle>دعوت از اعضا</DialogTitle>
            <DialogDescription>
              شیر لینک یا افزودن دستی به «{spaceName}»
            </DialogDescription>
          </DialogHeader>
          {panel}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="border-border/60 bg-[#eef5f4]">
        <DrawerHeader className="text-start">
          <DrawerTitle>دعوت از اعضا</DrawerTitle>
          <DrawerDescription>
            شیر لینک یا افزودن دستی به «{spaceName}»
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-8">{panel}</div>
      </DrawerContent>
    </Drawer>
  );
}
