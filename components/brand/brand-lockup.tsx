import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";

const SIZE = {
  /** Home eyebrow / tight chrome — mark 20px (plus stays legible) */
  sm: {
    root: "gap-1.5",
    mark: "size-5",
    text: "text-caption font-bold tracking-tight",
  },
  /** Settings / admin footers — mark 24px */
  md: {
    root: "gap-2",
    mark: "size-6",
    text: "text-body-sm font-bold tracking-tight",
  },
  /** Auth / marketing hero — mark 44–48px */
  lg: {
    root: "gap-2.5",
    mark: "size-11 sm:size-12",
    text: "text-[1.65rem] font-bold tracking-tight sm:text-[1.85rem]",
  },
} as const;

export type BrandLockupSize = keyof typeof SIZE;

type BrandLockupProps = {
  size?: BrandLockupSize;
  className?: string;
  /** Hide wordmark — mark only (e.g. ultra-narrow). */
  markOnly?: boolean;
};

/**
 * Official horizontal lockup: mark + «سوپرحساب».
 * Uses `dir="ltr"` so mark stays left of the wordmark (brand sheet).
 */
export function BrandLockup({
  size = "md",
  className,
  markOnly = false,
}: BrandLockupProps) {
  const s = SIZE[size];

  return (
    <span
      dir="ltr"
      translate="no"
      className={cn(
        "inline-flex max-w-full items-center text-[#112540] dark:text-foreground",
        s.root,
        className,
      )}
    >
      <BrandMark className={s.mark} decorative={!markOnly} />
      {markOnly ? null : (
        <span className={cn(s.text, "truncate text-current")}>سوپرحساب</span>
      )}
    </span>
  );
}
