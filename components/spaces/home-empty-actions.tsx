"use client";

import { useState } from "react";
import { CreateSpaceSheet } from "@/components/spaces/create-space-sheet";
import { SpaceTypeIcon } from "@/components/spaces/space-type-icon";
import { cn } from "@/lib/utils";
import type { SpaceType } from "@/types";

const TEMPLATES: {
  type: SpaceType;
  label: string;
  hint: string;
  /** First-run highlight — one clear default without forcing the choice. */
  recommended?: boolean;
}[] = [
  {
    type: "TRIP",
    label: "سفر و دورهمی",
    hint: "خرج گروهی؛ تقسیم عادلانه",
    recommended: true,
  },
  { type: "PARTNER", label: "حساب مشترک", hint: "دونفره؛ روزمره و تسویه" },
  { type: "FAMILY", label: "خانه", hint: "هزینه‌های خانواده در یک دفتر" },
  { type: "FUND", label: "صندوق نوبتی", hint: "پس‌انداز نوبتی با اعضا" },
  { type: "BUILDING", label: "ساختمان", hint: "شارژ، واحدها و معوقات" },
];

/** Neutral icon wells — keep hierarchy on “پیشنهادی”, not rainbow tints. */
function iconWell(recommended: boolean): string {
  return recommended
    ? "bg-primary/12 text-primary"
    : "bg-secondary text-primary";
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/**
 * Empty-home onboarding — pick a template, then name the space.
 * List is the only hero; one recommended default.
 */
export function HomeEmptyActions({
  error,
  disabledTypes = [],
}: {
  error?: string;
  disabledTypes?: SpaceType[];
}) {
  const [open, setOpen] = useState(false);
  const disabled = new Set(disabledTypes);
  const templates = TEMPLATES.filter((t) => !disabled.has(t.type));
  const recommended =
    templates.find((t) => t.recommended)?.type ?? templates[0]?.type ?? "TRIP";
  const [initialType, setInitialType] = useState<SpaceType>(recommended);

  function openWith(type: SpaceType) {
    setInitialType(type);
    setOpen(true);
  }

  return (
    <>
      <div className="flex w-full flex-1 flex-col">
        <div className="mb-3 space-y-1">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            نوع دفتر را انتخاب کن
          </h2>
          <p className="text-caption leading-relaxed text-muted-foreground">
            بعد از ساخت، خرج ثبت کن؛ تراز خودش جور می‌شود.
          </p>
        </div>

        <ul className="flex flex-col gap-2" role="list">
          {templates.map((item, index) => {
            const isRecommended = item.type === recommended;
            return (
              <li
                key={item.type}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
              >
                <button
                  type="button"
                  onClick={() => openWith(item.type)}
                  className={cn(
                    "group flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-[1.2rem] border bg-card px-3.5 py-3 text-start",
                    "shadow-sm transition-[border-color,box-shadow,transform,background-color] duration-150",
                    "hover:shadow-md active:scale-[0.99]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isRecommended
                      ? "border-primary/35 bg-primary/5 hover:border-primary/45"
                      : "border-border/50 hover:border-primary/25",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-2xl",
                      iconWell(isRecommended),
                    )}
                  >
                    <SpaceTypeIcon type={item.type} className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-body-sm font-semibold text-foreground">
                        {item.label}
                      </span>
                      {isRecommended ? (
                        <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold text-primary ring-1 ring-primary/15">
                          پیشنهادی
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-caption text-muted-foreground">
                      {item.hint}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150",
                      isRecommended
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                    )}
                  >
                    <PlusIcon className="size-4" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-auto pt-6 text-center text-caption leading-relaxed text-muted-foreground/85">
          بعداً می‌توانی دفتر دیگری هم بسازی.
        </p>
      </div>
      <CreateSpaceSheet
        error={error}
        open={open}
        onOpenChange={setOpen}
        initialType={initialType}
        hideTrigger
        disabledTypes={disabledTypes}
      />
    </>
  );
}
