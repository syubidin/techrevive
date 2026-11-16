import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "./db";

/** Tag yang di-revalidate setiap kali kategori/merk/spek/produk berubah. */
export const CATALOG_TAG = "catalog-meta";

/** Data filter katalog jarang berubah: simpan 5 menit (dan dibersihkan otomatis saat admin mengubah data). */
export const getCatalogMeta = unstable_cache(
  async () => {
    const [categories, brands, featureRows] = await Promise.all([
      db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, nameId: true, nameEn: true } }),
      db.brand.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
      db.$queryRaw<Array<{ f: string }>>`SELECT DISTINCT unnest("features") AS f FROM "Product" WHERE "status" = 'PUBLISHED' AND "deletedAt" IS NULL ORDER BY 1 LIMIT 200`,
    ]);
    return { categories, brands, features: featureRows.map((r) => r.f) };
  },
  ["catalog-meta"],
  { revalidate: 300, tags: [CATALOG_TAG] },
);

/** Merk & kategori yang punya produk terbit (untuk marquee merk dan kartu kategori di beranda). */
export const getShowcase = unstable_cache(
  async () => {
    const live = { products: { where: { status: "PUBLISHED" as const, deletedAt: null } } };
    const [brands, categories] = await Promise.all([
      db.brand.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true, _count: { select: live } } }),
      db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, nameId: true, nameEn: true, _count: { select: live } } }),
    ]);
    return {
      brands: brands.filter((b) => b._count.products > 0).map(({ slug, name }) => ({ slug, name })),
      categories: categories.filter((c) => c._count.products > 0).map((c) => ({ slug: c.slug, nameId: c.nameId, nameEn: c.nameEn, count: c._count.products })),
    };
  },
  ["showcase"],
  { revalidate: 300, tags: [CATALOG_TAG] },
);

export const getSpecDefs = unstable_cache(
  async (categorySlug: string) => db.specDefinition.findMany({ where: { category: { slug: categorySlug } }, orderBy: { sortOrder: "asc" } }),
  ["spec-defs"],
  { revalidate: 300, tags: [CATALOG_TAG] },
);

/**
 * Menghapus cache filter katalog. Kompatibel dengan Next 15 (revalidateTag(tag)) maupun Next 16
 * (revalidateTag(tag, profil)); `{ expire: 0 }` = kedaluwarsa seketika agar admin langsung melihat perubahannya.
 */
export function invalidateCatalog(): void {
  (revalidateTag as unknown as (tag: string, profile?: { expire: number }) => void)(CATALOG_TAG, { expire: 0 });
}
