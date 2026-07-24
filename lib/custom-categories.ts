/**
 * Persist space-scoped custom category labels in localStorage for quick reuse.
 */

const STORAGE_PREFIX = "superhesab:custom-categories:";
const MAX_CUSTOM = 12;

function storageKey(spaceId: string): string {
  return `${STORAGE_PREFIX}${spaceId}`;
}

export function loadCustomCategories(spaceId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(spaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_CUSTOM);
  } catch {
    return [];
  }
}

export function rememberCustomCategory(
  spaceId: string,
  label: string,
): string[] {
  const trimmed = label.trim();
  if (!trimmed) return loadCustomCategories(spaceId);
  const prev = loadCustomCategories(spaceId).filter(
    (x) => x !== trimmed,
  );
  const next = [trimmed, ...prev].slice(0, MAX_CUSTOM);
  try {
    window.localStorage.setItem(storageKey(spaceId), JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}
