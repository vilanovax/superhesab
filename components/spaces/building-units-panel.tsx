"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createUnit,
  regenerateUnitInviteToken,
  unlinkUnitResident,
  updateUnit,
  type BuildingUnitRow,
} from "@/app/actions/building";
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
};

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

function faDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

export function BuildingUnitsPanel({
  spaceId,
  currency,
  units: initialUnits,
  baseCharge,
  canManage,
}: BuildingUnitsPanelProps) {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [units, setUnits] = useState(initialUnits);
  const [unitName, setUnitName] = useState("");
  const [unitArea, setUnitArea] = useState("");
  const [unitMult, setUnitMult] = useState("1000");
  const [addOpen, setAddOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<BuildingUnitRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editMult, setEditMult] = useState("1000");
  const [editActive, setEditActive] = useState(true);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] =
    useState<ConfirmUnitAction | null>(null);

  useEffect(() => {
    setUnits(initialUnits);
  }, [initialUnits]);

  useEffect(() => {
    if (!menuId) return;
    function onDocClick() {
      setMenuId(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuId]);

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

  function unitInviteUrl(token: string) {
    if (typeof window === "undefined") return `/invite/unit/${token}`;
    return `${window.location.origin}/invite/unit/${token}`;
  }

  function chargePreview(multiplier: number): number {
    return unitMonthlyCharge(Math.trunc(baseCharge) || 0, multiplier);
  }

  async function copyInvite(unit: BuildingUnitRow) {
    setMenuId(null);
    try {
      await navigator.clipboard.writeText(unitInviteUrl(unit.inviteToken));
      showToast(`لینک واحد ${unit.name} کپی شد`);
    } catch {
      showToast("کپی لینک ناموفق بود", "error");
    }
  }

  function requestUnlink(unit: BuildingUnitRow) {
    if (!unit.linkedUserId) return;
    setMenuId(null);
    setConfirmAction({ kind: "unlink", unit });
  }

  function requestRegenerate(unit: BuildingUnitRow) {
    setMenuId(null);
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
    setMenuId(null);
    setFormError(null);
    setEditUnit(unit);
    setEditName(unit.name);
    setEditArea(unit.area != null ? String(unit.area) : "");
    setEditMult(String(unit.multiplier));
    setEditActive(unit.isActive);
  }

  function focusField(id: string) {
    queueMicrotask(() => {
      const el = document.getElementById(id);
      if (el instanceof HTMLInputElement) el.focus();
    });
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
      const result = await createUnit({
        spaceId,
        name,
        area: areaRaw ? Math.trunc(Number(areaRaw)) || null : null,
        multiplier: Math.trunc(Number(unitMult)) || 1000,
      });
      if (!result.ok) {
        setFormError(result.error);
        showToast(result.error, "error");
        focusField("unit-add-name");
        return;
      }
      setUnitName("");
      setUnitArea("");
      setUnitMult("1000");
      setFormError(null);
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
    const next: BuildingUnitRow = {
      ...editUnit,
      name,
      area: areaRaw ? Math.trunc(Number(areaRaw)) || null : null,
      multiplier: Math.trunc(Number(editMult)) || 1000,
      isActive: editActive,
    };
    startTransition(async () => {
      const result = await updateUnit({
        spaceId,
        unitId: next.id,
        name: next.name,
        area: next.area,
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
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-pretty text-body-sm font-semibold text-foreground">
            واحدها
          </h2>
          <p className="mt-0.5 text-caption text-muted-foreground">
            {units.length === 0
              ? "هنوز واحدی تعریف نشده"
              : `${faDigits(activeCount)} فعال · ${faDigits(claimedCount)} متصل`}
          </p>
          {baseCharge > 0 ? (
            <p className="mt-0.5 text-micro text-muted-foreground">
              شارژ = پایه {formatCurrency(baseCharge, currency)} × ضریب
            </p>
          ) : null}
        </div>
        {canManage ? (
          <Button
            type="button"
            className="h-9 rounded-xl px-3 text-caption font-semibold"
            onClick={() => setAddOpen(true)}
          >
            <PlusIcon className="size-3.5" />
            واحد جدید
          </Button>
        ) : null}
      </div>

      {units.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center">
          <p className="text-body-sm font-semibold text-foreground">
            واحدی ثبت نشده
          </p>
          <p className="mt-1 text-caption text-muted-foreground">
            برای وصول شارژ، حداقل یک واحد فعال لازم است.
          </p>
          {canManage ? (
            <Button
              type="button"
              className="mt-3 h-10 rounded-xl"
              onClick={() => setAddOpen(true)}
            >
              <PlusIcon className="size-3.5" />
              افزودن اولین واحد
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2">
          {units.map((u) => {
            const monthly = chargePreview(u.multiplier);
            const claimed = Boolean(u.linkedUserId);
            return (
              <li
                key={u.id}
                className={cn(
                  "rounded-2xl border bg-card px-3 py-2.5 [content-visibility:auto] [contain-intrinsic-size:auto_4.25rem]",
                  u.isActive
                    ? "border-border/55"
                    : "border-border/40 bg-muted/30 opacity-80",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl text-caption font-bold",
                      claimed
                        ? "bg-success-soft text-success"
                        : u.isActive
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {u.name}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-body-sm font-semibold text-foreground">
                        واحد {u.name}
                      </p>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-micro font-medium",
                          claimed
                            ? "bg-success-soft text-success"
                            : "bg-destructive-soft/70 text-destructive",
                        )}
                      >
                        {claimed ? "متصل" : "نپیوسته"}
                      </span>
                      {!u.isActive ? (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-micro text-muted-foreground">
                          غیرفعال
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-caption text-muted-foreground">
                      {[
                        claimed && u.linkedUserName ? u.linkedUserName : null,
                        u.area != null ? `${u.area} م²` : null,
                        monthly > 0
                          ? formatCurrency(monthly, currency)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  {canManage ? (
                    <div className="relative flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`ویرایش واحد ${u.name}`}
                        title="ویرایش"
                        disabled={pending}
                        onClick={() => openEdit(u)}
                        className="inline-flex size-9 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-45"
                      >
                        <PencilIcon className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`بیشتر برای واحد ${u.name}`}
                        aria-haspopup="menu"
                        aria-expanded={menuId === u.id}
                        aria-controls={
                          menuId === u.id ? `unit-menu-${u.id}` : undefined
                        }
                        disabled={pending}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuId((id) => (id === u.id ? null : u.id));
                        }}
                        className={cn(
                          "inline-flex size-9 items-center justify-center rounded-xl border border-border/60 transition-colors",
                          menuId === u.id
                            ? "border-primary/35 bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <MoreIcon className="size-4" />
                      </button>
                      {menuId === u.id ? (
                        <div
                          id={`unit-menu-${u.id}`}
                          role="menu"
                          className="absolute end-0 top-full z-20 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-border/60 bg-card py-1 shadow-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="block w-full px-3 py-2 text-start text-caption font-medium hover:bg-muted"
                            onClick={() => copyInvite(u)}
                          >
                            کپی لینک ساکن
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="block w-full px-3 py-2 text-start text-caption font-medium hover:bg-muted"
                            onClick={() => requestRegenerate(u)}
                          >
                            تولید مجدد لینک
                          </button>
                          {claimed ? (
                            <button
                              type="button"
                              role="menuitem"
                              className="block w-full px-3 py-2 text-start text-caption font-medium text-destructive hover:bg-destructive-soft"
                              onClick={() => requestUnlink(u)}
                            >
                              قطع اتصال
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Drawer
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setFormError(null);
        }}
        repositionInputs={false}
      >
        <DrawerContent className="mt-0! flex h-auto max-h-[85dvh] flex-col gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero shrink-0 px-4 pb-2.5 pt-1">
            <DrawerHeader className="space-y-0 p-0 text-start">
              <DrawerTitle className="text-pretty text-body font-bold text-on-hero">
                واحد جدید
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-caption text-on-hero/70">
                نام، متراژ و ضریب شارژ
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <form
            onSubmit={onAddUnit}
            className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <div className="space-y-1">
              <label
                htmlFor="unit-add-name"
                className="text-label text-muted-foreground"
              >
                نام / شماره
              </label>
              <Input
                id="unit-add-name"
                name="unitName"
                autoComplete="off"
                spellCheck={false}
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="مثلاً ۱ یا شرقی…"
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label
                  htmlFor="unit-add-area"
                  className="text-label text-muted-foreground"
                >
                  متراژ (م²)
                </label>
                <Input
                  id="unit-add-area"
                  name="area"
                  autoComplete="off"
                  type="text"
                  inputMode="numeric"
                  value={unitArea}
                  onChange={(e) =>
                    setUnitArea(e.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="اختیاری…"
                  className="h-11 rounded-xl tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="unit-add-mult"
                  className="text-label text-muted-foreground"
                >
                  ضریب (هزارم)
                </label>
                <Input
                  id="unit-add-mult"
                  name="multiplier"
                  autoComplete="off"
                  type="text"
                  inputMode="numeric"
                  value={unitMult}
                  onChange={(e) =>
                    setUnitMult(e.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="۱۰۰۰…"
                  className="h-11 rounded-xl tabular-nums"
                />
              </div>
            </div>
            <p className="text-micro text-muted-foreground">
              ۱۰۰۰ = شارژ کامل پایه
              {baseCharge > 0
                ? ` · ${formatCurrency(chargePreview(Math.trunc(Number(unitMult)) || 1000), currency)}`
                : ""}
            </p>
            {formError && addOpen ? (
              <p
                className="rounded-lg bg-destructive-soft px-2.5 py-1.5 text-caption text-destructive"
                role="alert"
                aria-live="assertive"
              >
                {formError}
              </p>
            ) : null}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                disabled={pending}
                onClick={() => {
                  setAddOpen(false);
                  setFormError(null);
                }}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                className="h-11 flex-[1.4] rounded-xl"
                disabled={pending}
              >
                {pending ? "در حال افزودن…" : "افزودن"}
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
        <DrawerContent className="mt-0! flex h-auto max-h-[85dvh] flex-col gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero shrink-0 px-4 pb-2.5 pt-1">
            <DrawerHeader className="space-y-0 p-0 text-start">
              <DrawerTitle className="text-pretty text-body font-bold text-on-hero">
                ویرایش واحد {editUnit?.name}
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-caption text-on-hero/70">
                نام، متراژ، ضریب و وضعیت
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <form
            onSubmit={onSaveEdit}
            className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <div className="space-y-1">
              <label
                htmlFor="unit-edit-name"
                className="text-label text-muted-foreground"
              >
                نام / شماره
              </label>
              <Input
                id="unit-edit-name"
                name="unitName"
                autoComplete="off"
                spellCheck={false}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="مثلاً ۱ یا شرقی…"
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label
                  htmlFor="unit-edit-area"
                  className="text-label text-muted-foreground"
                >
                  متراژ (م²)
                </label>
                <Input
                  id="unit-edit-area"
                  name="area"
                  autoComplete="off"
                  type="text"
                  inputMode="numeric"
                  value={editArea}
                  onChange={(e) =>
                    setEditArea(e.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="اختیاری…"
                  className="h-11 rounded-xl tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="unit-edit-mult"
                  className="text-label text-muted-foreground"
                >
                  ضریب (هزارم)
                </label>
                <Input
                  id="unit-edit-mult"
                  name="multiplier"
                  autoComplete="off"
                  type="text"
                  inputMode="numeric"
                  value={editMult}
                  onChange={(e) =>
                    setEditMult(e.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="۱۰۰۰…"
                  className="h-11 rounded-xl tabular-nums"
                  required
                />
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={editActive}
              onClick={() => setEditActive((v) => !v)}
              className={cn(
                "flex h-11 w-full items-center justify-between rounded-xl border px-3 text-body-sm font-semibold transition-colors",
                editActive
                  ? "border-success/30 bg-success-soft/50 text-success"
                  : "border-border/60 bg-muted/50 text-muted-foreground",
              )}
            >
              <span>{editActive ? "فعال" : "غیرفعال"}</span>
              <span className="text-caption">
                {editActive ? "برای غیرفعال‌سازی بزنید" : "برای فعال‌سازی بزنید"}
              </span>
            </button>

            {baseCharge > 0 ? (
              <p className="rounded-xl bg-sheet-muted px-3 py-2 text-caption text-muted-foreground">
                شارژ ماهانه:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(
                    chargePreview(Math.trunc(Number(editMult)) || 1000),
                    currency,
                  )}
                </span>
              </p>
            ) : null}

            {formError && editUnit ? (
              <p
                className="rounded-lg bg-destructive-soft px-2.5 py-1.5 text-caption text-destructive"
                role="alert"
                aria-live="assertive"
              >
                {formError}
              </p>
            ) : null}

            <div className="flex gap-2 pt-1">
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
              <Button
                type="submit"
                className="h-11 flex-[1.4] rounded-xl"
                disabled={pending}
              >
                {pending ? "در حال ذخیره…" : "ذخیره"}
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
