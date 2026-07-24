"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createUnit,
  regenerateUnitInviteToken,
  unlinkUnitResident,
  updateUnit,
  upsertChargePlan,
} from "@/app/actions/building";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  formatJalaliYear,
  tehranCivilYear,
  unitMonthlyCharge,
} from "@/lib/building";
import { currencyLabel, type SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type UnitRow = {
  id: string;
  name: string;
  area: number | null;
  multiplier: number;
  isActive: boolean;
  inviteToken: string;
  linkedUserId: string | null;
  linkedUserName: string | null;
  linkedAt: string | null;
};

type BuildingSettingsProps = {
  spaceId: string;
  currency: SpaceCurrency;
  units: UnitRow[];
  planYear: number;
  planBaseCharge: number | null;
  disabled?: boolean;
};

export function BuildingSettings({
  spaceId,
  currency,
  units: initialUnits,
  planYear,
  planBaseCharge,
  disabled = false,
}: BuildingSettingsProps) {
  const router = useRouter();
  const [units, setUnits] = useState(initialUnits);
  const [year, setYear] = useState(String(planYear));
  const [baseCharge, setBaseCharge] = useState(planBaseCharge ?? 0);
  const [unitName, setUnitName] = useState("");
  const [unitArea, setUnitArea] = useState("");
  const [unitMult, setUnitMult] = useState("1000");
  const [addOpen, setAddOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<UnitRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editMult, setEditMult] = useState("1000");
  const [editActive, setEditActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const unitLabel = currencyLabel(currency);
  const yearNum = Math.trunc(Number(year)) || tehranCivilYear();

  useEffect(() => {
    setUnits(initialUnits);
  }, [initialUnits]);

  useEffect(() => {
    setYear(String(planYear));
    setBaseCharge(planBaseCharge ?? 0);
  }, [planYear, planBaseCharge]);

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

  async function copyInvite(unit: UnitRow) {
    try {
      await navigator.clipboard.writeText(unitInviteUrl(unit.inviteToken));
      setOkMsg(`لینک واحد ${unit.name} کپی شد.`);
      setError(null);
    } catch {
      setError("کپی لینک ناموفق بود.");
    }
  }

  function onUnlink(unit: UnitRow) {
    if (!unit.linkedUserId) return;
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const result = await unlinkUnitResident(spaceId, unit.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUnits((prev) =>
        prev.map((u) =>
          u.id === unit.id
            ? { ...u, linkedUserId: null, linkedUserName: null, linkedAt: null }
            : u,
        ),
      );
      setOkMsg(`اتصال واحد ${unit.name} قطع شد.`);
      router.refresh();
    });
  }

  function onRegenerate(unit: UnitRow) {
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const result = await regenerateUnitInviteToken(spaceId, unit.id);
      if (!result.ok) {
        setError(result.error);
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
          setOkMsg(`لینک جدید واحد ${unit.name} ساخته و کپی شد.`);
        } catch {
          setOkMsg(`لینک جدید واحد ${unit.name} ساخته شد.`);
        }
      }
      router.refresh();
    });
  }

  function openEdit(unit: UnitRow) {
    setEditUnit(unit);
    setEditName(unit.name);
    setEditArea(unit.area != null ? String(unit.area) : "");
    setEditMult(String(unit.multiplier));
    setEditActive(unit.isActive);
    setError(null);
  }

  function onSavePlan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const result = await upsertChargePlan({
        spaceId,
        year: yearNum,
        baseCharge: Math.trunc(baseCharge) || 0,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOkMsg(
        `پلن شارژ سال ${formatJalaliYear(yearNum)} ذخیره شد.`,
      );
      router.refresh();
    });
  }

  function onAddUnit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const areaRaw = unitArea.trim();
      const result = await createUnit({
        spaceId,
        name: unitName,
        area: areaRaw ? Math.trunc(Number(areaRaw)) || null : null,
        multiplier: Math.trunc(Number(unitMult)) || 1000,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUnitName("");
      setUnitArea("");
      setUnitMult("1000");
      setAddOpen(false);
      setOkMsg("واحد اضافه شد.");
      router.refresh();
    });
  }

  function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUnit) return;
    setError(null);
    setOkMsg(null);
    const areaRaw = editArea.trim();
    const next: UnitRow = {
      ...editUnit,
      name: editName.trim(),
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
        setError(result.error);
        return;
      }
      setUnits((prev) => prev.map((u) => (u.id === next.id ? next : u)));
      setEditUnit(null);
      setOkMsg("واحد به‌روزرسانی شد.");
      router.refresh();
    });
  }

  function chargePreview(multiplier: number): number {
    return unitMonthlyCharge(Math.trunc(baseCharge) || 0, multiplier);
  }

  return (
    <div className="space-y-5">
      {/* Charge plan */}
      <form
        onSubmit={onSavePlan}
        className="space-y-3 rounded-2xl border border-border/55 bg-sheet-muted/40 p-3.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-body-sm font-semibold text-foreground">
              پلن شارژ
            </h2>
            <p className="mt-0.5 text-caption text-muted-foreground">
              پایه ماهانه × ضریب واحد (۱۰۰۰ = ۱ برابر)
            </p>
          </div>
          {baseCharge > 0 ? (
            <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-micro font-semibold text-primary">
              {formatJalaliYear(yearNum)}
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-label text-muted-foreground">سال شمسی</label>
            <Input
              type="text"
              inputMode="numeric"
              value={year}
              disabled={disabled || pending}
              onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, ""))}
              className="h-11 rounded-xl tabular-nums"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-label text-muted-foreground">
              پایه ماهانه ({unitLabel})
            </label>
            <MoneyInput
              value={baseCharge}
              onValueChange={setBaseCharge}
              disabled={disabled || pending}
              className="h-11 rounded-xl font-semibold"
            />
          </div>
        </div>
        {!disabled ? (
          <Button
            type="submit"
            className="h-11 w-full rounded-xl text-primary-foreground"
            disabled={pending}
          >
            {pending ? "…" : "ذخیره پلن شارژ"}
          </Button>
        ) : null}
      </form>

      {/* Units */}
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-body-sm font-semibold text-foreground">
              واحدها
            </h2>
            <p className="mt-0.5 text-caption text-muted-foreground">
              {units.length === 0
                ? "هنوز واحدی تعریف نشده"
                : `${activeCount.toLocaleString("fa-IR")} فعال · ${claimedCount.toLocaleString("fa-IR")} متصل به اپ`}
            </p>
          </div>
          {!disabled ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl text-caption font-semibold"
              onClick={() => {
                setAddOpen(true);
                setError(null);
              }}
            >
              + واحد جدید
            </Button>
          ) : null}
        </div>

        {units.length > 0 ? (
          <ul className="space-y-2">
            {units.map((u) => {
              const monthly = chargePreview(u.multiplier);
              const claimed = Boolean(u.linkedUserId);
              return (
                <li
                  key={u.id}
                  className={cn(
                    "rounded-2xl border bg-card px-3.5 py-3 transition-colors",
                    u.isActive
                      ? "border-border/55"
                      : "border-border/40 bg-muted/30 opacity-80",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl text-caption font-bold",
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
                          {claimed ? "متصل شده" : "نپیوسته"}
                        </span>
                        {!u.isActive ? (
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-micro text-muted-foreground">
                            غیرفعال
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-caption text-muted-foreground">
                        {claimed && u.linkedUserName
                          ? `${u.linkedUserName} · `
                          : ""}
                        {u.area != null ? `${u.area} م² · ` : ""}
                        ضریب {(u.multiplier / 1000).toLocaleString("fa-IR", {
                          maximumFractionDigits: 2,
                        })}
                        ×
                        {monthly > 0
                          ? ` · ${formatCurrency(monthly, currency)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  {!disabled ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border/40 pt-2.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-caption"
                        disabled={pending}
                        onClick={() => openEdit(u)}
                      >
                        ویرایش
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-caption"
                        disabled={pending}
                        onClick={() => copyInvite(u)}
                      >
                        کپی لینک ساکن
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-caption"
                        disabled={pending}
                        onClick={() => onRegenerate(u)}
                      >
                        تولید مجدد لینک
                      </Button>
                      {claimed ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg text-caption text-destructive"
                          disabled={pending}
                          onClick={() => onUnlink(u)}
                        >
                          قطع اتصال
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center">
            <p className="text-body-sm font-semibold text-foreground">
              واحدی ثبت نشده
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
              برای وصول شارژ، حداقل یک واحد فعال لازم است.
            </p>
            {!disabled ? (
              <Button
                type="button"
                className="mt-3 h-10 rounded-xl text-primary-foreground"
                onClick={() => setAddOpen(true)}
              >
                افزودن اولین واحد
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {error ? (
        <p
          className="rounded-lg bg-destructive-soft px-2.5 py-1.5 text-caption text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {okMsg ? (
        <p className="rounded-lg bg-success-soft px-2.5 py-1.5 text-caption text-success">
          {okMsg}
        </p>
      ) : null}

      {/* Add unit drawer */}
      <Drawer open={addOpen} onOpenChange={setAddOpen}>
        <DrawerContent className="mt-0! h-auto max-h-[85dvh] gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero shrink-0 px-4 pb-2.5 pt-1">
            <DrawerHeader className="space-y-0 p-0 text-start">
              <DrawerTitle className="text-body font-bold text-on-hero">
                واحد جدید
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-caption text-on-hero/70">
                نام، متراژ و ضریب شارژ را وارد کنید
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <form
            onSubmit={onAddUnit}
            className="space-y-2.5 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <div className="space-y-1">
              <label className="text-label text-muted-foreground">
                نام / شماره
              </label>
              <Input
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="مثلاً ۱ یا شرقی"
                className="h-11 rounded-xl"
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-label text-muted-foreground">
                  متراژ (م²)
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={unitArea}
                  onChange={(e) =>
                    setUnitArea(e.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="اختیاری"
                  className="h-11 rounded-xl tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <label className="text-label text-muted-foreground">
                  ضریب (هزارم)
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={unitMult}
                  onChange={(e) =>
                    setUnitMult(e.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="۱۰۰۰"
                  className="h-11 rounded-xl tabular-nums"
                />
              </div>
            </div>
            <p className="text-micro text-muted-foreground">
              ۱۰۰۰ = شارژ کامل پایه
              {baseCharge > 0
                ? ` · پیش‌نمایش: ${formatCurrency(chargePreview(Math.trunc(Number(unitMult)) || 1000), currency)}`
                : ""}
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onClick={() => setAddOpen(false)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                className="h-11 flex-[1.4] rounded-xl text-primary-foreground"
                disabled={pending}
              >
                {pending ? "…" : "افزودن"}
              </Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Edit unit drawer */}
      <Drawer
        open={Boolean(editUnit)}
        onOpenChange={(open) => {
          if (!open) setEditUnit(null);
        }}
      >
        <DrawerContent className="mt-0! h-auto max-h-[85dvh] gap-0 overflow-hidden border-border/50 bg-background p-0">
          <div className="surface-hero shrink-0 px-4 pb-2.5 pt-1">
            <DrawerHeader className="space-y-0 p-0 text-start">
              <DrawerTitle className="text-body font-bold text-on-hero">
                ویرایش واحد {editUnit?.name}
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-caption text-on-hero/70">
                نام، متراژ، ضریب و وضعیت فعال
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <form
            onSubmit={onSaveEdit}
            className="space-y-2.5 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <div className="space-y-1">
              <label className="text-label text-muted-foreground">
                نام / شماره
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-label text-muted-foreground">
                  متراژ (م²)
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={editArea}
                  onChange={(e) =>
                    setEditArea(e.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="اختیاری"
                  className="h-11 rounded-xl tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <label className="text-label text-muted-foreground">
                  ضریب (هزارم)
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={editMult}
                  onChange={(e) =>
                    setEditMult(e.target.value.replace(/[^\d]/g, ""))
                  }
                  className="h-11 rounded-xl tabular-nums"
                  required
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEditActive((v) => !v)}
              className={cn(
                "flex h-11 w-full items-center justify-between rounded-xl border px-3 text-body-sm font-semibold transition-colors",
                editActive
                  ? "border-success/30 bg-success-soft/50 text-success"
                  : "border-border/60 bg-muted/50 text-muted-foreground",
              )}
            >
              <span>{editActive ? "واحد فعال است" : "واحد غیرفعال است"}</span>
              <span className="text-caption">
                {editActive ? "برای غیرفعال‌سازی بزنید" : "برای فعال‌سازی بزنید"}
              </span>
            </button>

            {baseCharge > 0 ? (
              <p className="rounded-xl bg-sheet-muted px-3 py-2 text-caption text-muted-foreground">
                شارژ ماهانه تخمینی:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(
                    chargePreview(Math.trunc(Number(editMult)) || 1000),
                    currency,
                  )}
                </span>
              </p>
            ) : null}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onClick={() => setEditUnit(null)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                className="h-11 flex-[1.4] rounded-xl text-primary-foreground"
                disabled={pending}
              >
                {pending ? "…" : "ذخیره"}
              </Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
