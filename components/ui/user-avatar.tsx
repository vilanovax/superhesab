import Image from "next/image";
import { cn } from "@/lib/utils";

const DICEBEAR_HOST = "api.dicebear.com";

function seedHue(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

function initials(name: string | null | undefined, phone: string): string {
  const n = (name ?? "").trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.slice(0, 2);
    }
    return n.slice(0, 2);
  }
  return phone.slice(-2) || "?";
}

function isCustomRemoteAvatar(url: string | null | undefined): url is string {
  if (!url) return false;
  if (url.includes(DICEBEAR_HOST)) return false;
  return (
    url.startsWith("/") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  );
}

type UserAvatarProps = {
  phone: string;
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  alt?: string;
};

/**
 * Local-first avatar: no third-party fetch on the hot path.
 * Dicebear (and missing) URLs render a deterministic initials glyph.
 * Uploaded / custom http(s) URLs use next/image when local, plain img when remote
 * (remote host may vary via S3/R2).
 */
export function UserAvatar({
  phone,
  name,
  avatarUrl,
  size = 40,
  className,
  alt = "",
}: UserAvatarProps) {
  const custom = isCustomRemoteAvatar(avatarUrl) ? avatarUrl : null;

  if (custom?.startsWith("/")) {
    return (
      <Image
        src={custom}
        alt={alt}
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  if (custom) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote host varies (S3/R2)
      <img
        src={custom}
        alt={alt}
        width={size}
        height={size}
        decoding="async"
        loading="lazy"
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const seed = name?.trim() || phone;
  const hue = seedHue(seed);
  const label = initials(name, phone);

  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-tight text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.36)),
        background: `linear-gradient(145deg, hsl(${hue} 42% 48%), hsl(${(hue + 28) % 360} 48% 38%))`,
      }}
    >
      {label}
    </span>
  );
}
