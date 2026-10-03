"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mintSpaceInviteLink } from "@/app/actions/invite";
import {
  changeMemberRole,
  mintClaimInviteLink,
  removeSpaceMember,
  renameVirtualMember,
  updateMemberDefaultShare,
} from "@/app/actions/members";
import { addVirtualMember } from "@/app/actions/virtualMember";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { memberDisplayNameTaken, memberLabel } from "@/lib/format";
import {
  clampShare,
  DEFAULT_SHARE,
  formatShareLabel,
  MAX_SHARE,
  MIN_SHARE,
  SHARE_STEP,
} from "@/lib/money";
import { roleLabelFa } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import type { SpaceRole } from "@/types";

export type MembersListRow = {
  userId: string;
  name: string | null;
  phone: string;
  avatarUrl: string | null;
  role: SpaceRole;
  isVirtual?: boolean;
  defaultShare?: number;
};

type MembersListProps = {
  spaceId: string;
  spaceName: string;
  members: MembersListRow[];
  /** Current user's role — only OWNER gets management controls */
  currentUserRole: SpaceRole;
  /** Show EDITOR/VIEWER picker when copying the public invite link */
  inviteRolePicker?: boolean;
  /**
   * Caption beside the share stepper.
   * FUND uses share units; trip/partner use equal-split weights.
   */
  shareCaption?: string;
  /** Soft capacity hint, e.g. maxMembers for FUND */
  maxMembers?: number | null;
  /** Hide defaultShare stepper (BUILDING managers). */
  showShareControls?: boolean;
  /**
   * BUILDING: co-managers are EDITOR only; VIEWER is reserved for unit claim.
   */
  editorOnlyRoles?: boolean;
  /**
   * Compact sheet — primary invite CTA, dense member rows + share, manual add footer.
   * Used by FUND, TRIP, PARTNER, FAMILY.
   */
  fundLayout?: boolean;
  /** FUND-only denser rows (claim as text, tighter role/share). */
  fundSheet?: boolean;
  /** EDITOR label in dense role pickers (FUND: فعال · trip: ویرایشگر). */
  editorRoleLabel?: string;
};

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

