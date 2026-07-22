"use client";

import { useEffect, useState } from "react";
import {
  MembersList,
  type MembersListRow,
} from "@/components/MembersList";
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
import type { SpaceRole } from "@/types";

export type InviteMemberRow = MembersListRow;

type InviteMembersButtonProps = {
  spaceId: string;
  spaceName: string;
  members: InviteMemberRow[];
  currentUserRole: SpaceRole;
  /** icon = hero +; banner = partner empty-state CTA */
  variant?: "icon" | "banner";
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

export function InviteMembersButton({
  spaceId,
  spaceName,
  members,
  currentUserRole,
  variant = "icon",
}: InviteMembersButtonProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();

  // Invite / member management is OWNER-only (VIEWER and EDITOR cannot share)
  if (currentUserRole !== "OWNER") {
    return null;
  }

  const trigger =
    variant === "banner" ? (
      <Button
        type="button"
        className="mt-4 h-11 w-full rounded-xl text-[14px] font-semibold"
      >
        دعوت طرف مقابل
      </Button>
    ) : (
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

  const title = variant === "banner" ? "دعوت به حساب مشترک" : "مدیریت اعضا";
  const description =
    variant === "banner"
      ? `لینک ادعا یا افزودن دستی — «${spaceName}»`
      : `نقش‌ها، لینک ادعا و عضو دستی برای «${spaceName}»`;

  const panel = (
    <MembersList
      spaceId={spaceId}
      spaceName={spaceName}
      members={members}
      currentUserRole={currentUserRole}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border/70 bg-card/95 sm:max-w-md">
          <DialogHeader className="text-start">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
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
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-8">{panel}</div>
      </DrawerContent>
    </Drawer>
  );
}
