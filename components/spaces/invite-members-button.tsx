"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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

function roleLabel(role: "OWNER" | "EDITOR") {
  return role === "OWNER" ? "مالک" : "ویرایشگر";
}

function InvitePanel({
  spaceId,
  members,
}: {
  spaceId: string;
  spaceName: string;
  members: InviteMemberRow[];
}) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return `/invite/${spaceId}`;
    return `${window.location.origin}/invite/${spaceId}`;
  }, [spaceId]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">لینک دعوت</p>
        <div className="rounded-xl border border-border/70 bg-muted/50 px-3 py-3">
          <p className="break-all text-sm font-medium text-foreground" dir="ltr">
            {inviteUrl}
          </p>
        </div>
        <Button
          type="button"
          className="h-12 w-full rounded-xl"
          onClick={copyLink}
        >
          {copied ? "لینک کپی شد ✓" : "کپی لینک"}
        </Button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          لینک را در تلگرام یا واتس‌اپ بفرستید. مهمان بعد از ورود با نقش
          ویرایشگر عضو می‌شود.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          اعضای فعلی ({members.length})
        </p>
        <ul className="max-h-56 space-y-2 overflow-y-auto">
          {members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-3 py-2.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  m.avatarUrl ??
                  `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(m.phone)}`
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
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {m.phone}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-lg px-2 py-1 text-[11px] font-semibold",
                  m.role === "OWNER"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {roleLabel(m.role)}
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
      className="size-9 rounded-full border border-white/30 bg-white/15 text-white hover:bg-white/25 hover:text-white"
      aria-label="دعوت از اعضا"
    >
      <UserPlusIcon className="size-5" />
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
              لینک دعوت را برای پیوستن به «{spaceName}» بفرستید.
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
            لینک دعوت را برای پیوستن به «{spaceName}» بفرستید.
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-8">{panel}</div>
      </DrawerContent>
    </Drawer>
  );
}
