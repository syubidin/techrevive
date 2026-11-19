import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { site } from "@/config/site";
import { abs, languageAlternates } from "@/lib/seo";

export const revalidate = 3600;

// Batas sitemap: 50.000 URL per file. Tiap produk menghasilkan 2 URL (id, en), jadi 20.000 produk = 40.000 URL.
// Bila katalog melewati ini, ganti ke generateSitemaps() (sitemap bertingkat). Lihat docs/ARCHITECTURE.md.
const MAX_PRODUCTS = 20_000;
const BATCH = 2000;

const STATIC_PATHS = ["", "/catalog", "/about", "/how-it-works", "/faq", "/contact", "/policy"];

const entry = (path: string, query = "", extra: Partial<MetadataRoute.Sitemap[number]> = {}): MetadataRoute.Sitemap =>
  site.locales.map((l) => ({
    url: abs(`/${l}${path}${query}`),
    alternates: { languages: Object.fromEntries(Object.entries(languageAlternates(path, query)).map(([k, v]) => [k, abs(v)])) },
    ...extra,
  }));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const out: MetadataRoute.Sitemap = STATIC_PATHS.flatMap((p) => entry(p, "", { changeFrequency: p === "" || p === "/catalog" ? "daily" : "monthly", priority: p === "" ? 1 : p === "/catalog" ? 0.9 : 0.5 }));

  // Halaman kategori (hanya yang punya produk terbit).
  const cats = await db.category.findMany({ where: { products: { some: { status: "PUBLISHED", deletedAt: null } } }, select: { slug: true } }).catch(() => []);
  for (const c of cats) out.push(...entry("/catalog", `?category=${c.slug}`, { changeFrequency: "daily", priority: 0.8 }));

  // Produk dibaca bertahap (cursor) agar memori stabil berapa pun jumlah datanya.
  let cursor: string | undefined;
  let total = 0;
  while (total < MAX_PRODUCTS) {
    const rows = await db.product
      .findMany({ where: { status: "PUBLISHED", deletedAt: null }, orderBy: { id: "asc" }, take: BATCH, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, slug: true, updatedAt: true } })
      .catch(() => []);
    for (const r of rows) out.push(...entry(`/product/${r.slug}`, "", { lastModified: r.updatedAt, changeFrequency: "weekly", priority: 0.7 }));
    total += rows.length;
    if (rows.length < BATCH) break;
    cursor = rows[rows.length - 1]!.id;
  }
  return out;
}
