import { NextResponse, type NextRequest } from "next/server";
import { can, getAdminOrNull } from "@/lib/admin";
import { db } from "@/lib/db";
import { templateCsv } from "@/lib/product-import";
import { buildTemplateXlsx } from "@/lib/import-file";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getAdminOrNull();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });
  if (!can(me.role, "product.manage")) return new NextResponse("Forbidden", { status: 403 });
  const headers = { "Cache-Control": "no-store" };

  if (req.nextUrl.searchParams.get("format") === "xlsx") {
    const [categories, brands] = await Promise.all([
      db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { nameId: true, slug: true, specs: { orderBy: { sortOrder: "asc" }, select: { key: true, type: true, options: true } } } }),
      db.brand.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    ]);
    const bytes = await buildTemplateXlsx({ categories, brands: brands.map((b) => b.name) });
    return new NextResponse(bytes as unknown as BodyInit, {
      headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="template-produk-techrevive.xlsx"' },
    });
  }
  return new NextResponse(templateCsv(), {
    headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="template-produk-techrevive.csv"' },
  });
}
