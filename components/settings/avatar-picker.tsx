"use client";

import { UserAvatar } from "@/components/ui/user-avatar";
import { PRESET_AVATARS } from "@/lib/preset-avatars";
import { cn } from "@/lib/utils";

export function AvatarPicker({
  phone,
  name,
  value,
  disabled,
  onChange,
}: {
  phone: string;
  name: string;
  value: string | null;
  disabled?: boolean;
  onChange: (next: string | null) => void;
}) {
  return (
    <div>
      <h2 className="text-body-sm font-semibold text-foreground">آواتار</h2>
      <p className="mt-0.5 text-caption text-muted-foreground">
        در هدر اپ به‌جای حرف اول نام دیده می‌شود
      </p>
      <div
        role="radiogroup"
        aria-label="انتخاب آواتار"
        className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-7"
      >
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          aria-label="بدون تصویر — حرف اول نام"
          disabled={disabled}
          onClick={() => onChange(null)}
          className={cn(
            "flex size-12 items-center justify-center rounded-full ring-offset-2 ring-offset-card",
            "transition-[box-shadow,transform] duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "active:scale-[0.96] disabled:opacity-50",
            !value
              ? "ring-2 ring-primary"
              : "ring-1 ring-border/60 hover:ring-primary/40",
          )}
        >
          <UserAvatar phone={phone} name={name} size={48} />
        </button>
        {PRESET_AVATARS.map((avatar) => {
          const selected = value === avatar.src;
          return (
            <button
              key={avatar.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`آواتار ${avatar.id}`}
              disabled={disabled}
              onClick={() => onChange(avatar.src)}
              className={cn(
                "size-12 overflow-hidden rounded-full ring-offset-2 ring-offset-card",
                "transition-[box-shadow,transform] duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "active:scale-[0.96] disabled:opacity-50",
                selected
                  ? "ring-2 ring-primary"
                  : "ring-1 ring-border/60 hover:ring-primary/40",
              )}
            >
              <UserAvatar
                phone={phone}
                name={name}
                avatarUrl={avatar.src}
                size={48}
                alt=""
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
