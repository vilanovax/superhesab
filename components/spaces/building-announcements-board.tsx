"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createBuildingAnnouncement,
  updateBuildingAnnouncement,
  type BuildingAnnouncementDTO,
} from "@/app/actions/building";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateFaShort } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

type BuildingAnnouncementsBoardProps = {
  spaceId: string;
  announcements: BuildingAnnouncementDTO[];
  /** Manager can compose / pin / archive. */
  canMutate: boolean;
};

export function BuildingAnnouncementsBoard({
  spaceId,
  announcements,
  canMutate,
}: BuildingAnnouncementsBoardProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const visible = canMutate
    ? showArchived
      ? announcements
      : announcements.filter((a) => !a.archived)
    : announcements.filter((a) => !a.archived);

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (t.length < 3 || b.length < 5) return;

    setFormOpen(false);
    setTitle("");
    setBody("");
    setPinned(false);
    showToast("اعلان منتشر شد");

    startTransition(async () => {
      const result = await createBuildingAnnouncement({
        spaceId,
        title: t,
        body: b,
        pinned,
      });
      if (!result.ok) {
        showToast(result.error || "خطا در ثبت اطلاعات", "error");
        return;
      }
      router.refresh();
    });
  }

  function togglePin(a: BuildingAnnouncementDTO) {
    showToast(a.pinned ? "از سنجاق برداشته شد" : "سنجاق شد");
    startTransition(async () => {
      const result = await updateBuildingAnnouncement({
        spaceId,
        announcementId: a.id,
        pinned: !a.pinned,
      });
      if (!result.ok) {
        showToast(result.error || "خطا در ثبت اطلاعات", "error");
        return;
      }
      router.refresh();
    });
  }

  function toggleArchive(a: BuildingAnnouncementDTO) {
    showToast(a.archived ? "اعلان بازگردانی شد" : "اعلان بایگانی شد");
    startTransition(async () => {
      const result = await updateBuildingAnnouncement({
        spaceId,
        announcementId: a.id,
        archive: !a.archived,
      });
      if (!result.ok) {
        showToast(result.error || "خطا در ثبت اطلاعات", "error");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {canMutate ? (
        !formOpen ? (
          <div className="flex gap-2">
            <Button
              type="button"
              className="h-11 flex-1 rounded-xl text-body-sm font-semibold"
              onClick={() => setFormOpen(true)}
            >
              اعلان جدید
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 rounded-xl px-3 text-caption"
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? "فعال‌ها" : "بایگانی"}
            </Button>
          </div>
        ) : (
          <form
            onSubmit={onCreate}
            className="space-y-2.5 rounded-2xl border border-border/55 bg-card p-3.5"
          >
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان اعلان"
              maxLength={100}
              className="h-11 rounded-xl"
              autoFocus
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="متن اعلان برای همه ساکنین…"
              maxLength={2000}
              rows={4}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-body-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <label className="flex items-center gap-2 text-caption text-muted-foreground">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="size-4 rounded border-border"
              />
              سنجاق در بالای برد
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 rounded-xl"
                onClick={() => setFormOpen(false)}
                disabled={pending}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                className="h-10 flex-1 rounded-xl"
                disabled={
                  pending || title.trim().length < 3 || body.trim().length < 5
                }
              >
                انتشار
              </Button>
            </div>
          </form>
        )
      ) : null}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-body-sm text-muted-foreground">
          {canMutate
            ? showArchived
              ? "بایگانی خالی است."
              : "هنوز اعلانی منتشر نشده."
            : "اعلانی از مدیر ساختمان نیست."}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-2xl border bg-card px-3.5 py-3",
                a.pinned
                  ? "border-primary/30 ring-1 ring-primary/15"
                  : "border-border/50",
                a.archived && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {a.pinned ? (
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-micro font-semibold text-primary">
                        سنجاق
                      </span>
                    ) : null}
                    {a.archived ? (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-micro font-medium text-muted-foreground">
                        بایگانی
                      </span>
                    ) : null}
                    <p className="text-body-sm font-semibold text-foreground">
                      {a.title}
                    </p>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-caption leading-relaxed text-muted-foreground">
                    {a.body}
                  </p>
                  <p className="mt-2 text-micro text-muted-foreground">
                    {formatDateFaShort(a.createdAt)}
                    {a.authorName ? ` · ${a.authorName}` : ""}
                  </p>
                </div>
              </div>
              {canMutate ? (
                <div className="mt-2.5 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-caption"
                    disabled={pending}
                    onClick={() => togglePin(a)}
                  >
                    {a.pinned ? "برداشتن سنجاق" : "سنجاق"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-caption"
                    disabled={pending}
                    onClick={() => toggleArchive(a)}
                  >
                    {a.archived ? "بازگردانی" : "بایگانی"}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