function CopyIcon({ className }: { className?: string }) {
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
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
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
      <path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5.93" />
      <path d="M14 11a5 5 0 0 0-7.07 0L5.5 12.41a5 5 0 0 0 7.07 7.07L14 18.07" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function MemberTrashIcon({ className }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}

export function MembersList({
  spaceId,
  spaceName,
  members,
  currentUserRole,
  inviteRolePicker = false,
  shareCaption = "ضریب تسهیم",
  maxMembers = null,
  showShareControls = true,
  editorOnlyRoles = false,
  fundLayout = false,
  fundSheet = false,
  editorRoleLabel = "ویرایشگر",
}: MembersListProps) {
  const router = useRouter();
  const isOwner = currentUserRole === "OWNER";
  const [spaceLinkState, setSpaceLinkState] = useState<"idle" | "done">("idle");
  const [claimCopiedId, setClaimCopiedId] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualRole, setManualRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [inviteRole, setInviteRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [manualError, setManualError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [renameTarget, setRenameTarget] = useState<MembersListRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [removeTarget, setRemoveTarget] = useState<MembersListRow | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const addLockRef = useRef(false);
  /** Trip/Partner: EDITOR only until Viewer ships in v2. Family keeps picker. */
  const allowViewerRole = inviteRolePicker && !editorOnlyRoles;

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  async function copySpaceLink() {
    try {
      const minted = await mintSpaceInviteLink(
        spaceId,
        allowViewerRole ? inviteRole : "EDITOR",
      );
      if (!minted.ok) {
        setSpaceLinkState("idle");
        setRoleError(minted.error);
        return;
      }
      const url =
        typeof window === "undefined"
          ? minted.urlPath
          : `${window.location.origin}${minted.urlPath}`;
      await copyText(url);
      setSpaceLinkState("done");
      window.setTimeout(() => setSpaceLinkState("idle"), 2000);
    } catch {
      setSpaceLinkState("idle");
    }
  }

  async function copyClaimLink(virtualUserId: string) {
    try {
      const minted = await mintClaimInviteLink(spaceId, virtualUserId);
      if (!minted.ok) {
        setClaimCopiedId(null);
        setRoleError(minted.error);
        return;
      }
      const url =
        typeof window === "undefined"
          ? minted.urlPath
          : `${window.location.origin}${minted.urlPath}`;
      await copyText(url);
      setClaimCopiedId(virtualUserId);
      window.setTimeout(() => setClaimCopiedId(null), 2000);
    } catch {
      setClaimCopiedId(null);
    }
  }

  function onAddVirtual(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner || atCapacity || pending || addLockRef.current) return;
    if (
      fundSheet &&
      memberDisplayNameTaken(
        manualName,
        members.map((m) => m.name),
      )
    ) {
      setManualError("عضوی با این نام در صندوق هست.");
      return;
    }
    addLockRef.current = true;
    setManualError(null);
    startTransition(async () => {
      try {
        const result = await addVirtualMember(
          spaceId,
          manualName,
          allowViewerRole ? manualRole : "EDITOR",
        );
        if (!result.ok) {
          setManualError(result.error);
          return;
        }
        setManualName("");
        router.refresh();
      } finally {
        addLockRef.current = false;
      }
    });
  }

  function onChangeRole(memberUserId: string, newRole: "EDITOR" | "VIEWER") {
    if (!isOwner) return;
    setRoleError(null);
    startTransition(async () => {
      const result = await changeMemberRole(spaceId, memberUserId, newRole);
      if (!result.ok) {
        setRoleError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onChangeShare(memberUserId: string, next: number) {
    if (!isOwner) return;
    setRoleError(null);
    startTransition(async () => {
      const result = await updateMemberDefaultShare(
        spaceId,
        memberUserId,
        next,
      );
      if (!result.ok) {
        setRoleError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function openRename(member: MembersListRow) {
    setManageError(null);
    setRenameTarget(member);
    setRenameValue(member.name?.trim() ?? "");
  }

  function openRemove(member: MembersListRow) {
    setManageError(null);
    setRemoveTarget(member);
  }

  function onRename() {
    if (!renameTarget || pending) return;
    if (
      fundSheet &&
      memberDisplayNameTaken(
        renameValue,
        members
          .filter((m) => m.userId !== renameTarget.userId)
          .map((m) => m.name),
      )
    ) {
      setManageError("عضوی با این نام در صندوق هست.");
      return;
    }
    setManageError(null);
    startTransition(async () => {
      const result = await renameVirtualMember(
        spaceId,
        renameTarget.userId,
        renameValue,
      );
      if (!result.ok) {
        setManageError(result.error);
        return;
      }
      setRenameTarget(null);
      router.refresh();
    });
  }

  function onRemove() {
    if (!removeTarget || pending) return;
    setManageError(null);
    startTransition(async () => {
      const result = await removeSpaceMember(spaceId, removeTarget.userId);
      if (!result.ok) {
        setManageError(result.error);
        return;
      }
      setRemoveTarget(null);
      router.refresh();
    });
  }

  function MemberActions({ member }: { member: MembersListRow }) {
    if (!isOwner) return null;
    const canRename = Boolean(member.isVirtual);
    const canRemove = member.role !== "OWNER";
    if (!canRename && !canRemove) return null;
    return (
      <div className="flex shrink-0 items-center">
        {canRename ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground active:scale-[0.96]"
            disabled={pending}
            onClick={() => openRename(member)}
            aria-label={`تغییر نام ${memberLabel(member)}`}
            title="تغییر نام"
          >
            <PencilIcon className="size-3.5" />
          </Button>
        ) : null}
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-lg text-destructive hover:bg-destructive-soft active:scale-[0.96]"
            disabled={pending}
            onClick={() => openRemove(member)}
            aria-label={`حذف ${memberLabel(member)}`}
            title="حذف عضو"
          >
            <MemberTrashIcon className="size-3.5" />
          </Button>
        ) : null}
      </div>
    );
  }

  const manageDialogs = isOwner ? (
    <>
      <Dialog
        open={renameTarget != null}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setRenameTarget(null);
            setManageError(null);
          }
        }}
      >
        <DialogContent className="gap-4 rounded-2xl border-border/60 p-5 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-pretty text-base font-bold">
              تغییر نام
            </DialogTitle>
            <DialogDescription className="text-body-sm text-muted-foreground">
              نام نمایشی این عضو دستی در سفر عوض می‌شود.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoComplete="off"
            spellCheck={false}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            maxLength={40}
            className="h-11 rounded-xl"
            aria-label="نام جدید"
          />
          {manageError && renameTarget ? (
            <p className="text-xs text-destructive" role="alert">
              {manageError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              className="h-11 flex-1 rounded-xl"
              disabled={pending}
              onClick={onRename}
            >
              {pending ? "در حال ذخیره…" : "ذخیره"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-xl"
              disabled={pending}
              onClick={() => setRenameTarget(null)}
            >
              انصراف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={removeTarget != null}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setRemoveTarget(null);
            setManageError(null);
          }
        }}
        title="حذف عضو؟"
        description={
          removeTarget
            ? `${memberLabel(removeTarget)} از این دفتر حذف می‌شود. هزینه‌ها و تسویه‌های قبلی باید اول پاک شوند.`
            : ""
        }
        confirmLabel="حذف"
        pending={pending}
        error={manageError && removeTarget ? manageError : null}
        destructive
        onConfirm={onRemove}
      />
    </>
  ) : null;

  const atCapacity =
    maxMembers != null && members.length >= maxMembers;

  if (editorOnlyRoles) {
    return (
      <div className="space-y-4">
        {isOwner ? (
          <>
            <Button
              type="button"
              onClick={copySpaceLink}
              className={cn(
                "h-11 w-full gap-2 rounded-xl text-body-sm font-semibold active:scale-[0.98]",
                spaceLinkState === "done" &&
                  "bg-success text-success-foreground hover:bg-success/90",
              )}
              aria-label={
                spaceLinkState === "done"
                  ? "لینک دعوت هم‌مدیر کپی شد"
                  : "کپی لینک دعوت هم‌مدیر"
              }
            >
              {spaceLinkState === "done" ? (
                <CheckIcon className="size-4" />
              ) : (
                <CopyIcon className="size-4" />
              )}
              {spaceLinkState === "done"
                ? "لینک کپی شد"
                : "کپی لینک دعوت هم‌مدیر"}
            </Button>
            <span className="sr-only" aria-live="polite">
              {spaceLinkState === "done" ? "لینک دعوت هم‌مدیر کپی شد" : ""}
            </span>
          </>
        ) : null}

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
            <h3 className="text-pretty text-caption font-semibold text-muted-foreground">
              مدیران فعلی
            </h3>
            <p className="text-caption tabular-nums text-muted-foreground">
              {members.length}
            </p>
          </div>

          {roleError ? (
            <p
              className="mb-2 text-xs text-destructive"
              role="alert"
              aria-live="assertive"
            >
              {roleError}
            </p>
          ) : null}

          <ul className="overflow-hidden rounded-2xl border border-border/50 bg-card">
            {members.map((m, i) => {
              const claimDone = claimCopiedId === m.userId;
              return (
                <li
                  key={m.userId}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-3",
                    i > 0 && "border-t border-border/40",
                  )}
                >
                  <UserAvatar
                    phone={m.phone}
                    name={m.name}
                    avatarUrl={m.avatarUrl}
                    size={36}
                    className="size-9 bg-secondary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-semibold text-foreground">
                      {memberLabel(m)}
                    </p>
                    <p className="truncate text-caption text-muted-foreground">
                      {m.isVirtual ? "بدون حساب اپ" : m.phone}
                    </p>
                  </div>
                  {isOwner && m.isVirtual ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 shrink-0 rounded-lg px-2 text-caption active:scale-[0.97]",
                        claimDone
                          ? "bg-success-soft text-success"
                          : "text-muted-foreground",
                      )}
                      onClick={() => copyClaimLink(m.userId)}
                    >
                      {claimDone ? "کپی شد" : "لینک ادعا"}
                    </Button>
                  ) : null}
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-bold",
                      m.role === "OWNER"
                        ? "bg-primary/12 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {m.role === "OWNER" ? "مالک" : "مدیر"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {isOwner ? (
          <section className="border-t border-border/40 pt-3.5">
            <h3 className="text-pretty text-caption font-semibold text-muted-foreground">
              افزودن بدون اپ
            </h3>
            <p className="mt-0.5 text-caption leading-relaxed text-muted-foreground/90">
              نام را بزنید؛ بعداً با لینک ادعا وصل می‌شود.
            </p>
            <form
              onSubmit={onAddVirtual}
              className="mt-2.5 flex items-center gap-2"
            >
              <Label htmlFor="invite-virtual-name-building" className="sr-only">
                نام مدیر
              </Label>
              <Input
                id="invite-virtual-name-building"
                name="manualName"
                autoComplete="off"
                spellCheck={false}
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="مثلاً مدیر…"
                className="h-10 min-w-0 flex-1 rounded-xl border-border/60 bg-card"
                maxLength={40}
                required
                minLength={2}
                disabled={atCapacity || pending}
              />
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                className="h-10 shrink-0 rounded-xl px-3.5 active:scale-[0.97]"
                disabled={atCapacity || pending}
                aria-busy={pending}
              >
                {pending ? "در حال افزودن…" : "افزودن"}
              </Button>
            </form>
            {manualError ? (
              <p
                className="mt-2 text-xs text-destructive"
                role="alert"
                aria-live="assertive"
              >
                {manualError}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    );
  }

  if (fundLayout) {
    const inviteCtaDone = spaceLinkState === "done";

    return (
      <div className={cn("space-y-4", fundSheet && "space-y-3")}>
        {isOwner ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {inviteRolePicker ? (
                <Select
                  value={inviteRole}
                  onValueChange={(v) =>
                    setInviteRole(v as "EDITOR" | "VIEWER")
                  }
                >
                  <SelectTrigger
                    className={cn(
                      "h-11 shrink-0 rounded-xl bg-card text-caption",
                      fundSheet ? "w-[5.75rem]" : "w-[6.25rem]",
                    )}
                    aria-label="نقش لینک دعوت"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EDITOR">{editorRoleLabel}</SelectItem>
                    <SelectItem value="VIEWER">ناظر</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              <Button
                type="button"
                onClick={copySpaceLink}
                className={cn(
                  "h-11 min-w-0 flex-1 gap-2 rounded-xl text-body-sm font-semibold active:scale-[0.98]",
                  inviteCtaDone &&
                    "bg-success text-success-foreground hover:bg-success/90",
                )}
                aria-label={
                  inviteCtaDone ? "لینک دعوت کپی شد" : "کپی لینک دعوت"
                }
              >
                {inviteCtaDone ? (
                  <CheckIcon className="size-4" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
                {inviteCtaDone ? "کپی شد" : "کپی لینک دعوت"}
              </Button>
            </div>
            <span className="sr-only" aria-live="polite">
              {inviteCtaDone ? "لینک دعوت کپی شد" : ""}
            </span>
            {maxMembers != null ? (
              <p className="px-0.5 text-start text-caption tabular-nums text-muted-foreground">
                {members.length.toLocaleString("fa-IR")} از{" "}
                {maxMembers.toLocaleString("fa-IR")} عضو
                {atCapacity ? " · ظرفیت تکمیل" : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
            <h3 className="text-pretty text-caption font-semibold text-muted-foreground">
              اعضا
              <span className="ms-1 tabular-nums font-normal">
                ({members.length.toLocaleString("fa-IR")})
              </span>
            </h3>
            {showShareControls ? (
              <p className="text-caption text-muted-foreground">
                {fundSheet ? "ضریب" : shareCaption}
              </p>
            ) : null}
          </div>

          {roleError ? (
            <p
              className="mb-2 text-xs text-destructive"
              role="alert"
              aria-live="assertive"
            >
              {roleError}
            </p>
          ) : null}

          <ul
            className={cn(
              "overflow-y-auto overscroll-contain rounded-2xl border border-border/50 bg-card",
              fundSheet
                ? "max-h-[min(48dvh,20rem)]"
                : "max-h-[min(50dvh,22rem)]",
            )}
          >
            {members.map((m, i) => {
              const share = m.defaultShare ?? DEFAULT_SHARE;
              const claimDone = claimCopiedId === m.userId;
              const displayName = fundSheet
                ? (m.name?.trim() ||
                    (m.isVirtual ? "عضو" : m.phone) ||
                    "عضو")
                : memberLabel(m);

              if (fundSheet) {
                return (
                  <li
                    key={m.userId}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-2",
                      i > 0 && "border-t border-border/35",
                    )}
                  >
                    <UserAvatar
                      phone={m.phone}
                      name={m.name}
                      avatarUrl={m.avatarUrl}
                      size={28}
                      className="size-7 shrink-0 bg-secondary"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-caption font-semibold text-foreground">
                          {displayName}
                        </p>
                        {m.role === "OWNER" ? (
                          <span className="shrink-0 rounded-md bg-primary/12 px-1.5 py-0.5 text-[0.65rem] font-bold text-primary">
                            مالک
                          </span>
                        ) : null}
                        {m.isVirtual ? (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            دستی
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex min-w-0 items-center gap-2">
                        {!m.isVirtual ? (
                          <p className="truncate text-[11px] tabular-nums text-muted-foreground">
                            {m.phone}
                          </p>
                        ) : isOwner ? (
                          <button
                            type="button"
                            onClick={() => copyClaimLink(m.userId)}
                            className={cn(
                              "text-[11px] font-medium underline-offset-2 hover:underline",
                              claimDone
                                ? "text-success"
                                : "text-primary",
                            )}
                          >
                            {claimDone ? "لینک کپی شد" : "کپی لینک ادعا"}
                          </button>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            بدون اپ
                          </p>
                        )}
                      </div>
                    </div>

                    <MemberActions member={m} />

                    {isOwner && showShareControls ? (
                      <div className="flex shrink-0 items-center rounded-lg bg-muted/45 p-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-md text-muted-foreground active:scale-[0.96]"
                          disabled={pending || share <= MIN_SHARE}
                          onClick={() =>
                            onChangeShare(
                              m.userId,
                              clampShare(share - SHARE_STEP),
                            )
                          }
                          aria-label="کاهش ضریب"
                        >
                          −
                        </Button>
                        <span className="min-w-6 text-center text-[11px] font-bold tabular-nums text-foreground">
                          {formatShareLabel(share)}×
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-md text-muted-foreground active:scale-[0.96]"
                          disabled={pending || share >= MAX_SHARE}
                          onClick={() =>
                            onChangeShare(
                              m.userId,
                              clampShare(share + SHARE_STEP),
                            )
                          }
                          aria-label="افزایش ضریب"
                        >
                          +
                        </Button>
                      </div>
                    ) : showShareControls && share !== DEFAULT_SHARE ? (
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {formatShareLabel(share)}×
                      </span>
                    ) : null}

                    {isOwner && m.role !== "OWNER" && allowViewerRole ? (
                      <Select
                        value={m.role === "VIEWER" ? "VIEWER" : "EDITOR"}
                        onValueChange={(v) =>
                          onChangeRole(m.userId, v as "EDITOR" | "VIEWER")
                        }
                        disabled={pending}
                      >
                        <SelectTrigger
                          className="h-8 w-[4.25rem] shrink-0 rounded-lg px-2 text-[11px]"
                          aria-label={`نقش ${displayName}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EDITOR">
                            {editorRoleLabel}
                          </SelectItem>
                          <SelectItem value="VIEWER">ناظر</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : m.role !== "OWNER" ? (
                      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-bold text-muted-foreground">
                        {m.role === "VIEWER" ? "ناظر" : editorRoleLabel}
                      </span>
                    ) : null}
                  </li>
                );
              }

              return (
                <li
                  key={m.userId}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2",
                    i > 0 && "border-t border-border/40",
                  )}
                >
                  <UserAvatar
                    phone={m.phone}
                    name={m.name}
                    avatarUrl={m.avatarUrl}
                    size={34}
                    className="size-8 shrink-0 bg-secondary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-caption font-semibold text-foreground">
                      {memberLabel(m)}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {m.isVirtual ? "بدون حساب اپ" : m.phone}
                    </p>
                  </div>

                  {isOwner && showShareControls ? (
                    <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted/40 p-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-md text-muted-foreground active:scale-[0.96]"
                        disabled={pending || share <= MIN_SHARE}
                        onClick={() =>
                          onChangeShare(
                            m.userId,
                            clampShare(share - SHARE_STEP),
                          )
                        }
                        aria-label="کاهش ضریب"
                      >
                        −
                      </Button>
                      <span className="min-w-7 text-center text-[11px] font-bold tabular-nums text-foreground">
                        {formatShareLabel(share)}x
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-md text-muted-foreground active:scale-[0.96]"
                        disabled={pending || share >= MAX_SHARE}
                        onClick={() =>
                          onChangeShare(
                            m.userId,
                            clampShare(share + SHARE_STEP),
                          )
                        }
                        aria-label="افزایش ضریب"
                      >
                        +
                      </Button>
                    </div>
                  ) : showShareControls && share !== DEFAULT_SHARE ? (
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {formatShareLabel(share)}x
                    </span>
                  ) : null}

                  {isOwner && m.isVirtual ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "size-8 shrink-0 rounded-lg active:scale-[0.96]",
                        claimDone
                          ? "bg-success-soft text-success"
                          : "text-muted-foreground",
                      )}
                      onClick={() => copyClaimLink(m.userId)}
                      aria-label={
                        claimDone ? "لینک ادعا کپی شد" : "کپی لینک ادعا"
                      }
                    >
                      {claimDone ? (
                        <CheckIcon className="size-4" />
                      ) : (
                        <LinkIcon className="size-4" />
                      )}
                    </Button>
                  ) : null}

                  <MemberActions member={m} />

                  {isOwner && m.role !== "OWNER" && allowViewerRole ? (
                    <Select
                      value={m.role === "VIEWER" ? "VIEWER" : "EDITOR"}
                      onValueChange={(v) =>
                        onChangeRole(m.userId, v as "EDITOR" | "VIEWER")
                      }
                      disabled={pending}
                    >
                      <SelectTrigger
                        className="h-8 w-[5.5rem] shrink-0 rounded-lg text-[11px]"
                        aria-label={`نقش ${memberLabel(m)}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EDITOR">{editorRoleLabel}</SelectItem>
                        <SelectItem value="VIEWER">ناظر</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold",
                        m.role === "OWNER"
                          ? "bg-primary/12 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {m.role === "OWNER" ? "مالک" : roleLabelFa(m.role)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {isOwner ? (
          <section className="space-y-2 border-t border-border/40 pt-3">
            <h3 className="px-0.5 text-pretty text-caption font-semibold text-muted-foreground">
              افزودن بدون اپ
            </h3>
            <form
              onSubmit={onAddVirtual}
              className="flex items-center gap-2"
            >
              <Label htmlFor="invite-virtual-name-fund" className="sr-only">
                نام عضو دستی
              </Label>
              <Input
                id="invite-virtual-name-fund"
                name="manualName"
                autoComplete="off"
                spellCheck={false}
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="نام عضو…"
                className="h-11 min-w-0 flex-1 rounded-xl border-border/60 bg-card"
                maxLength={40}
                required
                minLength={2}
                disabled={atCapacity || pending}
              />
              {allowViewerRole ? (
                <Select
                  value={manualRole}
                  onValueChange={(v) =>
                    setManualRole(v as "EDITOR" | "VIEWER")
                  }
                  disabled={atCapacity || pending}
                >
                  <SelectTrigger
                    className="h-11 w-[5.75rem] shrink-0 rounded-xl bg-card text-caption"
                    aria-label="نقش عضو جدید"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EDITOR">{editorRoleLabel}</SelectItem>
                    <SelectItem value="VIEWER">ناظر</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              <Button
                type="submit"
                className="h-11 shrink-0 rounded-xl px-3.5 text-body-sm font-semibold active:scale-[0.97]"
                disabled={atCapacity || pending}
                aria-busy={pending}
              >
                {pending ? "…" : "افزودن"}
              </Button>
            </form>
            {manualError ? (
              <p
                className="mt-2 text-xs text-destructive"
                role="alert"
                aria-live="assertive"
              >
                {manualError}
              </p>
            ) : null}
            {atCapacity ? (
              <p className="px-0.5 text-caption text-muted-foreground">
                ظرفیت اعضا تکمیل است.
              </p>
            ) : null}
          </section>
        ) : null}
        {manageDialogs}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isOwner ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-pretty text-body-sm font-semibold text-foreground">
                دعوت
              </h3>
              <p className="text-caption text-muted-foreground" aria-live="polite">
                {spaceLinkState === "done"
                  ? "لینک کپی شد"
                  : `دعوت به «${spaceName}»`}
              </p>
            </div>
            {maxMembers != null ? (
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-caption font-semibold tabular-nums text-muted-foreground">
                {members.length} / {maxMembers}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {inviteRolePicker ? (
              <Select
                value={inviteRole}
                onValueChange={(v) =>
                  setInviteRole(v as "EDITOR" | "VIEWER")
                }
              >
                <SelectTrigger
                  className="h-10 w-[7.25rem] rounded-xl"
                  aria-label="نقش لینک دعوت"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EDITOR">عضو فعال</SelectItem>
                  <SelectItem value="VIEWER">ناظر</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copySpaceLink}
              className={cn(
                "h-10 flex-1 gap-1.5 rounded-xl px-3 active:scale-[0.98] sm:flex-none",
                spaceLinkState === "done" &&
                  "border-success/40 bg-success-soft text-success",
              )}
              aria-label={
                spaceLinkState === "done" ? "لینک فضا کپی شد" : "کپی لینک فضا"
              }
            >
              {spaceLinkState === "done" ? (
                <CheckIcon className="size-4" />
              ) : (
                <CopyIcon className="size-4" />
              )}
              {spaceLinkState === "done" ? "کپی شد" : "کپی لینک فضا"}
            </Button>
          </div>

          <form
            onSubmit={onAddVirtual}
            className="rounded-2xl border border-border/55 bg-muted/25 p-3"
          >
            <h4 className="text-pretty text-caption font-medium text-foreground">
              افزودن دستی
            </h4>
            <p className="mt-0.5 text-caption text-muted-foreground">
              بدون اپ — بعداً با لینک ادعا وصل می‌شود
            </p>
            <div className="mt-2.5 flex gap-2">
              <Label htmlFor="invite-virtual-name" className="sr-only">
                نام عضو
              </Label>
              <Input
                id="invite-virtual-name"
                name="manualName"
                autoComplete="off"
                spellCheck={false}
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="مثلاً عضو…"
                className="h-10 min-w-0 flex-1 rounded-xl border-border/70 bg-card"
                maxLength={40}
                required
                minLength={2}
                disabled={atCapacity || pending}
              />
              {allowViewerRole ? (
                <Select
                  value={manualRole}
                  onValueChange={(v) =>
                    setManualRole(v as "EDITOR" | "VIEWER")
                  }
                  disabled={atCapacity || pending}
                >
                  <SelectTrigger
                    className="h-10 w-[6.75rem] shrink-0 rounded-xl"
                    aria-label="نقش عضو جدید"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EDITOR">ویرایشگر</SelectItem>
                    <SelectItem value="VIEWER">ناظر</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="mt-2 h-10 w-full rounded-xl active:scale-[0.98]"
              disabled={atCapacity || pending}
              aria-busy={pending}
            >
              {pending
                ? "در حال افزودن…"
                : atCapacity
                  ? "ظرفیت تکمیل است"
                  : "افزودن"}
            </Button>
            {manualError ? (
              <p
                className="mt-2 text-xs text-destructive"
                role="alert"
                aria-live="assertive"
              >
                {manualError}
              </p>
            ) : null}
          </form>
        </section>
      ) : null}

      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-pretty text-body-sm font-semibold text-foreground">
            اعضا
            <span className="ms-1.5 text-caption font-normal text-muted-foreground">
              ({members.length})
            </span>
          </h3>
          {isOwner && showShareControls ? (
            <p className="text-caption text-muted-foreground">{shareCaption}</p>
          ) : null}
        </div>

        {roleError ? (
          <p
            className="text-xs text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {roleError}
          </p>
        ) : null}

        <ul className="max-h-[min(52dvh,22rem)] space-y-2 overflow-y-auto overscroll-contain pe-0.5">
          {members.map((m) => {
            const share = m.defaultShare ?? DEFAULT_SHARE;
            const claimDone = claimCopiedId === m.userId;
            return (
              <li
                key={m.userId}
                className="rounded-2xl border border-border/50 bg-card px-3 py-2.5 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <UserAvatar
                    phone={m.phone}
                    name={m.name}
                    avatarUrl={m.avatarUrl}
                    size={36}
                    className="size-9 bg-secondary ring-1 ring-border/40"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium text-foreground">
                      {memberLabel(m)}
                    </p>
                    <p className="truncate text-caption text-muted-foreground">
                      {m.isVirtual
                        ? "مجازی · بدون حساب اپ"
                        : m.phone}
                    </p>
                  </div>

                  {isOwner && m.isVirtual ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "size-9 shrink-0 rounded-xl active:scale-[0.96]",
                        claimDone
                          ? "bg-success-soft text-success"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => copyClaimLink(m.userId)}
                      aria-label={
                        claimDone ? "لینک ادعا کپی شد" : "کپی لینک ادعا"
                      }
                      title={claimDone ? "کپی شد" : "کپی لینک ادعا"}
                    >
                      {claimDone ? (
                        <CheckIcon className="size-4" />
                      ) : (
                        <LinkIcon className="size-4" />
                      )}
                    </Button>
                  ) : null}

                  <MemberActions member={m} />

                  {isOwner && m.role !== "OWNER" && allowViewerRole ? (
                    <Select
                      value={m.role === "VIEWER" ? "VIEWER" : "EDITOR"}
                      onValueChange={(v) =>
                        onChangeRole(m.userId, v as "EDITOR" | "VIEWER")
                      }
                      disabled={pending}
                    >
                      <SelectTrigger
                        className="h-9 w-[6.5rem] shrink-0 rounded-lg text-caption"
                        aria-label={`نقش ${memberLabel(m)}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EDITOR">ویرایشگر</SelectItem>
                        <SelectItem value="VIEWER">ناظر</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span
                      className={cn(
                        "shrink-0 rounded-lg px-2 py-1 text-caption font-semibold",
                        m.role === "OWNER"
                          ? "bg-primary/10 text-primary"
                          : m.role === "VIEWER"
                            ? "bg-muted text-muted-foreground"
                            : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      {editorOnlyRoles && m.role === "EDITOR"
                        ? "مدیر"
                        : roleLabelFa(m.role)}
                    </span>
                  )}
                </div>

                {isOwner && showShareControls ? (
                  <div className="mt-2 flex items-center justify-end gap-1 border-t border-border/35 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-lg active:scale-[0.96]"
                      disabled={pending || share <= MIN_SHARE}
                      onClick={() =>
                        onChangeShare(
                          m.userId,
                          clampShare(share - SHARE_STEP),
                        )
                      }
                      aria-label="کاهش ضریب"
                    >
                      −
                    </Button>
                    <span className="min-w-12 text-center text-body-sm font-semibold tabular-nums text-foreground">
                      ×{formatShareLabel(share)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-lg active:scale-[0.96]"
                      disabled={pending || share >= MAX_SHARE}
                      onClick={() =>
                        onChangeShare(
                          m.userId,
                          clampShare(share + SHARE_STEP),
                        )
                      }
                      aria-label="افزایش ضریب"
                    >
                      +
                    </Button>
                  </div>
                ) : showShareControls && share > DEFAULT_SHARE ? (
                  <p className="mt-1.5 text-end text-caption text-muted-foreground">
                    ×{formatShareLabel(share)}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
      {manageDialogs}
    </div>
  );
}
