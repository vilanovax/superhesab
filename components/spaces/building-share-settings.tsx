"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import {
  createBuildingShareLink,
  revokeBuildingShareLink,
  updateBuildingShareLink,
} from "@/app/actions/building-share";
import {
  DEFAULT_SHARE_SCOPES,
  MAX_ACTIVE_BUILDING_SHARE_LINKS,
  SHARE_SCOPE_META,
  type BuildingShareLinkDTO,
  type BuildingShareScopes,
} from "@/lib/building-share-scopes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

type BuildingShareSettingsProps = {
  spaceId: string;
  initialLinks: BuildingShareLinkDTO[];
  disabled?: boolean;
};

const SAFE_SCOPES = SHARE_SCOPE_META.filter((item) => !item.sensitive);
const SENSITIVE_SCOPES = SHARE_SCOPE_META.filter((item) => item.sensitive);

function sharePath(token: string): string {
  return `/share/b/${token}`;
}

function absoluteShareUrl(token: string): string {
  return `${window.location.origin}${sharePath(token)}`;
}

function selectedLabels(scopes: BuildingShareScopes): string {
  return SHARE_SCOPE_META.filter((item) => scopes[item.key])
    .map((item) => item.label)
    .join(" · ");
}

function ScopeList({
  items,
  scopes,
  onChange,
  disabled,
  idPrefix,
}: {
  items: typeof SHARE_SCOPE_META;
  scopes: BuildingShareScopes;
  onChange: (next: BuildingShareScopes) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  return (
    <ul className="divide-y divide-border/40">
      {items.map((item) => {
        const id = `${idPrefix}-${item.key}`;
        const checked = scopes[item.key];
        return (
          <li key={item.key}>
            <label
              htmlFor={id}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-2.5 py-2.5",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <Checkbox
                id={id}
                checked={checked}
                disabled={disabled}
                onCheckedChange={(value) =>
                  onChange({ ...scopes, [item.key]: value === true })
                }
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-caption font-semibold text-foreground">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                  {item.hint}
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function ScopeEditor({
  scopes,
  onChange,
  disabled,
  idPrefix,
}: {
  scopes: BuildingShareScopes;
  onChange: (next: BuildingShareScopes) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  return (
    <div className="space-y-3">
      <ScopeList
        items={SAFE_SCOPES}
        scopes={scopes}
        onChange={onChange}
        disabled={disabled}
        idPrefix={idPrefix}
      />
      <div className="rounded-xl bg-muted/40 px-3 ring-1 ring-border/50">
        <p className="pt-2.5 text-[11px] font-semibold text-muted-foreground">
          جزئیات حساس — فقط اگر لازم است
        </p>
        <ScopeList
          items={SENSITIVE_SCOPES}
          scopes={scopes}
          onChange={onChange}
          disabled={disabled}
          idPrefix={`${idPrefix}-s`}
        />
      </div>
    </div>
  );
}

function LinkCard({
  spaceId,
  link,
  disabled,
}: {
  spaceId: string;
  link: BuildingShareLinkDTO;
  disabled?: boolean;
}) {
  const showToast = useUiStore((s) => s.showToast);
  const router = useRouter();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [scopes, setScopes] = useState(link.scopes);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const path = sharePath(link.token);

  function copy() {
    const url = absoluteShareUrl(link.token);
    void navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        showToast("لینک کپی شد", "success");
        window.setTimeout(() => setCopied(false), 1800);
      },
      () => showToast("کپی لینک ناموفق بود", "error"),
    );
  }

  async function nativeShare() {
    if (typeof navigator.share !== "function") {
      copy();
      return;
    }
    try {
      await navigator.share({
        title: link.title?.trim() || "گزارش ساختمان",
        url: absoluteShareUrl(link.token),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      copy();
    }
  }

  function persist(next: BuildingShareScopes) {
    setScopes(next);
    startTransition(async () => {
      const result = await updateBuildingShareLink({
        spaceId,
        linkId: link.id,
        scopes: next,
      });
      if (!result.ok) {
        setScopes(link.scopes);
        showToast(result.error, "error");
        return;
      }
      router.refresh();
    });
  }

  function revoke() {
    if (!window.confirm("این لینک برای همه باطل شود؟")) return;
    startTransition(async () => {
      const result = await revokeBuildingShareLink({
        spaceId,
        linkId: link.id,
      });
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast("لینک باطل شد", "success");
      router.refresh();
    });
  }

  const summary = selectedLabels(scopes) || "هیچ بخشی انتخاب نشده";

  return (
    <article className="rounded-2xl bg-muted/25 p-3.5 ring-1 ring-border/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-body-sm font-bold text-foreground">
            {link.title?.trim() || "گزارش همسایه‌ها"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {link.followCount > 0
              ? `${link.followCount.toLocaleString("fa-IR")} نفر روی خانه پین کرده‌اند`
              : "فقط با لینک دیده می‌شود"}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/8"
          disabled={disabled || pending}
          onClick={revoke}
        >
          ابطال
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-card px-3 py-2 ring-1 ring-border/45">
        <p
          dir="ltr"
          className="min-w-0 flex-1 truncate text-start font-mono text-[11px] text-muted-foreground"
        >
          {path}
        </p>
        <button
          type="button"
          className="shrink-0 text-caption font-bold text-primary"
          onClick={copy}
        >
          {copied ? "کپی شد" : "کپی"}
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <Button
          type="button"
          className="h-11 rounded-xl font-semibold active:scale-[0.98]"
          onClick={() => void nativeShare()}
        >
          اشتراک
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl font-semibold active:scale-[0.98]"
          onClick={copy}
        >
          کپی لینک
        </Button>
      </div>

      <button
        type="button"
        className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl px-0.5 py-1 text-start"
        onClick={() => setEditing((v) => !v)}
        aria-expanded={editing}
      >
        <span className="min-w-0 truncate text-[11px] leading-relaxed text-muted-foreground">
          {summary}
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-primary">
          {editing ? "بستن" : "ویرایش محدوده"}
        </span>
      </button>

      {editing ? (
        <div className="mt-1 border-t border-border/40 pt-1">
          <ScopeEditor
            idPrefix={uid}
            scopes={scopes}
            onChange={persist}
            disabled={disabled || pending}
          />
        </div>
      ) : null}
    </article>
  );
}

function CreateForm({
  spaceId,
  disabled,
  onCreated,
}: {
  spaceId: string;
  disabled?: boolean;
  onCreated: () => void;
}) {
  const showToast = useUiStore((s) => s.showToast);
  const router = useRouter();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [scopes, setScopes] = useState<BuildingShareScopes>(DEFAULT_SHARE_SCOPES);

  function onCreate() {
    startTransition(async () => {
      const result = await createBuildingShareLink({
        spaceId,
        title: title.trim() || null,
        scopes,
      });
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setTitle("");
      setScopes(DEFAULT_SHARE_SCOPES);
      onCreated();
      router.refresh();
      if (result.link) {
        try {
          await navigator.clipboard.writeText(absoluteShareUrl(result.link.token));
          showToast("لینک ساخته و کپی شد", "success");
        } catch {
          showToast("لینک ساخته شد", "success");
        }
      }
    });
  }

  return (
    <div className="space-y-3">
      <Input
        value={title}
        disabled={disabled || pending}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="عنوان اختیاری — مثلاً گزارش همسایه‌ها"
        className="h-11 rounded-xl"
        maxLength={60}
        aria-label="عنوان لینک"
      />
      <ScopeEditor
        idPrefix={uid}
        scopes={scopes}
        onChange={setScopes}
        disabled={disabled || pending}
      />
      <Button
        type="button"
        className="h-11 w-full rounded-xl font-semibold active:scale-[0.98]"
        disabled={disabled || pending}
        onClick={onCreate}
      >
        ساخت و کپی لینک
      </Button>
    </div>
  );
}

export function BuildingShareSettings({
  spaceId,
  initialLinks,
  disabled = false,
}: BuildingShareSettingsProps) {
  const [adding, setAdding] = useState(initialLinks.length === 0);
  const atCap = initialLinks.length >= MAX_ACTIVE_BUILDING_SHARE_LINKS;
  const hasLinks = initialLinks.length > 0;

  return (
    <section
      id="building-share"
      className="animate-fade-up space-y-3 rounded-2xl border border-border/55 bg-card p-4 shadow-sm sm:p-5"
    >
      <div>
        <h2 className="text-caption font-bold text-foreground">
          گزارش عمومی همسایه‌ها
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          لینک فقط‌مشاهده؛ بدون عضویت. تجمیع پیش‌فرض است.
        </p>
      </div>

      {hasLinks ? (
        <div className="space-y-2.5">
          {initialLinks.map((link) => (
            <LinkCard
              key={link.id}
              spaceId={spaceId}
              link={link}
              disabled={disabled}
            />
          ))}
        </div>
      ) : null}

      {hasLinks && !atCap ? (
        <button
          type="button"
          className="w-full rounded-xl py-2 text-caption font-semibold text-primary"
          disabled={disabled}
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? "انصراف" : "لینک با محدوده متفاوت"}
        </button>
      ) : null}

      {adding && !atCap ? (
        <CreateForm
          spaceId={spaceId}
          disabled={disabled}
          onCreated={() => setAdding(false)}
        />
      ) : null}
    </section>
  );
}
