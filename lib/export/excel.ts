import "server-only";
import ExcelJS from "exceljs";

export type ExcelSheetSpec = {
  name: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
};

export async function buildExcelBuffer(input: {
  creator?: string;
  sheets: ExcelSheetSpec[];
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = input.creator ?? "SuperHesab";
  wb.created = new Date();

  for (const sheet of input.sheets) {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31) || "Sheet");
    ws.addRow(sheet.headers);
    const header = ws.getRow(1);
    header.font = { bold: true };
    for (const row of sheet.rows) {
      ws.addRow(row.map((c) => (c == null ? "" : c)));
    }
    ws.columns = sheet.headers.map((_, i) => {
      const values = [sheet.headers[i], ...sheet.rows.map((r) => r[i])];
      const width = Math.min(
        40,
        Math.max(
          10,
          ...values.map((v) => String(v ?? "").length + 2),
        ),
      );
      return { width };
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
