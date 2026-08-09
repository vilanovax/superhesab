/**
 * Persist space-scoped custom category labels in localStorage for quick reuse.
 * Schema v1 — migrate from legacy unversioned keys on read.
 */

const STORAGE_VERSION = 1;
const STORAGE_PREFIX = `superhesab:custom-categories:v${STORAGE_VERSION}:`;
const LEGACY_PREFIX = "superhesab:custom-categories:";
const MAX_CUSTOM = 12;

function storageKey(spaceId: string): string {
  return `${STORAGE_PREFIX}${spaceId}`;
}

function legacyKey(spaceId: string): string {
  return `${LEGACY_PREFIX}${spaceId}`;
}

function parseCategoryList(raw: string | null): string[] {
  if (!raw) return [];
  try {
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

export function loadCustomCategories(spaceId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const key = storageKey(spaceId);
    const current = parseCategoryList(window.localStorage.getItem(key));
    if (current.length > 0) return current;

    const legacy = parseCategoryList(
      window.localStorage.getItem(legacyKey(spaceId)),
    );
    if (legacy.length > 0) {
      window.localStorage.setItem(key, JSON.stringify(legacy));
      window.localStorage.removeItem(legacyKey(spaceId));
    }
    return legacy;
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
    window.localStorage.removeItem(legacyKey(spaceId));
  } catch {
    /* ignore quota */
  }
  return next;
}
