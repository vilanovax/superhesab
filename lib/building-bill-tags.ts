/**
 * Sub-tags under BUILDING_BILLS (قبوض) — presets + per-space custom tags in localStorage.
 */

const STORAGE_PREFIX = "superhesab:building-bill-tags:";
const MAX_CUSTOM = 16;

/** Always available under قبوض. */
export const DEFAULT_BILL_TAGS = [
  "آب",
  "برق",
  "گاز",
  "اینترنت",
] as const;

export type DefaultBillTag = (typeof DEFAULT_BILL_TAGS)[number];

/** Keywords in title → suggested tag (longer first). */
const TITLE_TAG_HINTS: { tag: string; needles: readonly string[] }[] = [
  { tag: "اینترنت", needles: ["اینترنت", "adsl", "فیبر", "مودم", "wifi", "وای‌فای", "وای فای"] },
  { tag: "برق", needles: ["برق", "کنتور برق"] },
  { tag: "گاز", needles: ["گاز", "کنتور گاز"] },
  { tag: "آب", needles: ["آب", "فاضلاب", "کنتور آب"] },
];

function storageKey(spaceId: string): string {
  return `${STORAGE_PREFIX}${spaceId}`;
}

export function loadCustomBillTags(spaceId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(spaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const defaults = new Set<string>(DEFAULT_BILL_TAGS);
    return parsed
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !defaults.has(s))
      .slice(0, MAX_CUSTOM);
  } catch {
    return [];
  }
}

export function rememberCustomBillTag(
  spaceId: string,
  label: string,
): string[] {
  const trimmed = label.trim();
  if (!trimmed) return loadCustomBillTags(spaceId);
  if ((DEFAULT_BILL_TAGS as readonly string[]).includes(trimmed)) {
    return loadCustomBillTags(spaceId);
  }
  const prev = loadCustomBillTags(spaceId).filter((x) => x !== trimmed);
  const next = [trimmed, ...prev].slice(0, MAX_CUSTOM);
  try {
    window.localStorage.setItem(storageKey(spaceId), JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}

export function removeCustomBillTag(
  spaceId: string,
  label: string,
): string[] {
  const next = loadCustomBillTags(spaceId).filter((x) => x !== label.trim());
  try {
    window.localStorage.setItem(storageKey(spaceId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Infer a bill tag from a Persian expense title, if any. */
export function guessBillTagFromTitle(title: string): string | null {
  const n = title
    .trim()
    .toLowerCase()
    .replace(/\u200c/g, "")
    .replace(/\s+/g, " ");
  if (!n) return null;
  for (const { tag, needles } of TITLE_TAG_HINTS) {
    for (const needle of needles) {
      const key = needle.toLowerCase().replace(/\u200c/g, "");
      if (key && n.includes(key)) return tag;
    }
  }
  return null;
}

/** Display line: «قبوض · آب» or just «قبوض». */
export function formatCategoryWithTag(
  categoryLabel: string,
  tag: string | null | undefined,
): string {
  const t = tag?.trim();
  if (!t) return categoryLabel;
  if (t === categoryLabel) return categoryLabel;
  return `${categoryLabel} · ${t}`;
}
