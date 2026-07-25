import { NextResponse } from "next/server";
import { authorizeSpaceExport } from "@/lib/export/auth";
import { attachmentDisposition } from "@/lib/export/download-headers";
import { buildSpaceReportExcel, buildSpaceReportPdf } from "@/lib/export/space-report";
import {
  formatJalaliYear,
  monthLabelFa,
  tehranCivilMonth,
  tehranCivilYear,
} from "@/lib/building";
import { jalaliMonthBounds, jalaliYearBounds } from "@/lib/jalali";
import { tehranMonthRange } from "@/lib/personal";
import { getTemplate } from "@/lib/templates/registry";
import { formatDateFaShort } from "@/lib/format";

type RouteContext = { params: Promise<{ id: string }> };

function parseIsoDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request, context: RouteContext) {
  const { id: spaceId } = await context.params;
  const auth = await authorizeSpaceExport(spaceId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "xlsx").toLowerCase();
  const features = getTemplate(auth.space.type).features;

  const fromParam = parseIsoDate(url.searchParams.get("from"));
  const toParam = parseIsoDate(url.searchParams.get("to"));

  let start: Date;
  let end: Date;
  let periodLabel: string;

  if (fromParam && toParam && fromParam <= toParam) {
    start = fromParam;
    end = toParam;
    periodLabel = `${formatDateFaShort(start)} – ${formatDateFaShort(end)}`;
  } else if (features.buildingCharges) {
    const yearRaw = Number.parseInt(
      String(url.searchParams.get("year") ?? "").replace(/\D/g, ""),
      10,
    );
    const year =
      Number.isFinite(yearRaw) && yearRaw >= 1390 && yearRaw <= 1500
        ? yearRaw
        : tehranCivilYear();
    const monthRaw = Number.parseInt(
      String(url.searchParams.get("month") ?? "").replace(/\D/g, ""),
      10,
    );
    const month =
      Number.isFinite(monthRaw) && monthRaw >= 1 && monthRaw <= 12
        ? monthRaw
        : null;
    if (month != null) {
      ({ start, end } = jalaliMonthBounds(year, month));
      periodLabel = `${monthLabelFa(month)} ${formatJalaliYear(year)}`;
    } else {
      ({ start, end } = jalaliYearBounds(year));
      periodLabel = `سال ${formatJalaliYear(year)}`;
    }
  } else {
    const range = tehranMonthRange();
    start = range.start;
    end = range.end;
    periodLabel = `${monthLabelFa(tehranCivilMonth())} ${formatJalaliYear(tehranCivilYear())}`;
  }

  const baseName = `report-${auth.space.name}`;

  const payload = {
    spaceId,
    spaceName: auth.space.name,
    spaceType: auth.space.type,
    currency: auth.space.currency,
    start,
    end,
    periodLabel,
  };

  if (format === "pdf") {
    const buf = await buildSpaceReportPdf(payload);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": attachmentDisposition(baseName, "pdf"),
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "xlsx" || format === "excel") {
    const buf = await buildSpaceReportExcel(payload);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": attachmentDisposition(baseName, "xlsx"),
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(
    { error: "format must be xlsx or pdf" },
    { status: 400 },
  );
}
