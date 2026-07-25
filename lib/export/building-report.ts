import "server-only";
import type { BuildingDashboardDTO } from "@/app/actions/building";
import {
  CHARGE_STATUS_LABELS,
  MONTH_LABELS_FA,
  formatJalaliYear,
  type ChargeStatusValue,
} from "@/lib/building";
import { formatCurrency } from "@/lib/formatters";
import type { SpaceCurrency } from "@/lib/format";
import { buildExcelBuffer, type ExcelSheetSpec } from "@/lib/export/excel";
import { buildPdfBuffer, type PdfTable } from "@/lib/export/pdf";

function faNum(n: number): string {
  return new Intl.NumberFormat("fa-IR").format(n);
}

function paymentMap(dashboard: BuildingDashboardDTO) {
  const map = new Map<string, Map<number, (typeof dashboard.payments)[0]>>();
  for (const p of dashboard.payments) {
    let byMonth = map.get(p.unitId);
    if (!byMonth) {
      byMonth = new Map();
      map.set(p.unitId, byMonth);
    }
    byMonth.set(p.month, p);
  }
  return map;
}

export function buildingExportSheets(
  dashboard: BuildingDashboardDTO,
  currency: SpaceCurrency,
  spaceName: string,
): ExcelSheetSpec[] {
  const through = Math.max(0, dashboard.throughMonth);
  const pays = paymentMap(dashboard);
  const active = dashboard.units.filter((u) => u.isActive);

  const summary: ExcelSheetSpec = {
    name: "خلاصه",
    headers: ["فیلد", "مقدار"],
    rows: [
      ["ساختمان", spaceName],
      ["سال", formatJalaliYear(dashboard.year)],
      ["تا ماه", MONTH_LABELS_FA[through] ?? String(through)],
      ["پایه ماهانه", dashboard.plan ? formatCurrency(dashboard.plan.baseCharge, currency) : "—"],
      ["مقرر YTD", formatCurrency(dashboard.totals.expectedYtd, currency)],
      ["وصول YTD", formatCurrency(dashboard.totals.collectedYtd, currency)],
      ["معوق", formatCurrency(dashboard.totals.arrearsTotal, currency)],
      ["واحد فعال", faNum(dashboard.totals.activeUnits)],
      ["بدهکار", faNum(dashboard.debtors.length)],
    ],
  };

  const debtors: ExcelSheetSpec = {
    name: "بدهکاران",
    headers: ["واحد", "شارژ ماهانه", "وصول‌شده", "معوق"],
    rows: dashboard.debtors.map((u) => [
      u.name,
      formatCurrency(u.monthlyCharge, currency),
      formatCurrency(u.collected, currency),
      formatCurrency(u.arrears, currency),
    ]),
  };

  const monthHeaders = Array.from({ length: Math.max(through, 1) }, (_, i) =>
    MONTH_LABELS_FA[i + 1] ?? String(i + 1),
  );
  const matrix: ExcelSheetSpec = {
    name: "وصول ماهانه",
    headers: ["واحد", ...monthHeaders, "معوق"],
    rows: active.map((u) => {
      const byMonth = pays.get(u.id);
      const cells = Array.from({ length: Math.max(through, 1) }, (_, i) => {
        const m = i + 1;
        const p = byMonth?.get(m);
        if (!p) return m <= through ? "ثبت‌نشده" : "—";
        const label =
          CHARGE_STATUS_LABELS[p.status as ChargeStatusValue] ?? p.status;
        return `${label} (${formatCurrency(p.amount, currency)})`;
      });
      return [u.name, ...cells, formatCurrency(u.arrears, currency)];
    }),
  };

  return [summary, debtors, matrix];
}

export async function buildBuildingExcel(input: {
  dashboard: BuildingDashboardDTO;
  currency: SpaceCurrency;
  spaceName: string;
}): Promise<Buffer> {
  return buildExcelBuffer({
    creator: "SuperHesab",
    sheets: buildingExportSheets(
      input.dashboard,
      input.currency,
      input.spaceName,
    ),
  });
}

export async function buildBuildingPdf(input: {
  dashboard: BuildingDashboardDTO;
  currency: SpaceCurrency;
  spaceName: string;
}): Promise<Buffer> {
  const sheets = buildingExportSheets(
    input.dashboard,
    input.currency,
    input.spaceName,
  );
  const tables: PdfTable[] = sheets.map((s) => ({
    title: s.name,
    headers: s.headers,
    rows: s.rows.map((r) => r.map((c) => String(c ?? ""))),
  }));
  return buildPdfBuffer({
    title: `گزارش شارژ ${input.spaceName}`,
    subtitle: `سال ${formatJalaliYear(input.dashboard.year)}`,
    tables,
  });
}
