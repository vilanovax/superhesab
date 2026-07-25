import "server-only";

export type PdfTable = {
  title?: string;
  headers: string[];
  rows: string[][];
};

/** Map Persian digits → Latin; drop other non-ASCII (Excel keeps full Persian). */
function asciiForPdf(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfString(value: string): string {
  const s = asciiForPdf(value).slice(0, 120);
  return `(${s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;
}

/**
 * Minimal multi-page PDF tables without pdfkit (Turbopack-safe).
 * Labels are ASCII-sanitized; use Excel export for full Persian text.
 */
export async function buildPdfBuffer(input: {
  title: string;
  subtitle?: string;
  tables: PdfTable[];
}): Promise<Buffer> {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const lineHeight = 12;
  const contentWidth = pageWidth - margin * 2;

  type Line =
    | { kind: "title"; text: string; size: number }
    | { kind: "row"; cells: string[]; colW: number; bold?: boolean };

  const lines: Line[] = [];
  lines.push({ kind: "title", text: input.title, size: 14 });
  if (input.subtitle) {
    lines.push({ kind: "title", text: input.subtitle, size: 10 });
  }

  for (const table of input.tables) {
    if (table.title) {
      lines.push({ kind: "title", text: table.title, size: 11 });
    }
    const colCount = Math.max(1, table.headers.length);
    const colW = contentWidth / colCount;
    lines.push({ kind: "row", cells: table.headers, colW, bold: true });
    for (const row of table.rows) {
      lines.push({ kind: "row", cells: row, colW });
    }
    lines.push({ kind: "title", text: " ", size: 8 });
  }

  const pages: Line[][] = [];
  let current: Line[] = [];
  let y = pageHeight - margin;
  for (const line of lines) {
    const need = line.kind === "title" ? line.size + 6 : lineHeight + 2;
    if (y - need < margin) {
      pages.push(current);
      current = [];
      y = pageHeight - margin;
    }
    current.push(line);
    y -= need;
  }
  if (current.length) pages.push(current);
  if (pages.length === 0) pages.push([]);

  const objects: string[] = [];
  const offsets: number[] = [0];
  const addObj = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontObj = addObj(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  const fontBoldObj = addObj(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );

  const pageIds: number[] = [];

  for (const pageLines of pages) {
    const ops: string[] = [];
    let cursorY = pageHeight - margin;

    for (const line of pageLines) {
      if (line.kind === "title") {
        ops.push("BT");
        ops.push(`/F${fontObj} ${line.size} Tf`);
        ops.push(`${margin.toFixed(2)} ${(cursorY - line.size).toFixed(2)} Td`);
        ops.push(`${pdfString(line.text)} Tj`);
        ops.push("ET");
        cursorY -= line.size + 6;
        continue;
      }

      const fontRef = line.bold ? fontBoldObj : fontObj;
      const size = 8;
      for (let i = 0; i < line.cells.length; i++) {
        const cell = line.cells[i] ?? "";
        const x = margin + i * line.colW;
        ops.push("BT");
        ops.push(`/F${fontRef} ${size} Tf`);
        ops.push(`${x.toFixed(2)} ${(cursorY - size).toFixed(2)} Td`);
        ops.push(`${pdfString(cell)} Tj`);
        ops.push("ET");
      }
      cursorY -= lineHeight + 2;
    }

    const stream = ops.join("\n");
    const contentId = addObj(
      `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    );

    const pageId = addObj(
      [
        "<< /Type /Page",
        "/Parent 0 0 R",
        `/MediaBox [0 0 ${pageWidth} ${pageHeight}]`,
        `/Contents ${contentId} 0 R`,
        `/Resources << /Font << /F${fontObj} ${fontObj} 0 R /F${fontBoldObj} ${fontBoldObj} 0 R >> >>`,
        ">>",
      ].join("\n"),
    );
    pageIds.push(pageId);
  }

  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  const pagesObj = addObj(
    `<< /Type /Pages /Kids [${kids}] /Count ${pageIds.length} >>`,
  );

  for (const pageId of pageIds) {
    const idx = pageId - 1;
    objects[idx] = objects[idx].replace(
      "/Parent 0 0 R",
      `/Parent ${pagesObj} 0 R`,
    );
  }

  const catalog = addObj(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  for (let i = 0; i < objects.length; i++) {
    offsets[i + 1] = Buffer.byteLength(pdf, "utf8");
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\n`;
  pdf += `startxref\n${xrefPos}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}
