export type ResidentTab =
  | "announcements"
  | "payments"
  | "expenses"
  | "suggestions";

export function parseResidentTab(
  raw: string | null | undefined,
): ResidentTab {
  if (
    raw === "payments" ||
    raw === "expenses" ||
    raw === "suggestions" ||
    raw === "announcements"
  ) {
    return raw;
  }
  return "announcements";
}
