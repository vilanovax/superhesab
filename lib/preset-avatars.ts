/** Bundled circular avatars — 256×256 WebP under `/public/avatars`. */

export const PRESET_AVATAR_IDS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
] as const;

export type PresetAvatarId = (typeof PRESET_AVATAR_IDS)[number];

export function presetAvatarSrc(id: PresetAvatarId): string {
  return `/avatars/${id}.webp`;
}

export const PRESET_AVATARS = PRESET_AVATAR_IDS.map((id) => ({
  id,
  src: presetAvatarSrc(id),
}));

export const PRESET_AVATAR_PATHS = PRESET_AVATARS.map((a) => a.src);

const PRESET_PATH_SET = new Set<string>(PRESET_AVATAR_PATHS);

export function isPresetAvatarUrl(url: string | null | undefined): boolean {
  return Boolean(url && PRESET_PATH_SET.has(url));
}
