import { cn } from "@/lib/utils";

const NAVY = "#112540";
const GREEN = "#02a56c";

type BrandMarkProps = {
  className?: string;
  /** Decorative when paired with visible wordmark — hides from AT. */
  decorative?: boolean;
  title?: string;
};

/**
 * SuperHesab mark — three rounded blocks with a plus in negative space.
 * Scales crisply; keep at least ~16px for legibility.
 */
export function BrandMark({
  className,
  decorative = false,
  title = "سوپرحساب",
}: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
    >
      <rect x="2" y="2" width="27" height="60" rx="10" fill={NAVY} />
      <rect x="35" y="2" width="27" height="27" rx="10" fill={GREEN} />
      <rect x="35" y="35" width="27" height="27" rx="10" fill={NAVY} />
    </svg>
  );
}
