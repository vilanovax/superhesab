import type { SpaceRole } from "@/types";

export function canMutateMoney(role: SpaceRole): boolean {
  return role === "OWNER" || role === "EDITOR";
}

export function canManageMembers(role: SpaceRole): boolean {
  return role === "OWNER";
}

export function canEditChecklist(role: SpaceRole): boolean {
  return role === "OWNER" || role === "EDITOR";
}

export function isViewer(role: SpaceRole): boolean {
  return role === "VIEWER";
}

export function roleLabelFa(role: SpaceRole): string {
  switch (role) {
    case "OWNER":
      return "مالک";
    case "EDITOR":
      return "ویرایشگر";
    case "VIEWER":
      return "ناظر";
  }
}
