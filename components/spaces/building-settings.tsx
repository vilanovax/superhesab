"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createUnit,
  updateUnit,
  upsertChargePlan,
} from "@/app/actions/building";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tehranCivilYear } from "@/lib/building";
import type { SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type UnitRow = {
  id: string;
  name: string;
  area: number | null;
  multiplier: number;
  isActive: boolean;
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
  const [baseCharge, setBaseCharge] = useState(
    planBaseCharge != null ? String(planBaseCharge) : "",
  );
  const [unitName, setUnitName] = useState("");
  const [unitArea, setUnitArea] = useState("");
  const [unitMult, setUnitMult] = useState("1000");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSavePlan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const result = await upsertChargePlan({
        spaceId,
        year: Math.trunc(Number(year)) || tehranCivilYear(),
        baseCharge: Math.trunc(Number(baseCharge)) || 0,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOkMsg("پلن شارژ ذخیره شد.");
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
      setUnits((prev) => [
        ...prev,
        {
          id: result.id!,
          name: unitName.trim(),
          area: areaRaw ? Math.trunc(Number(areaRaw)) || null : null,
          multiplier: Math.trunc(Number(unitMult)) || 1000,
          isActive: true,
        },
      ]);
      setUnitName("");
      setUnitArea("");
      setUnitMult("1000");
      setOkMsg("واحد اضافه شد.");
      router.refresh();
    });
  }

  function onToggleActive(unit: UnitRow) {
    setError(null);
    startTransition(async () => {
      const result = await updateUnit({
        spaceId,
        unitId: unit.id,
        name: unit.name,
        area: unit.area,
        multiplier: unit.multiplier,
        isActive: !unit.isActive,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUnits((prev) =>
        prev.map((u) =>
          u.id === unit.id ? { ...u, isActive: !u.isActive } : u,
        ),
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSavePlan} className="space-y-3">
        <div>
          <h2 className="text-body-sm font-semibold text-foreground">
            پلن شارژ سالانه
          </h2>
          <p className="mt-0.5 text-caption text-muted-foreground">
            سال شمسی + مبلغ پایه ماهانه × ضریب واحد (۱۰۰۰ = ۱ برابر)
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-label text-muted-foreground">
              سال شمسی
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={year}
              disabled={disabled || pending}
              onChange={(e) =>
                setYear(e.target.value.replace(/[^\d]/g, ""))
              }
              className="h-11 rounded-xl tabular-nums"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-label text-muted-foreground">
              شارژ پایه ماهانه
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={baseCharge}
              disabled={disabled || pending}
              onChange={(e) =>
                setBaseCharge(e.target.value.replace(/[^\d]/g, ""))
              }
              placeholder="مثلاً ۵۰۰۰۰۰"
              className="h-11 rounded-xl tabular-nums"
              required
            />
          </div>
        </div>
        {!disabled ? (
          <Button
            type="submit"
            className="h-11 w-full rounded-xl"
            disabled={pending}
          >
            {pending ? "…" : "ذخیره پلن شارژ"}
          </Button>
        ) : null}
      </form>

      <div className="space-y-3 border-t border-border/50 pt-5">
        <div>
          <h2 className="text-body-sm font-semibold text-foreground">واحدها</h2>
          <p className="mt-0.5 text-caption text-muted-foreground">
            تعریف واحدهای ساختمان برای وصول شارژ
          </p>
        </div>

        {units.length > 0 ? (
          <ul className="space-y-2">
            {units.map((u) => (
              <li
                key={u.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-sheet-muted/60 px-3 py-2.5",
                  !u.isActive && "opacity-55",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-semibold">
                    واحد {u.name}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    ضریب {u.multiplier}
                    {u.area != null ? ` · ${u.area} م²` : ""}
                    {!u.isActive ? " · غیرفعال" : ""}
                  </p>
                </div>
                {!disabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 rounded-lg text-caption"
                    disabled={pending}
                    onClick={() => onToggleActive(u)}
                  >
                    {u.isActive ? "غیرفعال" : "فعال"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border/60 px-3 py-4 text-center text-caption text-muted-foreground">
            هنوز واحدی ثبت نشده
          </p>
        )}

        {!disabled ? (
          <form
            onSubmit={onAddUnit}
            className="space-y-2 rounded-2xl border border-border/55 bg-card p-3.5"
          >
            <p className="text-caption font-semibold text-muted-foreground">
              واحد جدید
            </p>
            <Input
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              placeholder="نام / شماره واحد"
              className="h-11 rounded-xl"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="text"
                inputMode="numeric"
                value={unitArea}
                onChange={(e) =>
                  setUnitArea(e.target.value.replace(/[^\d]/g, ""))
                }
                placeholder="متراژ (اختیاری)"
                className="h-11 rounded-xl tabular-nums"
              />
              <Input
                type="text"
                inputMode="numeric"
                value={unitMult}
                onChange={(e) =>
                  setUnitMult(e.target.value.replace(/[^\d]/g, ""))
                }
                placeholder="ضریب (۱۰۰۰)"
                className="h-11 rounded-xl tabular-nums"
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full rounded-xl"
              disabled={pending}
            >
              {pending ? "…" : "افزودن واحد"}
            </Button>
          </form>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {okMsg ? (
        <p className="text-caption text-success">
          {okMsg}
          {baseCharge && okMsg.includes("پلن")
            ? ` · ${formatCurrency(Math.trunc(Number(baseCharge)) || 0, currency)}`
            : ""}
        </p>
      ) : null}
    </div>
  );
}
