import { NextResponse } from "next/server";
import { getBuildingDashboard } from "@/app/actions/building";
import {
  buildBuildingExcel,
  buildBuildingPdf,
} from "@/lib/export/building-report";
import { authorizeSpaceExport } from "@/lib/export/auth";
import { attachmentDisposition } from "@/lib/export/download-headers";
import { tehranCivilYear } from "@/lib/building";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id: spaceId } = await context.params;
  const auth = await authorizeSpaceExport(spaceId, {
    needMutate: true,
    buildingOnly: true,
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "xlsx").toLowerCase();
  const yearRaw = Number.parseInt(
    String(url.searchParams.get("year") ?? "").replace(/\D/g, ""),
    10,
  );
  const year =
    Number.isFinite(yearRaw) && yearRaw >= 1390 && yearRaw <= 1500
      ? yearRaw
      : tehranCivilYear();

  const dashboard = await getBuildingDashboard(spaceId, year);
  if (!dashboard) {
    return NextResponse.json({ error: "dashboard unavailable" }, { status: 404 });
  }

  const baseName = `building-${auth.space.name}-${year}`;

  if (format === "pdf") {
    const buf = await buildBuildingPdf({
      dashboard,
      currency: auth.space.currency,
      spaceName: auth.space.name,
    });
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
    const buf = await buildBuildingExcel({
      dashboard,
      currency: auth.space.currency,
      spaceName: auth.space.name,
    });
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
