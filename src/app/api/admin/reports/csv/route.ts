import { NextResponse, type NextRequest } from "next/server";
import { audit, can, getAdminOrNull } from "@/lib/admin";
import { fetchReportOrders } from "@/lib/report-query";
import { ordersToCsv, parseRange } from "@/lib/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getAdminOrNull();
  if (!me) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!can(me.role, "report.view")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const q = req.nextUrl.searchParams;
  const from = q.get("from") ?? undefined, to = q.get("to") ?? undefined;
  const range = parseRange(from, to);
  if (!range) return NextResponse.json({ error: "INVALID_RANGE" }, { status: 422 });
  const csv = ordersToCsv(await fetchReportOrders(range.from, range.to));
  await audit(me.id, "report.export", "Report", undefined, { from: from ?? null, to: to ?? null });
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="penjualan-${from}_${to}.csv"`, "Cache-Control": "no-store" } });
}
