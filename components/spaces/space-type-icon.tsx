/**
 * Space type glyphs for the home list — icon + tint per template.
 * Keyed by canonical Space.type so PERSONAL follows FAMILY.
 */

import { canonicalizeSpaceType } from "@/lib/templates/registry";
import type { SpaceType } from "@/types";

type IconProps = { className?: string };

function Svg({
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** سفر — suitcase. */
function TripIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" />
      <path d="M8.5 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v2M9.5 20V7.5M14.5 20V7.5" />
    </Svg>
  );
}

/** حساب مشترک — two overlapping people. */
function PartnerIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3.25 3.25 0 0 1 0 5.6M17 14.6a5.5 5.5 0 0 1 3.5 4.9" />
    </Svg>
  );
}

/** خانه — house. */
function HomeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z" />
      <path d="M9.5 20.5v-6h5v6" />
    </Svg>
  );
}

/** ساختمان — tower with windows. */
function BuildingIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 20.5V4.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" />
      <path d="M16 10.5h2.5a1 1 0 0 1 1 1v9M3 20.5h18" />
      <path d="M8.5 7.5h1M12 7.5h1M8.5 11.5h1M12 11.5h1M8.5 15.5h1M12 15.5h1" />
    </Svg>
  );
}

/** صندوق نوبتی — safe box with rotating dial. */
function FundIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="12" cy="12" r="3.25" />
      <path d="M12 8.75V12l2.2 1.5" />
    </Svg>
  );
}

const ICONS: Record<SpaceType, (props: IconProps) => React.ReactElement> = {
  TRIP: TripIcon,
  PARTNER: PartnerIcon,
  PERSONAL: HomeIcon,
  FAMILY: HomeIcon,
  BUILDING: BuildingIcon,
  FUND: FundIcon,
};

/**
 * Tint per template, all derived from existing tokens so Trip/Partner
 * retheming keeps working. Kept low-saturation: the balance number is the
 * loudest thing on the card, not the badge.
 */
const TINTS: Record<SpaceType, string> = {
  TRIP: "bg-secondary text-primary",
  PARTNER: "bg-accent text-accent-foreground",
  PERSONAL: "bg-success-soft text-success",
  FAMILY: "bg-success-soft text-success",
  BUILDING: "bg-muted text-foreground/75",
  FUND: "bg-primary/12 text-primary",
};

/** Left rail accent — one thin stripe per template. */
const ACCENTS: Record<SpaceType, string> = {
  TRIP: "bg-primary",
  PARTNER: "bg-highlight",
  PERSONAL: "bg-success",
  FAMILY: "bg-success",
  BUILDING: "bg-ink",
  FUND: "bg-primary/70",
};

export function spaceTypeTint(type: SpaceType): string {
  return TINTS[canonicalizeSpaceType(type)] ?? TINTS.TRIP;
}

export function spaceTypeAccent(type: SpaceType): string {
  return ACCENTS[canonicalizeSpaceType(type)] ?? ACCENTS.TRIP;
}

export function SpaceTypeIcon({
  type,
  className,
}: {
  type: SpaceType;
  className?: string;
}) {
  const Icon = ICONS[canonicalizeSpaceType(type)] ?? TripIcon;
  return <Icon className={className} />;
}
