"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import {
  MembersList,
  type MembersListRow,
} from "@/components/MembersList";
import { useIsDesktop } from "@/components/hooks/use-is-desktop";
import { Button } from "@/components/ui/button";
import type { SpaceRole, SpaceType } from "@/types";

const InviteMembersDesktop = dynamic(
  () =>
    import("@/components/spaces/invite-members-desktop").then(
      (m) => m.InviteMembersDesktop,
    ),
  { ssr: false },
);

const InviteMembersMobile = dynamic(
  () =>
    import("@/components/spaces/invite-members-mobile").then(
      (m) => m.InviteMembersMobile,
    ),
  { ssr: false },
);

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
  const isTripLike =
    spaceType === "TRIP" || spaceType === "PARTNER" || spaceType === "FAMILY";
  const compactSheet = isBuilding || isFund || isTripLike;

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
      ? "دعوت، ضریب سهم، عضو دستی"
      : spaceType === "TRIP"
        ? "لینک دعوت، نقش و ضریب تسهیم"
        : spaceType === "PARTNER"
          ? "لینک دعوت، نقش و ضریب"
          : inviteRolePicker
            ? "فعال ثبت می‌کند · ناظر فقط می‌بیند"
            : `لینک ادعا یا افزودن دستی — «${spaceName}»`;

  const panel = (
    <MembersList
      spaceId={spaceId}
      spaceName={spaceName}
      members={members}
      currentUserRole={currentUserRole}
      inviteRolePicker={inviteRolePicker && !isBuilding}
      shareCaption={shareCaptionFor(spaceType)}
      maxMembers={maxMembers}
      showShareControls={
        spaceType === "TRIP" || spaceType === "PARTNER" || spaceType === "FUND"
      }
      editorOnlyRoles={isBuilding}
      fundLayout={isFund || isTripLike}
      fundSheet={isFund}
      editorRoleLabel={
        isFund || spaceType === "FAMILY" || spaceType === "PERSONAL"
          ? "فعال"
          : "ویرایشگر"
      }
    />
  );

  if (isDesktop === null) {
    return (
      <span
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true);
        }}
        role="button"
        tabIndex={0}
      >
        {trigger}
      </span>
    );
  }

  if (isDesktop) {
    return (
      <InviteMembersDesktop
        open={open}
        onOpenChange={setOpen}
        trigger={trigger}
        title={title}
        description={description}
      >
        {panel}
      </InviteMembersDesktop>
    );
  }

  return (
    <InviteMembersMobile
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={title}
      description={description}
      compactSheet={compactSheet}
    >
      {panel}
    </InviteMembersMobile>
  );
}
