/** Client-safe share-scope labels — no DB, no server-only. */

export type BuildingShareScopes = {
  includeExpensesSummary: boolean;
  includeChargesSummary: boolean;
  includeExpensesList: boolean;
  includeChargesUnits: boolean;
  includeAnnouncements: boolean;
};

export const DEFAULT_SHARE_SCOPES: BuildingShareScopes = {
  includeExpensesSummary: true,
  includeChargesSummary: true,
  includeExpensesList: false,
  includeChargesUnits: false,
  includeAnnouncements: true,
};

export const MAX_ACTIVE_BUILDING_SHARE_LINKS = 5;

export const SHARE_SCOPE_META: {
  key: keyof BuildingShareScopes;
  label: string;
  hint: string;
  sensitive: boolean;
}[] = [
  {
    key: "includeExpensesSummary",
    label: "جمع هزینه مشاع",
    hint: "جمع این ماه و امسال، بدون ریز تراکنش",
    sensitive: false,
  },
  {
    key: "includeChargesSummary",
    label: "وضعیت شارژ تجمیعی",
    hint: "درصد وصول و معوق کل — بدون نام واحد",
    sensitive: false,
  },
  {
    key: "includeAnnouncements",
    label: "اعلانات",
    hint: "اعلان‌های فعال مدیر",
    sensitive: false,
  },
  {
    key: "includeExpensesList",
    label: "لیست هزینه‌ها",
    hint: "عنوان و مبلغ هر هزینه امسال",
    sensitive: true,
  },
  {
    key: "includeChargesUnits",
    label: "وضعیت شارژ هر واحد",
    hint: "بدهکار یا تسویه به‌ازای هر واحد",
    sensitive: true,
  },
];

export type BuildingShareLinkDTO = {
  id: string;
  token: string;
  title: string | null;
  scopes: BuildingShareScopes;
  revoked: boolean;
  expiresAt: string | null;
  createdAt: string;
  followCount: number;
};
