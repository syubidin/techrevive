import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getClientIp, hashIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { rankedProductIds } from "@/lib/search";
import { normalizeQuery } from "@/lib/search-text";
import { publicProductSelect } from "@/lib/products";

export const runtime = "nodejs";

const LIMIT = 6;
const json = (body: unknown, status = 200, cache = "no-store") =>
  NextResponse.json(body, { status, headers: { "Cache-Control": cache } });

/**
 * Saran pencarian (autocomplete). Hanya data publik (publicProductSelect), tanpa modal/margin/supplier.
 * Dibatasi per IP dan kata kunci minimal 2 karakter. Hasil identik untuk semua orang, jadi boleh di-cache CDN sebentar.
 */
export async function GET(req: NextRequest) {
  const q = normalizeQuery(req.nextUrl.searchParams.get("q") ?? "");
  if (q.length < 2) return json({ items: [] });
  const ip = hashIp(getClientIp(req.headers), getEnv().IP_HASH_SECRET);
  const rl = await rateLimit(`suggest:${ip}`, 40, 60);
  if (!rl.allowed) return json({ error: "RATE_LIMITED" }, 429);

  const ids = await rankedProductIds(q, LIMIT);
  if (ids.length === 0) return json({ items: [] }, 200, "public, s-maxage=30, stale-while-revalidate=120");
  const rows = await db.product.findMany({ where: { id: { in: ids }, status: "PUBLISHED", deletedAt: null }, select: publicProductSelect });
  const pos = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
  const items = rows.map((p) => ({
    slug: p.slug, nameId: p.nameId, nameEn: p.nameEn, brand: p.brand.name, price: p.sellPrice,
    image: p.images[0]?.url ?? null, condition: p.condition, grade: p.grade,
  }));
  return json({ items }, 200, "public, s-maxage=30, stale-while-revalidate=120");
}
