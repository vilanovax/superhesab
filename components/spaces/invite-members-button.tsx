"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import type { SpaceRole, SpaceType } from "@/types";
import { cn } from "@/lib/utils";

export type InviteMemberRow = MembersListRow;

type InviteMembersButtonProps = {
  spaceId: string;
  spaceName: string;
  members: InviteMemberRow[];
  currentUserRole: SpaceRole;
  /** icon = hero +; banner = large CTA; empty = secondary; inline = compact row CTA */
  variant?: "icon" | "banner" | "empty" | "inline";
  /** FAMILY / FUND: role picker on invite link */
  inviteRolePicker?: boolean;
  spaceType?: SpaceType;
  maxMembers?: number | null;
  /** Optional custom trigger (e.g. settings page CTA). */
  trigger?: ReactNode;
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

function shareCaptionFor(type?: SpaceType): string {
  if (type === "FUND") return "ضریب سهم";
  if (type === "FAMILY" || type === "PERSONAL") return "ضریب";
  return "ضریب تسهیم";
}

export function InviteMembersButton({
  spaceId,
  spaceName,
  members,
  currentUserRole,
  variant = "icon",
  inviteRolePicker = false,
  spaceType,
  maxMembers = null,
  trigger: customTrigger,
}: InviteMembersButtonProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const isBuilding = spaceType === "BUILDING";
  const isFund = spaceType === "FUND";
  const compactSheet = isBuilding || isFund;

  // Invite / member management is OWNER-only (VIEWER and EDITOR cannot share)
  if (currentUserRole !== "OWNER") {
    return null;
  }

  const trigger =
    customTrigger ??
    (variant === "banner" ? (
      <Button
        type="button"
        className="mt-4 h-11 w-full rounded-xl text-sm font-semibold"
      >
        {isBuilding
          ? "مدیریت مدیران"
          : isFund
            ? "مدیریت اعضا"
            : inviteRolePicker
              ? "دعوت عضو خانواده"
              : "دعوت طرف مقابل"}
      </Button>
    ) : variant === "inline" ? (
      <Button
        type="button"
        size="sm"
        className="h-9 shrink-0 rounded-xl px-3 text-caption font-semibold"
      >
        دعوت
      </Button>
    ) : variant === "empty" ? (
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-xl border-border/70 bg-card text-body-sm font-semibold"
      >
        {isBuilding
          ? "دعوت هم‌مدیر"
          : isFund
            ? "دعوت عضو صندوق"
            : inviteRolePicker
              ? "دعوت عضو خانواده"
              : "دعوت همسفر"}
      </Button>
    ) : (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8 rounded-full border border-on-hero/30 bg-on-hero/15 text-on-hero hover:bg-on-hero/25 hover:text-on-hero"
        aria-label={
          isBuilding
            ? "مدیریت مدیران"
            : isFund
              ? "مدیریت اعضا"
              : "دعوت از اعضا"
        }
      >
        <UserPlusIcon className="size-4" />
      </Button>
    ));

  const title = isBuilding
    ? "مدیران ساختمان"
    : isFund
      ? "اعضای صندوق"
      : variant === "banner"
        ? inviteRolePicker
          ? "دعوت به خانواده"
          : "دعوت به حساب مشترک"
        : "مدیریت اعضا";
  const description = isBuilding
    ? "لینک دعوت برای هم‌مدیر · ساکن‌ها از لینک واحد می‌آیند"
    : isFund
      ? "لینک دعوت، ضریب سهم و عضو دستی"
      : variant === "banner"
        ? `لینک ادعا یا افزودن دستی — «${spaceName}»`
        : `نقش‌ها، لینک ادعا و عضو دستی برای «${spaceName}»`;

  const panel = (
    <MembersList
      spaceId={spaceId}
      spaceName={spaceName}
      members={members}
      currentUserRole={currentUserRole}
      inviteRolePicker={inviteRolePicker && !isBuilding}
      shareCaption={shareCaptionFor(spaceType)}
      maxMembers={maxMembers}
      showShareControls={!isBuilding}
      editorOnlyRoles={isBuilding}
      fundLayout={isFund}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto overscroll-contain border-border/70 bg-card/95 sm:max-w-md">
          <DialogHeader className="text-start">
            <DialogTitle className="text-pretty">{title}</DialogTitle>
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
      <DrawerContent
        className={cn(
          "overflow-hidden overscroll-contain border-border/60 bg-sheet",
          compactSheet && "max-h-[78dvh]",
        )}
      >
        <DrawerHeader
          className={cn(
            "shrink-0 text-start",
            compactSheet ? "pb-1.5 pt-1" : "pb-2",
          )}
        >
          <DrawerTitle className="text-pretty">{title}</DrawerTitle>
          <DrawerDescription
            className={compactSheet ? "text-caption" : undefined}
          >
            {description}
          </DrawerDescription>
        </DrawerHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4",
            compactSheet ? "pb-6" : "pb-8",
          )}
        >
          {panel}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
