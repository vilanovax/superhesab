export type SpaceType = "TRIP" | "PARTNER" | "PERSONAL" | "FAMILY";
export type SpaceRole = "OWNER" | "EDITOR" | "VIEWER";
export type SettlementStatus = "PENDING" | "COMPLETED";
export type { SpaceCurrency } from "@/lib/format";

export type SplitMode = "equal" | "exact";

export type NetBalance = {
  userId: string;
  /** Positive = others owe this user; negative = this user owes others */
  amount: number;
};

export type SuggestedSettlement = {
  fromUserId: string;
  toUserId: string;
  amount: number;
};
