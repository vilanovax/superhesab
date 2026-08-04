"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changeMemberRole,
  updateMemberDefaultShare,
} from "@/app/actions/members";
import { addVirtualMember } from "@/app/actions/virtualMember";
import { Button } from "@/components/ui/button";
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
import { memberLabel } from "@/lib/format";
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
   * FUND: compact sheet — primary invite CTA, dense member rows + share, manual add footer.
   */
  fundLayout?: boolean;
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

  const spaceInviteUrl = useMemo(() => {
    const path =
      inviteRolePicker && !editorOnlyRoles
        ? `/invite/${spaceId}?role=${inviteRole}`
        : `/invite/${spaceId}`;
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  }, [spaceId, inviteRole, inviteRolePicker, editorOnlyRoles]);

  function claimUrl(virtualUserId: string) {
    if (typeof window === "undefined") {
      return `/invite/${spaceId}?claim=${virtualUserId}`;
    }
    return `${window.location.origin}/invite/${spaceId}?claim=${virtualUserId}`;
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  async function copySpaceLink() {
    try {
      await copyText(spaceInviteUrl);
      setSpaceLinkState("done");
      window.setTimeout(() => setSpaceLinkState("idle"), 2000);
    } catch {
      setSpaceLinkState("idle");
    }
  }

  async function copyClaimLink(virtualUserId: string) {
    try {
      await copyText(claimUrl(virtualUserId));
      setClaimCopiedId(virtualUserId);
      window.setTimeout(() => setClaimCopiedId(null), 2000);
    } catch {
      setClaimCopiedId(null);
    }
  }

  function onAddVirtual(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) return;
    setManualError(null);
    startTransition(async () => {
      const result = await addVirtualMember(
        spaceId,
        manualName,
        editorOnlyRoles ? "EDITOR" : manualRole,
      );
      if (!result.ok) {
        setManualError(result.error);
        return;
      }
      setManualName("");
      router.refresh();
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
    return (
      <div className="space-y-4">
        {isOwner ? (
          <div className="space-y-2">
            {inviteRolePicker ? (
              <div className="flex items-center justify-between gap-2 px-0.5">
                <Label
                  htmlFor="invite-role-fund"
                  className="text-caption text-muted-foreground"
                >
                  نقش لینک دعوت
                </Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v) =>
                    setInviteRole(v as "EDITOR" | "VIEWER")
                  }
                >
                  <SelectTrigger
                    id="invite-role-fund"
                    className="h-8 w-[7.5rem] rounded-lg text-caption"
                    aria-label="نقش لینک دعوت"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EDITOR">عضو فعال</SelectItem>
                    <SelectItem value="VIEWER">ناظر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
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
                  ? "لینک دعوت عضو کپی شد"
                  : "کپی لینک دعوت عضو"
              }
            >
              {spaceLinkState === "done" ? (
                <CheckIcon className="size-4" />
              ) : (
                <CopyIcon className="size-4" />
              )}
              {spaceLinkState === "done" ? "لینک کپی شد" : "کپی لینک دعوت عضو"}
            </Button>
            <span className="sr-only" aria-live="polite">
              {spaceLinkState === "done" ? "لینک دعوت عضو کپی شد" : ""}
            </span>
            {maxMembers != null ? (
              <p className="text-center text-caption tabular-nums text-muted-foreground">
                {members.length} / {maxMembers} عضو
              </p>
            ) : null}
          </div>
        ) : null}

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
            <h3 className="text-pretty text-caption font-semibold text-muted-foreground">
              اعضا
            </h3>
            <p className="text-caption text-muted-foreground">
              {shareCaption}
              <span className="ms-1.5 tabular-nums">· {members.length}</span>
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

          <ul className="max-h-[min(48dvh,20rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border/50 bg-card">
            {members.map((m, i) => {
              const share = m.defaultShare ?? DEFAULT_SHARE;
              const claimDone = claimCopiedId === m.userId;
              return (
                <li
                  key={m.userId}
                  className={cn(
                    "px-3 py-2.5",
                    i > 0 && "border-t border-border/40",
                  )}
                >
                  <div className="flex items-center gap-2.5">
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
                    {isOwner && m.role !== "OWNER" ? (
                      <Select
                        value={m.role === "VIEWER" ? "VIEWER" : "EDITOR"}
                        onValueChange={(v) =>
                          onChangeRole(m.userId, v as "EDITOR" | "VIEWER")
                        }
                        disabled={pending}
                      >
                        <SelectTrigger className="h-8 w-[5.75rem] shrink-0 rounded-lg text-caption">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EDITOR">فعال</SelectItem>
                          <SelectItem value="VIEWER">ناظر</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-bold",
                          m.role === "OWNER"
                            ? "bg-primary/12 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {m.role === "OWNER" ? "مالک" : roleLabelFa(m.role)}
                      </span>
                    )}
                  </div>

                  {isOwner && showShareControls ? (
                    <div className="mt-2 flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-7 rounded-md active:scale-[0.96]"
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
                      <span className="min-w-10 text-center text-caption font-semibold tabular-nums text-foreground">
                        ×{formatShareLabel(share)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-7 rounded-md active:scale-[0.96]"
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
                    <p className="mt-1.5 text-end text-caption tabular-nums text-muted-foreground">
                      ×{formatShareLabel(share)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        {isOwner ? (
          <section className="border-t border-border/40 pt-3.5">
            <p className="text-caption font-semibold text-muted-foreground">
              افزودن بدون اپ
            </p>
            <p className="mt-0.5 text-caption leading-relaxed text-muted-foreground/90">
              نام را بزنید؛ بعداً با لینک ادعا وصل می‌شود.
            </p>
            <form
              onSubmit={onAddVirtual}
              className="mt-2.5 flex items-center gap-2"
            >
              <Input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="نام عضو"
                className="h-10 flex-1 rounded-xl border-border/60 bg-card"
                maxLength={40}
                required
                minLength={2}
                disabled={atCapacity || pending}
              />
              <Select
                value={manualRole}
                onValueChange={(v) =>
                  setManualRole(v as "EDITOR" | "VIEWER")
                }
                disabled={atCapacity || pending}
              >
                <SelectTrigger className="h-10 w-[5.5rem] shrink-0 rounded-xl text-caption">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EDITOR">فعال</SelectItem>
                  <SelectItem value="VIEWER">ناظر</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                className="h-10 shrink-0 rounded-xl px-3 active:scale-[0.97]"
                disabled={atCapacity || pending}
              >
                {pending ? "…" : "افزودن"}
              </Button>
            </form>
            {manualError ? (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {manualError}
              </p>
            ) : null}
            {atCapacity ? (
              <p className="mt-2 text-xs text-muted-foreground">
                ظرفیت اعضا تکمیل است.
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isOwner ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-body-sm font-semibold text-foreground">
                دعوت
              </p>
              <p className="text-caption text-muted-foreground">
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
                <SelectTrigger className="h-10 w-[7.25rem] rounded-xl">
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
            <p className="text-caption font-medium text-foreground">
              افزودن دستی
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              بدون اپ — بعداً با لینک ادعا وصل می‌شود
            </p>
            <div className="mt-2.5 flex gap-2">
              <Input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="نام عضو"
                className="h-10 rounded-xl border-border/70 bg-card"
                maxLength={40}
                required
                minLength={2}
                disabled={atCapacity || pending}
              />
              <Select
                value={manualRole}
                onValueChange={(v) =>
                  setManualRole(v as "EDITOR" | "VIEWER")
                }
                disabled={atCapacity || pending}
              >
                <SelectTrigger className="h-10 w-[6.75rem] shrink-0 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EDITOR">ویرایشگر</SelectItem>
                  <SelectItem value="VIEWER">ناظر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="mt-2 h-10 w-full rounded-xl active:scale-[0.98]"
              disabled={atCapacity || pending}
            >
              {pending ? "…" : atCapacity ? "ظرفیت تکمیل است" : "افزودن"}
            </Button>
            {manualError ? (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {manualError}
              </p>
            ) : null}
          </form>
        </section>
      ) : null}

      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-body-sm font-semibold text-foreground">
            اعضا
            <span className="ms-1.5 text-caption font-normal text-muted-foreground">
              ({members.length})
            </span>
          </p>
          {isOwner && showShareControls ? (
            <p className="text-caption text-muted-foreground">{shareCaption}</p>
          ) : null}
        </div>

        {roleError ? (
          <p className="text-xs text-destructive" role="alert">
            {roleError}
          </p>
        ) : null}

        <ul className="max-h-[min(52dvh,22rem)] space-y-2 overflow-y-auto pe-0.5">
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

                  {isOwner && m.role !== "OWNER" && !editorOnlyRoles ? (
                    <Select
                      value={m.role === "VIEWER" ? "VIEWER" : "EDITOR"}
                      onValueChange={(v) =>
                        onChangeRole(m.userId, v as "EDITOR" | "VIEWER")
                      }
                      disabled={pending}
                    >
                      <SelectTrigger className="h-9 w-[6.5rem] shrink-0 rounded-lg text-caption">
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
    </div>
  );
}
