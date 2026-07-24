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

export function MembersList({
  spaceId,
  spaceName,
  members,
  currentUserRole,
  inviteRolePicker = false,
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
    const path = inviteRolePicker
      ? `/invite/${spaceId}?role=${inviteRole}`
      : `/invite/${spaceId}`;
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  }, [spaceId, inviteRole, inviteRolePicker]);

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
      const result = await addVirtualMember(spaceId, manualName, manualRole);
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

  return (
    <div className="space-y-4">
      {isOwner ? (
        <>
          <div className="flex flex-col gap-2.5 rounded-2xl border border-border/60 bg-card/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                لینک عمومی فضا
              </p>
              <p className="text-caption text-muted-foreground">
                {spaceLinkState === "done"
                  ? "کپی شد"
                  : `دعوت عمومی به «${spaceName}»`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {inviteRolePicker ? (
                <Select
                  value={inviteRole}
                  onValueChange={(v) =>
                    setInviteRole(v as "EDITOR" | "VIEWER")
                  }
                >
                  <SelectTrigger className="h-10 w-[7.5rem] rounded-xl">
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
                  "h-10 shrink-0 gap-1.5 rounded-xl px-3",
                  spaceLinkState === "done" &&
                    "border-success/40 bg-success-soft text-success",
                )}
              >
                {spaceLinkState === "done" ? (
                  <CheckIcon className="size-4" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
                کپی لینک فضا
              </Button>
            </div>
          </div>

          <div className="space-y-2.5 rounded-2xl border border-border/60 bg-card/70 p-3.5">
            <div>
              <p className="text-sm font-medium text-foreground">افزودن دستی</p>
              <p className="mt-0.5 text-caption text-muted-foreground">
                بدون نصب اپ — بعداً با لینک ادعا وصل می‌شود
              </p>
            </div>
            <form onSubmit={onAddVirtual} className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="مثلاً علی"
                  className="h-11 rounded-xl border-border/70 bg-card"
                  maxLength={40}
                  required
                  minLength={2}
                />
                <Select
                  value={manualRole}
                  onValueChange={(v) =>
                    setManualRole(v as "EDITOR" | "VIEWER")
                  }
                >
                  <SelectTrigger className="h-11 w-[7.5rem] shrink-0 rounded-xl">
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
                className="h-11 w-full rounded-xl"
                disabled={pending}
              >
                {pending ? "…" : "افزودن عضو دستی"}
              </Button>
            </form>
            {manualError ? (
              <p className="text-xs text-destructive" role="alert">
                {manualError}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          اعضا ({members.length})
        </p>
        {roleError ? (
          <p className="text-xs text-destructive" role="alert">
            {roleError}
          </p>
        ) : null}
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {members.map((m) => (
            <li
              key={m.userId}
              className="space-y-2 rounded-xl border border-border/60 bg-card/80 px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
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
                    {m.isVirtual ? (
                      <span className="ms-1.5 text-micro font-normal text-muted-foreground">
                        (مجازی)
                      </span>
                    ) : null}
                  </p>
                  {!m.isVirtual ? (
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {m.phone}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">بدون حساب اپ</p>
                  )}
                </div>
                {isOwner && m.role !== "OWNER" ? (
                  <Select
                    value={m.role === "VIEWER" ? "VIEWER" : "EDITOR"}
                    onValueChange={(v) =>
                      onChangeRole(m.userId, v as "EDITOR" | "VIEWER")
                    }
                    disabled={pending}
                  >
                    <SelectTrigger className="h-9 w-[6.75rem] shrink-0 rounded-lg text-caption">
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
                      "rounded-lg px-2 py-1 text-caption font-semibold",
                      m.role === "OWNER"
                        ? "bg-primary/10 text-primary"
                        : m.role === "VIEWER"
                          ? "bg-muted text-muted-foreground"
                          : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {m.isVirtual && m.role !== "OWNER"
                      ? `دستی · ${roleLabelFa(m.role)}`
                      : roleLabelFa(m.role)}
                  </span>
                )}
              </div>

              {isOwner ? (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-2.5 py-2">
                  <p className="text-caption text-muted-foreground">
                    ضریب پیش‌فرض تسهیم مساوی
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-lg"
                      disabled={
                        pending ||
                        (m.defaultShare ?? DEFAULT_SHARE) <= MIN_SHARE
                      }
                      onClick={() =>
                        onChangeShare(
                          m.userId,
                          clampShare(
                            (m.defaultShare ?? DEFAULT_SHARE) - SHARE_STEP,
                          ),
                        )
                      }
                      aria-label="کاهش ضریب نیم‌نفر"
                    >
                      −
                    </Button>
                    <span className="min-w-10 text-center text-body-sm font-semibold tabular-nums">
                      ×{formatShareLabel(m.defaultShare ?? DEFAULT_SHARE)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-lg"
                      disabled={
                        pending ||
                        (m.defaultShare ?? DEFAULT_SHARE) >= MAX_SHARE
                      }
                      onClick={() =>
                        onChangeShare(
                          m.userId,
                          clampShare(
                            (m.defaultShare ?? DEFAULT_SHARE) + SHARE_STEP,
                          ),
                        )
                      }
                      aria-label="افزایش ضریب نیم‌نفر"
                    >
                      +
                    </Button>
                  </div>
                </div>
              ) : (m.defaultShare ?? DEFAULT_SHARE) > DEFAULT_SHARE ? (
                <p className="text-caption text-muted-foreground">
                  ضریب تسهیم: ×
                  {formatShareLabel(m.defaultShare ?? DEFAULT_SHARE)}
                </p>
              ) : null}

              {isOwner && m.isVirtual ? (
                <Button
                  type="button"
                  className="h-10 w-full rounded-xl text-body-sm"
                  onClick={() => copyClaimLink(m.userId)}
                >
                  {claimCopiedId === m.userId ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckIcon className="size-4" />
                      لینک ادعا کپی شد
                    </span>
                  ) : (
                    "کپی لینک ادعا"
                  )}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
