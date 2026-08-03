/** Human-readable byte size (fa-IR digits via Intl). */
export function formatAdminBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) {
    return `${new Intl.NumberFormat("fa-IR").format(bytes)} B`;
  }
  const units = ["KB", "MB", "GB", "TB"] as const;
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const formatted = new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
  return `${formatted} ${units[unitIndex]}`;
}

/** Compact fa-IR date for admin tables. */
export function formatAdminDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatAdminDateTime(
  value: Date | string | null | undefined,
): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
