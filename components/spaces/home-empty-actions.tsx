"use client";

import { useState } from "react";
import { CreateSpaceSheet } from "@/components/spaces/create-space-sheet";
import {
  SpaceTypeIcon,
  spaceTypeAccent,
  spaceTypeTint,
} from "@/components/spaces/space-type-icon";
import { cn } from "@/lib/utils";
import type { SpaceType } from "@/types";

const TEMPLATES: {
  type: SpaceType;
  label: string;
  hint: string;
}[] = [
  { type: "TRIP", label: "سفر و دورهمی", hint: "خرج گروهی؛ تقسیم عادلانه" },
  { type: "PARTNER", label: "حساب مشترک", hint: "دونفره؛ روزمره و تسویه" },
  { type: "FAMILY", label: "خانه", hint: "هزینه‌های خانواده در یک دفتر" },
  { type: "FUND", label: "صندوق نوبتی", hint: "پس‌انداز نوبتی با اعضا" },
  { type: "BUILDING", label: "ساختمان", hint: "شارژ، واحدها و معوقات" },
];

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/**
 * Empty-home template picker — equal choices, each opens create-space sheet.
 */
export function HomeEmptyActions({ error }: { error?: string }) {
  const [open, setOpen] = useState(false);
  const [initialType, setInitialType] = useState<SpaceType>("TRIP");

  function openWith(type: SpaceType) {
    setInitialType(type);
    setOpen(true);
  }

  return (
    <>
      <div className="w-full space-y-2.5">
        <p className="text-start text-caption font-semibold text-muted-foreground">
          نوع دفتر را انتخاب کن
        </p>
        <ul className="flex flex-col gap-2" role="list">
          {TEMPLATES.map((item, index) => (
            <li
              key={item.type}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
            >
              <button
                type="button"
                onClick={() => openWith(item.type)}
                className={cn(
                  "group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-border/55 bg-card ps-3.5 pe-3 py-3 text-start",
                  "shadow-sm transition-[border-color,box-shadow,transform] duration-150",
                  "hover:border-primary/30 hover:shadow-md active:scale-[0.99]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-3 start-0 w-[3px] rounded-full",
                    spaceTypeAccent(item.type),
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    spaceTypeTint(item.type),
                  )}
                >
                  <SpaceTypeIcon type={item.type} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-semibold text-foreground">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-caption text-muted-foreground">
                    {item.hint}
                  </span>
                </span>
                <Chevron className="size-4 shrink-0 text-muted-foreground/45 transition-transform duration-150 group-hover:-translate-x-0.5 group-hover:text-primary" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <CreateSpaceSheet
        error={error}
        open={open}
        onOpenChange={setOpen}
        initialType={initialType}
        hideTrigger
      />
    </>
  );
}
