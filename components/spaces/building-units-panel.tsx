"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type TouchEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  createUnit,
  regenerateUnitInviteToken,
  unlinkUnitResident,
  updateUnit,
  type BuildingUnitRow,
} from "@/app/actions/building";
import type { DebtDTO } from "@/app/actions/debt";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { unitMonthlyCharge } from "@/lib/building";
import { type SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

type ConfirmUnitAction =
  | { kind: "unlink"; unit: BuildingUnitRow }
  | { kind: "regenerate"; unit: BuildingUnitRow };

type BuildingUnitsPanelProps = {
  spaceId: string;
  currency: SpaceCurrency;
  units: BuildingUnitRow[];
  baseCharge: number;
  /** Owner can mutate units; editors see read-only. */
  canManage: boolean;
  /** Active طلب/بدهی linked to units (optional). */
  debts?: DebtDTO[];
  /** Open debts tab filtered to this unit. */
  onOpenUnitDebts?: (unitId: string) => void;
};

const MULT_PRESETS = [
  { value: 1000, label: "کامل" },
  { value: 750, label: "¾" },
  { value: 500, label: "نصف" },
  { value: 250, label: "¼" },
] as const;

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12.5 6.5 4 15v3.5H7.5L16 10.5M12.5 6.5l2.1-2.1a1.5 1.5 0 0 1 2.1 0l1.9 1.9a1.5 1.5 0 0 1 0 2.1L16 10.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M10 13a5 5 0 0 0 7.54.54l1.91-1.91a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.54-.54L4.55 12.4a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="9"
        y="9"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M5 15V6a2 2 0 0 1 2-2h9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M21 12a9 9 0 1 1-2.64-6.36"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M21 4v5h-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UnlinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M9.5 14.5 7 17a3.5 3.5 0 0 1-5-5l3-3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M14.5 9.5 17 7a3.5 3.5 0 0 1 5 5l-3 3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="m4 4 16 16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SheetAction({
  icon,
  label,
  hint,
  onClick,
  disabled,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-3.5 py-3 text-start transition-colors disabled:opacity-45",
        "active:bg-muted/70",
        tone === "danger"
          ? "text-destructive hover:bg-destructive-soft/60"
          : "text-foreground hover:bg-muted/50",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          tone === "danger"
            ? "bg-destructive-soft text-destructive"
            : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-semibold leading-tight">
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-micro text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function faDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

const SWIPE_ACTION_W = 76;
const SWIPE_OPEN_THRESHOLD = 40;
const SWIPE_EDIT_THRESHOLD = 64;

/**
 * Mobile swipe-to-edit: finger left reveals trailing «ویرایش»;
 * past edit threshold on release → opens edit. Desktop keeps tap.
 */
function SwipeToEditRow({
  enabled,
  open,
  onOpenChange,
  onEdit,
  moreSlot,
  children,
}: {
  enabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  moreSlot?: ReactNode;
  children: ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const locked = useRef<"h" | "v" | null>(null);
  const offsetRef = useRef(0);
  const suppressClick = useRef(false);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    if (!dragging) setOffset(open ? -SWIPE_ACTION_W : 0);
  }, [open, dragging]);

  const finish = useCallback(
    (dx: number) => {
      setDragging(false);
      locked.current = null;
      const next = startOffset.current + dx;
      if (next <= -SWIPE_EDIT_THRESHOLD) {
        suppressClick.current = true;
        setOffset(0);
        onOpenChange(false);
        onEdit();
        return;
      }
      if (next <= -SWIPE_OPEN_THRESHOLD) {
        setOffset(-SWIPE_ACTION_W);
        onOpenChange(true);
        return;
      }
      setOffset(0);
      onOpenChange(false);
    },
    [onEdit, onOpenChange],
  );

  function onTouchStart(e: TouchEvent) {
    if (!enabled) return;
    const t = e.touches[0];
    if (!t) return;
    startX.current = t.clientX;
    startY.current = t.clientY;
    startOffset.current = offsetRef.current;
    locked.current = null;
    setDragging(true);
  }

  function onTouchMove(e: TouchEvent) {
    if (!enabled || !dragging) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    if (!locked.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      locked.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (locked.current === "v") {
        setDragging(false);
        return;
      }
    }
    if (locked.current !== "h") return;
    // Keep horizontal swipe from scrolling the page.
    if (e.cancelable) e.preventDefault();
    const next = Math.min(
      0,
      Math.max(-SWIPE_ACTION_W - 12, startOffset.current + dx),
    );
    setOffset(next);
  }

  function onTouchEnd(e: TouchEvent) {
    if (!enabled || !dragging) return;
    if (locked.current === "v") {
      setDragging(false);
      locked.current = null;
      return;
    }
    const t = e.changedTouches[0];
    const dx = t ? t.clientX - startX.current : 0;
    finish(dx);
  }

  function onTouchCancel() {
    setDragging(false);
    locked.current = null;
    setOffset(open ? -SWIPE_ACTION_W : 0);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {enabled ? (
        <div
          className="absolute inset-y-0 end-0 flex w-[76px] items-stretch"
          aria-hidden={!open && offset === 0}
        >
          <button
            type="button"
            tabIndex={open || offset < -8 ? 0 : -1}
            onClick={() => {
              setOffset(0);
              onOpenChange(false);
              onEdit();
            }}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-primary text-primary-foreground transition-colors active:bg-primary/90"
          >
            <PencilIcon className="size-4" />
            <span className="text-micro font-semibold">ویرایش</span>
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          "relative flex items-center gap-1 bg-card p-2.5 pe-2",
          !dragging && "transition-transform duration-200 ease-out",
          "motion-reduce:transition-none",
        )}
        style={{
          transform: enabled ? `translate3d(${offset}px,0,0)` : undefined,
          touchAction: enabled ? "pan-y" : undefined,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        <div
          className="flex min-w-0 flex-1"
          onClickCapture={(e) => {
            if (suppressClick.current) {
              e.preventDefault();
              e.stopPropagation();
              suppressClick.current = false;
              return;
            }
            if (offset < -8 || open) {
              e.preventDefault();
              e.stopPropagation();
              setOffset(0);
              onOpenChange(false);
            }
          }}
        >
          {children}
        </div>
        {moreSlot}
      </div>
    </div>
  );
}

function UnitFormFields({
  nameId,
  areaId,
  phoneId,
  multId,
  name,
  area,
  phone,
  mult,
  onName,
  onArea,
  onPhone,
  onMult,
  baseCharge,
  currency,
  chargePreview,
}: {
  nameId: string;
  areaId: string;
  phoneId: string;
  multId: string;
  name: string;
  area: string;
  phone: string;
  mult: string;
  onName: (v: string) => void;
  onArea: (v: string) => void;
  onPhone: (v: string) => void;
  onMult: (v: string) => void;
  baseCharge: number;
  currency: SpaceCurrency;
  chargePreview: (multiplier: number) => number;
}) {
  const multNum = Math.trunc(Number(mult)) || 1000;
  const preview = chargePreview(multNum);

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-2xl border border-border/55 bg-card p-3.5 shadow-sm">
        <div className="space-y-1.5">
          <label htmlFor={nameId} className="text-label text-muted-foreground">
            نام / شماره واحد
          </label>
          <Input
            id={nameId}
            name="unitName"
            autoComplete="off"
            spellCheck={false}
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="مثلاً ۱ یا شرقی…"
            className="h-11 rounded-xl border-border/70 bg-sheet-muted"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={phoneId} className="text-label text-muted-foreground">
            تلفن / موبایل
            <span className="ms-1 font-normal text-muted-foreground/70">
              (اختیاری)
            </span>
          </label>
          <div className="flex h-11 items-center gap-2 rounded-xl border border-border/70 bg-sheet-muted px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-primary/35">
            <svg
              viewBox="0 0 24 24"
              className="size-4 shrink-0 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.74-1.27a2 2 0 0 1 2.11-.45c.74.34 1.53.57 2.34.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <input
              id={phoneId}
              name="unitPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => onPhone(e.target.value)}
              placeholder="09… یا 021…"
              maxLength={40}
              className="min-w-0 flex-1 bg-transparent text-start font-mono text-body-sm tabular-nums tracking-wide outline-none placeholder:font-sans placeholder:tracking-normal"
            />
          </div>
          <p className="text-micro text-muted-foreground">
            برای تماس سریع مدیر — جدا از حساب ساکن در اپ
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <label htmlFor={areaId} className="text-label text-muted-foreground">
              متراژ (م²)
            </label>
            <Input
              id={areaId}
              name="area"
              autoComplete="off"
              type="text"
              inputMode="numeric"
              value={area}
              onChange={(e) => onArea(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="اختیاری"
              className="h-11 rounded-xl border-border/70 bg-sheet-muted tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={multId} className="text-label text-muted-foreground">
              ضریب
            </label>
            <Input
              id={multId}
              name="multiplier"
              autoComplete="off"
              type="text"
              inputMode="numeric"
              value={mult}
              onChange={(e) => onMult(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="۱۰۰۰"
              className="h-11 rounded-xl border-border/70 bg-sheet-muted tabular-nums"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-border/55 bg-card p-3.5 shadow-sm">
        <p className="text-caption font-semibold text-foreground">ضریب شارژ</p>
        <div
          role="group"
          aria-label="پیش‌فرض ضریب"
          className="flex flex-wrap gap-1.5"
        >
          {MULT_PRESETS.map((p) => {
            const on = multNum === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onMult(String(p.value))}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-2.5 text-caption font-semibold transition-colors active:scale-[0.97]",
                  on
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/80 text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
                <span className="ms-1 tabular-nums opacity-70">
                  {faDigits(p.value)}
                </span>
              </button>
            );
          })}
        </div>

        {baseCharge > 0 ? (
          <div className="rounded-xl bg-primary/8 px-3 py-2.5 ring-1 ring-primary/15">
            <p className="text-micro font-medium text-muted-foreground">
              شارژ ماهانه این واحد
            </p>
            <p className="mt-0.5 text-body font-bold tabular-nums text-foreground">
              {formatCurrency(preview, currency)}
            </p>
            <p className="mt-0.5 text-micro text-muted-foreground">
              پایه {formatCurrency(baseCharge, currency)} ×{" "}
              {faDigits(multNum)}⁄۱۰۰۰
            </p>
          </div>
        ) : (
          <p className="text-micro text-muted-foreground">
            ۱۰۰۰ = شارژ کامل پایه — ابتدا پایه را در تنظیمات تعریف کنید
          </p>
        )}
      </div>
    </div>
  );
}

export function BuildingUnitsPanel({
  spaceId,
  currency,
  units: initialUnits,
  baseCharge,
  canManage,
  debts = [],
  onOpenUnitDebts,
}: BuildingUnitsPanelProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [units, setUnits] = useState(initialUnits);
  const [unitName, setUnitName] = useState("");
  const [unitArea, setUnitArea] = useState("");
  const [unitPhone, setUnitPhone] = useState("");
  const [unitMult, setUnitMult] = useState("1000");
  const [addOpen, setAddOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<BuildingUnitRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editMult, setEditMult] = useState("1000");
  const [editActive, setEditActive] = useState(true);
  /** Action sheet for ⋯ — Drawer avoids overflow clipping on cards. */
  const [menuUnit, setMenuUnit] = useState<BuildingUnitRow | null>(null);
  /** Which unit row is swipe-open (one at a time). */
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] =
    useState<ConfirmUnitAction | null>(null);

  useEffect(() => {
    setUnits(initialUnits);
  }, [initialUnits]);

  useEffect(() => {
    if (!addOpen) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = document.getElementById("unit-add-name");
    if (el instanceof HTMLInputElement) el.focus();
  }, [addOpen]);

  const activeCount = useMemo(
    () => units.filter((u) => u.isActive).length,
    [units],
  );
  const claimedCount = useMemo(
    () => units.filter((u) => Boolean(u.linkedUserId)).length,
    [units],
  );

  /** Active remaining طلب/بدهی keyed by unitId. */
  const debtSummaryByUnit = useMemo(() => {
    const map = new Map<
      string,
      { lent: number; borrowed: number }
    >();
    for (const d of debts) {
      if (!d.unitId || d.status !== "ACTIVE" || d.remaining <= 0) continue;
      const cur = map.get(d.unitId) ?? { lent: 0, borrowed: 0 };
      if (d.type === "LENT") cur.lent += d.remaining;
      else cur.borrowed += d.remaining;
      map.set(d.unitId, cur);
    }
    return map;
  }, [debts]);

  function unitInviteUrl(token: string) {
    if (typeof window === "undefined") return `/invite/unit/${token}`;
    return `${window.location.origin}/invite/unit/${token}`;
  }

  function chargePreview(multiplier: number): number {
    return unitMonthlyCharge(Math.trunc(baseCharge) || 0, multiplier);
  }

  async function copyInvite(unit: BuildingUnitRow) {
    setMenuUnit(null);
    try {
      await navigator.clipboard.writeText(unitInviteUrl(unit.inviteToken));
      showToast(`لینک واحد ${unit.name} کپی شد`);
    } catch {
      showToast("کپی لینک ناموفق بود", "error");
    }
  }

  const unclaimedActive = useMemo(
    () => units.filter((u) => u.isActive && !u.linkedUserId),
    [units],
  );

  async function copyAllInvites() {
    if (unclaimedActive.length === 0) {
      showToast("همه واحدهای فعال ساکن دارند");
      return;
    }
    const text = unclaimedActive
      .map((u) => `واحد ${u.name}\n${unitInviteUrl(u.inviteToken)}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      showToast(
        `${faDigits(unclaimedActive.length)} لینک دعوت کپی شد`,
      );
    } catch {
      showToast("کپی لینک‌ها ناموفق بود", "error");
    }
  }

  function requestUnlink(unit: BuildingUnitRow) {
    if (!unit.linkedUserId) return;
    setMenuUnit(null);
    setConfirmAction({ kind: "unlink", unit });
  }

  function requestRegenerate(unit: BuildingUnitRow) {
    setMenuUnit(null);
    setConfirmAction({ kind: "regenerate", unit });
  }

  function runConfirmedAction() {
    if (!confirmAction) return;
    const { kind, unit } = confirmAction;
    startTransition(async () => {
      if (kind === "unlink") {
        const result = await unlinkUnitResident(spaceId, unit.id);
        if (!result.ok) {
          showToast(result.error, "error");
          return;
        }
        setUnits((prev) =>
          prev.map((u) =>
            u.id === unit.id
              ? {
                  ...u,
                  linkedUserId: null,
                  linkedUserName: null,
                  linkedAt: null,
                }
              : u,
          ),
        );
        setConfirmAction(null);
        showToast(`اتصال واحد ${unit.name} قطع شد`);
        router.refresh();
        return;
      }

      const result = await regenerateUnitInviteToken(spaceId, unit.id);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      if (result.inviteToken) {
        setUnits((prev) =>
          prev.map((u) =>
            u.id === unit.id
              ? { ...u, inviteToken: result.inviteToken! }
              : u,
          ),
        );
        try {
          await navigator.clipboard.writeText(
            unitInviteUrl(result.inviteToken),
          );
          showToast(`لینک جدید واحد ${unit.name} کپی شد`);
        } catch {
          showToast(`لینک جدید واحد ${unit.name} ساخته شد`);
        }
      }
      setConfirmAction(null);
      router.refresh();
    });
  }

  function openEdit(unit: BuildingUnitRow) {
    setMenuUnit(null);
    setSwipedId(null);
    setFormError(null);
    setEditUnit(unit);
    setEditName(unit.name);
    setEditArea(unit.area != null ? String(unit.area) : "");
    setEditPhone(unit.phone ?? "");
    setEditMult(String(unit.multiplier));
    setEditActive(unit.isActive);
  }

  function focusField(id: string) {
    queueMicrotask(() => {
      const el = document.getElementById(id);
      if (el instanceof HTMLInputElement) el.focus();
    });
  }

  function resetAddForm() {
    setUnitName("");
    setUnitArea("");
    setUnitPhone("");
    setUnitMult("1000");
    setFormError(null);
  }

  function onAddUnit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setFormError(null);
    const name = unitName.trim();
    if (!name) {
      setFormError("نام واحد را وارد کنید.");
      focusField("unit-add-name");
      return;
    }
    startTransition(async () => {
      const areaRaw = unitArea.trim();
      const phoneRaw = unitPhone.trim();
      const result = await createUnit({
        spaceId,
        name,
        area: areaRaw ? Math.trunc(Number(areaRaw)) || null : null,
        phone: phoneRaw || null,
        multiplier: Math.trunc(Number(unitMult)) || 1000,
      });
      if (!result.ok) {
        setFormError(result.error);
        showToast(result.error, "error");
        focusField("unit-add-name");
        return;
      }
      resetAddForm();
      setAddOpen(false);
      showToast("واحد اضافه شد");
      router.refresh();
    });
  }

  function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUnit || pending) return;
    setFormError(null);
    const name = editName.trim();
    if (!name) {
      setFormError("نام واحد را وارد کنید.");
      focusField("unit-edit-name");
      return;
    }
    const areaRaw = editArea.trim();
    const phoneRaw = editPhone.trim();
    const next: BuildingUnitRow = {
      ...editUnit,
      name,
      area: areaRaw ? Math.trunc(Number(areaRaw)) || null : null,
      phone: phoneRaw || null,
      multiplier: Math.trunc(Number(editMult)) || 1000,
      isActive: editActive,
    };
    startTransition(async () => {
      const result = await updateUnit({
        spaceId,
        unitId: next.id,
        name: next.name,
        area: next.area,
        phone: next.phone,
        multiplier: next.multiplier,
        isActive: next.isActive,
      });
      if (!result.ok) {
        setFormError(result.error);
        showToast(result.error, "error");
        focusField("unit-edit-name");
        return;
      }
      setUnits((prev) => prev.map((u) => (u.id === next.id ? next : u)));
      setFormError(null);
      setEditUnit(null);
      showToast("واحد به‌روزرسانی شد");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 pb-6">
      <section className="rounded-2xl border border-border/40 bg-card px-3.5 py-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-body-sm font-bold tracking-tight text-foreground">
              واحدها
            </h2>
            <p className="mt-0.5 text-caption text-muted-foreground">
              {units.length === 0
                ? "هنوز واحدی تعریف نشده"
                : `${faDigits(activeCount)} فعال · ${faDigits(claimedCount)} متصل`}
            </p>
          </div>
          {canManage ? (
            <div className="flex shrink-0 items-center gap-1.5">
              {unclaimedActive.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl px-3 text-caption font-semibold"
                  disabled={pending}
                  onClick={() => void copyAllInvites()}
                >
                  <LinkIcon className="size-3.5" />
                  دعوت‌ها
                </Button>
              ) : null}
              <Button
                type="button"
                className="h-10 rounded-xl px-3.5 text-caption font-semibold text-primary-foreground"
                onClick={() => {
                  resetAddForm();
                  setAddOpen(true);
                }}
              >
                <PlusIcon className="size-3.5" />
                واحد جدید
              </Button>
            </div>
          ) : null}
        </div>
        {baseCharge > 0 ? (
          <p className="mt-2 text-micro text-muted-foreground">
            شارژ ماهانه = پایه{" "}
            <span className="font-semibold text-foreground/80">
              {formatCurrency(baseCharge, currency)}
            </span>{" "}
            × ضریب
          </p>
        ) : null}
      </section>

      {units.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/70 px-4 py-10 text-center">
          <p className="text-body-sm font-semibold text-foreground">
            واحدی ثبت نشده
          </p>
          <p className="mt-1 text-caption text-muted-foreground">
            برای وصول شارژ، حداقل یک واحد فعال لازم است.
          </p>
          {canManage ? (
            <Button
              type="button"
              className="mt-4 h-11 rounded-xl text-primary-foreground"
              onClick={() => {
                resetAddForm();
                setAddOpen(true);
              }}
            >
              <PlusIcon className="size-3.5" />
              افزودن اولین واحد
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          {canManage && claimedCount === 0 ? (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/6 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-caption font-semibold text-foreground">
                  هنوز ساکنی وصل نشده
                </p>
                <p className="mt-0.5 text-micro text-muted-foreground">
                  لینک دعوت همهٔ واحدها را یکجا کپی کنید و برای ساکنان بفرستید.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-9 shrink-0 rounded-xl px-3 text-caption text-primary-foreground"
                disabled={pending || unclaimedActive.length === 0}
                onClick={() => void copyAllInvites()}
              >
                کپی لینک‌ها
              </Button>
            </div>
          ) : null}

          <ul className="space-y-2">
            {units.map((u) => {
              const monthly = chargePreview(u.multiplier);
              const claimed = Boolean(u.linkedUserId);
              const menuOpen = menuUnit?.id === u.id;
              const unitDebts = debtSummaryByUnit.get(u.id);
              return (
                <li
                  key={u.id}
                  className={cn(
                    "rounded-2xl border shadow-sm",
                    u.isActive
                      ? "border-border/50"
                      : "border-border/35 opacity-85",
                  )}
                >
                  <SwipeToEditRow
                    enabled={canManage}
                    open={swipedId === u.id}
                    onOpenChange={(open) =>
                      setSwipedId(open ? u.id : null)
                    }
                    onEdit={() => openEdit(u)}
                    moreSlot={
                      canManage ? (
                        <button
                          type="button"
                          aria-label={`بیشتر برای واحد ${u.name}`}
                          aria-haspopup="dialog"
                          aria-expanded={menuOpen}
                          disabled={pending}
                          onClick={() => {
                            setSwipedId(null);
                            setMenuUnit(u);
                          }}
                          className={cn(
                            "inline-flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                            menuOpen
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <MoreIcon className="size-4" />
                        </button>
                      ) : null
                    }
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!canManage) return;
                        if (swipedId === u.id) {
                          setSwipedId(null);
                          return;
                        }
                        openEdit(u);
                      }}
                      disabled={!canManage}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-0.5 text-start",
                        canManage &&
                          "transition-colors active:bg-muted/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl text-caption font-bold",
                          claimed
                            ? "bg-success-soft text-success"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {u.name}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-body-sm font-semibold text-foreground">
                            واحد {u.name}
                          </span>
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-micro font-medium",
                              claimed
                                ? "bg-success-soft text-success"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {claimed ? "متصل" : "بدون ساکن"}
                          </span>
                          {!u.isActive ? (
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-micro text-muted-foreground">
                              غیرفعال
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-caption tabular-nums text-muted-foreground">
                          {u.phone ? (
                            <span dir="ltr" className="me-1 inline-block font-mono tracking-wide">
                              {u.phone}
                            </span>
                          ) : null}
                          {u.phone ? " · " : null}
                          {claimed && u.linkedUserName
                            ? `${u.linkedUserName} · `
                            : null}
                          {monthly > 0
                            ? formatCurrency(monthly, currency)
                            : `ضریب ${faDigits(u.multiplier)}`}
                        </span>
                      </span>
                    </button>
                        {unitDebts &&
                        (unitDebts.lent > 0 || unitDebts.borrowed > 0) ? (
                          <span className="ms-12 flex flex-wrap gap-1.5 px-0.5 pb-0.5">
                            {unitDebts.lent > 0 ? (
                              <button
                                type="button"
                                onClick={() => onOpenUnitDebts?.(u.id)}
                                className="rounded-md bg-success-soft px-1.5 py-0.5 text-micro font-semibold text-success transition-colors hover:ring-1 hover:ring-success/30"
                              >
                                طلب {formatCurrency(unitDebts.lent, currency)}
                              </button>
                            ) : null}
                            {unitDebts.borrowed > 0 ? (
                              <button
                                type="button"
                                onClick={() => onOpenUnitDebts?.(u.id)}
                                className="rounded-md bg-destructive-soft px-1.5 py-0.5 text-micro font-semibold text-destructive transition-colors hover:ring-1 hover:ring-destructive/30"
                              >
                                بدهی{" "}
                                {formatCurrency(unitDebts.borrowed, currency)}
                              </button>
                            ) : null}
                          </span>
                        ) : null}
                    </div>
                  </SwipeToEditRow>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* ⋯ action sheet — light header, icon rows, dismiss by swipe */}
      <Drawer
        open={Boolean(menuUnit)}
        onOpenChange={(open) => {
          if (!open) setMenuUnit(null);
        }}
      >
        <DrawerContent className="mt-0! gap-0 border-border/50 bg-card p-0">
          <DrawerHeader className="space-y-0 border-b border-border/40 px-4 pb-3 pt-1 text-start">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-caption font-bold text-foreground">
                {menuUnit?.name}
              </span>
              <div className="min-w-0 flex-1">
                <DrawerTitle className="text-body-sm font-bold text-foreground">
                  واحد {menuUnit?.name}
                </DrawerTitle>
                <DrawerDescription className="mt-0.5 text-caption text-muted-foreground">
                  {menuUnit?.linkedUserName
                    ? `متصل به ${menuUnit.linkedUserName}`
                    : "بدون ساکن — لینک دعوت بفرستید"}
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <div className="px-3 py-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            <div className="overflow-hidden rounded-2xl border border-border/45 bg-background">
              <SheetAction
                icon={<CopyIcon className="size-4" />}
                label="کپی لینک ساکن"
                hint="در کلیپ‌بورد ذخیره می‌شود"
                disabled={pending || !menuUnit}
                onClick={() => menuUnit && copyInvite(menuUnit)}
              />
              <div className="mx-3.5 h-px bg-border/50" />
              <SheetAction
                icon={<RefreshIcon className="size-4" />}
                label="تولید مجدد لینک"
                hint="لینک قبلی باطل می‌شود"
                disabled={pending || !menuUnit}
                onClick={() => menuUnit && requestRegenerate(menuUnit)}
              />
              {menuUnit?.linkedUserId ? (
                <>
                  <div className="mx-3.5 h-px bg-border/50" />
                  <SheetAction
                    icon={<UnlinkIcon className="size-4" />}
                    label="قطع اتصال ساکن"
                    hint={
                      menuUnit.linkedUserName
                        ? menuUnit.linkedUserName
                        : undefined
                    }
                    tone="danger"
                    disabled={pending}
                    onClick={() => requestUnlink(menuUnit)}
                  />
                </>
              ) : null}
              <div className="mx-3.5 h-px bg-border/50" />
              <SheetAction
                icon={<PencilIcon className="size-4" />}
                label="ویرایش واحد"
                hint="نام، تماس، متراژ و ضریب"
                disabled={pending || !menuUnit}
                onClick={() => menuUnit && openEdit(menuUnit)}
              />
            </div>
            <button
              type="button"
              onClick={() => setMenuUnit(null)}
              className="mt-2 flex h-10 w-full items-center justify-center rounded-xl text-caption font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              بستن
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetAddForm();
        }}
        repositionInputs={false}
      >
        <DrawerContent className="mt-0! flex max-h-[88dvh] flex-col gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero shrink-0 px-4 pb-3 pt-1">
            <DrawerHeader className="space-y-0 p-0 text-start">
              <DrawerTitle className="text-body font-bold text-on-hero">
                واحد جدید
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-caption text-on-hero/70">
                نام، تماس، متراژ و ضریب شارژ
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <form
            onSubmit={onAddUnit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="surface-sheet-canvas min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
              <UnitFormFields
                nameId="unit-add-name"
                areaId="unit-add-area"
                phoneId="unit-add-phone"
                multId="unit-add-mult"
                name={unitName}
                area={unitArea}
                phone={unitPhone}
                mult={unitMult}
                onName={setUnitName}
                onArea={setUnitArea}
                onPhone={setUnitPhone}
                onMult={setUnitMult}
                baseCharge={baseCharge}
                currency={currency}
                chargePreview={chargePreview}
              />
              {formError && addOpen ? (
                <p
                  className="rounded-lg bg-destructive-soft px-2.5 py-1.5 text-caption text-destructive"
                  role="alert"
                  aria-live="assertive"
                >
                  {formError}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 flex gap-2 border-t border-border/45 bg-card px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5">
              <Button
                type="submit"
                className="h-11 flex-[1.4] rounded-xl text-primary-foreground"
                disabled={pending}
              >
                {pending ? "در حال افزودن…" : "افزودن"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                disabled={pending}
                onClick={() => {
                  setAddOpen(false);
                  resetAddForm();
                }}
              >
                انصراف
              </Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={Boolean(editUnit)}
        onOpenChange={(open) => {
          if (!open) {
            setEditUnit(null);
            setFormError(null);
          }
        }}
        repositionInputs={false}
      >
        <DrawerContent className="mt-0! flex max-h-[88dvh] flex-col gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero shrink-0 px-4 pb-3 pt-1">
            <DrawerHeader className="space-y-0 p-0 text-start">
              <DrawerTitle className="text-body font-bold text-on-hero">
                ویرایش واحد {editUnit?.name}
              </DrawerTitle>
              <DrawerDescription asChild>
                <div className="mt-1 space-y-0.5 text-caption text-on-hero/70">
                  <p>نام، تماس، متراژ و ضریب شارژ</p>
                  {editUnit?.linkedUserName ? (
                    <p>ساکن: {editUnit.linkedUserName}</p>
                  ) : (
                    <p>بدون ساکن متصل</p>
                  )}
                </div>
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <form
            onSubmit={onSaveEdit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="surface-sheet-canvas min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
              {editUnit ? (
                <div
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-3 shadow-sm",
                    editUnit.linkedUserId
                      ? "border-success/25 bg-success-soft/40"
                      : "border-border/45 bg-card",
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-caption font-semibold text-foreground">
                      {editUnit.linkedUserId
                        ? editUnit.linkedUserName || "ساکن متصل"
                        : "بدون ساکن"}
                    </p>
                    <p className="mt-0.5 text-micro text-muted-foreground">
                      {editUnit.linkedUserId
                        ? "از منوی ⋯ می‌توانید اتصال را قطع کنید"
                        : "با دکمه دعوت، لینک را برای ساکن بفرستید"}
                    </p>
                  </div>
                  {!editUnit.linkedUserId ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 shrink-0 gap-1 rounded-xl px-3 text-caption text-primary-foreground"
                      disabled={pending}
                      onClick={() => copyInvite(editUnit)}
                    >
                      <LinkIcon className="size-3.5" />
                      دعوت
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <UnitFormFields
                nameId="unit-edit-name"
                areaId="unit-edit-area"
                phoneId="unit-edit-phone"
                multId="unit-edit-mult"
                name={editName}
                area={editArea}
                phone={editPhone}
                mult={editMult}
                onName={setEditName}
                onArea={setEditArea}
                onPhone={setEditPhone}
                onMult={setEditMult}
                baseCharge={baseCharge}
                currency={currency}
                chargePreview={chargePreview}
              />

              <div className="rounded-2xl border border-border/55 bg-card p-3.5 shadow-sm">
                <p className="text-caption font-semibold text-foreground">
                  وضعیت واحد
                </p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editActive}
                  onClick={() => setEditActive((v) => !v)}
                  className={cn(
                    "mt-2.5 flex h-12 w-full items-center justify-between rounded-xl px-3.5 text-body-sm font-semibold transition-colors active:scale-[0.99]",
                    editActive
                      ? "bg-success-soft text-success ring-1 ring-success/25"
                      : "bg-muted/70 text-muted-foreground ring-1 ring-border/50",
                  )}
                >
                  <span>
                    {editActive
                      ? "فعال — در وصول دیده می‌شود"
                      : "غیرفعال — از وصول مخفی"}
                  </span>
                  <span
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
                      editActive ? "bg-success" : "bg-border",
                    )}
                    aria-hidden
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-[inset-inline-start]",
                        editActive
                          ? "inset-inline-start-5"
                          : "inset-inline-start-0.5",
                      )}
                    />
                  </span>
                </button>
              </div>

              {formError && editUnit ? (
                <p
                  className="rounded-lg bg-destructive-soft px-2.5 py-1.5 text-caption text-destructive"
                  role="alert"
                  aria-live="assertive"
                >
                  {formError}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 flex gap-2 border-t border-border/45 bg-card px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5">
              <Button
                type="submit"
                className="h-11 flex-[1.4] rounded-xl text-primary-foreground"
                disabled={pending}
              >
                {pending ? "در حال ذخیره…" : "ذخیره"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                disabled={pending}
                onClick={() => {
                  setEditUnit(null);
                  setFormError(null);
                }}
              >
                انصراف
              </Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirmAction(null);
        }}
        title={
          confirmAction?.kind === "unlink"
            ? `قطع اتصال واحد ${confirmAction.unit.name}`
            : confirmAction
              ? `تولید مجدد لینک واحد ${confirmAction.unit.name}`
              : ""
        }
        description={
          confirmAction?.kind === "unlink"
            ? "ساکن فعلی از این واحد جدا می‌شود و باید دوباره با لینک دعوت وصل شود."
            : "لینک قبلی باطل می‌شود و لینک جدید ساخته و در کلیپ‌بورد کپی می‌شود."
        }
        confirmLabel={
          confirmAction?.kind === "unlink" ? "قطع اتصال" : "تولید لینک جدید"
        }
        destructive={confirmAction?.kind === "unlink"}
        pending={pending}
        onConfirm={runConfirmedAction}
      />
    </div>
  );
}
