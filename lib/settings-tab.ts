export type SettingsTab = "look" | "account" | "data";

export function parseSettingsTab(
  raw: string | null | undefined,
): SettingsTab {
  if (raw === "account" || raw === "data" || raw === "look") return raw;
  return "look";
}
