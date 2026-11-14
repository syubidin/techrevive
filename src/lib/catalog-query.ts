import type { Prisma } from "@prisma/client";

/**
 * Filter katalog dari URL, mis.:
 *   /id/katalog?category=laptop&brand=lenovo,dell&condition=REFURBISHED&grade=A,B
 *     &minPrice=3000000&maxPrice=8000000&feature=touchscreen&s.ram_gb=16-&s.cpu_family=i7,i5
 *
 * Kunci spek `s.*` HANYA diterima jika ada di whitelist SpecDefinition (anti injeksi path JSON).
 */
export interface SpecDef {
  key: string;
  type: "NUMBER" | "ENUM" | "BOOLEAN";
}

export const PAGE_SIZE = 24;
const MAX_PAGE = 200;
const MAX_SPEC_FILTERS = 12;
const MAX_LIST = 10;

const CONDITIONS = ["REFURBISHED", "USED"] as const;
const GRADES = ["A", "B", "C"] as const;
const AVAIL = ["CHECK", "VERIFIED", "PREORDER"] as const;
const SORTS = ["newest", "price_asc", "price_desc"] as const;
type Sort = (typeof SORTS)[number];

const slugRe = /^[a-z0-9][a-z0-9-]{0,59}$/;
const featureRe = /^[a-z0-9][a-z0-9-]{0,39}$/;

function list(sp: URLSearchParams, key: string): string[] {
  return sp
    .getAll(key)
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, MAX_LIST);
}

function pick<T extends string>(values: string[], allowed: readonly T[]): T[] {
  return values.filter((v): v is T => (allowed as readonly string[]).includes(v));
}

function int(value: string | null, min: number, max: number): number | undefined {
  if (!value || !/^\d{1,10}$/.test(value)) return undefined;
  const n = Number(value);
  return n >= min && n <= max ? n : undefined;
}

const NUM = "(\\d{1,9}(?:\\.\\d{1,2})?)";
const rangeRe = new RegExp(`^${NUM}?-${NUM}?$`);

export function buildCatalogQuery(sp: URLSearchParams, specDefs: SpecDef[]) {
  const and: Prisma.ProductWhereInput[] = [{ status: "PUBLISHED", deletedAt: null }];

  const q = (sp.get("q") ?? "").trim().slice(0, 60);
  if (q) {
    and.push({
      OR: [
        { nameId: { contains: q, mode: "insensitive" } },
        { nameEn: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  const categories = list(sp, "category").filter((s) => slugRe.test(s));
  if (categories.length) and.push({ category: { slug: { in: categories } } });

  const brands = list(sp, "brand").filter((s) => slugRe.test(s));
  if (brands.length) and.push({ brand: { slug: { in: brands } } });

  const conditions = pick(list(sp, "condition").map((v) => v.toUpperCase()), CONDITIONS);
  if (conditions.length) and.push({ condition: { in: conditions } });

  const grades = pick(list(sp, "grade").map((v) => v.toUpperCase()), GRADES);
  if (grades.length) and.push({ grade: { in: grades } });

  const avail = pick(list(sp, "availability").map((v) => v.toUpperCase()), AVAIL);
  if (avail.length) and.push({ availability: { in: avail } });

  const features = list(sp, "feature").filter((s) => featureRe.test(s));
  if (features.length) and.push({ features: { hasEvery: features } });

  const minPrice = int(sp.get("minPrice"), 0, 2_000_000_000);
  const maxPrice = int(sp.get("maxPrice"), 0, 2_000_000_000);
  if (minPrice !== undefined || maxPrice !== undefined) {
    and.push({ sellPrice: { gte: minPrice, lte: maxPrice } });
  }

  const batteryMin = int(sp.get("battery"), 0, 100);
  if (batteryMin !== undefined) and.push({ batteryHealth: { gte: batteryMin } });

  // Spek terstruktur (whitelist)
  const defs = new Map(specDefs.map((d) => [d.key, d]));
  let specCount = 0;
  for (const [param] of sp) {
    if (!param.startsWith("s.") || specCount >= MAX_SPEC_FILTERS) continue;
    let key = param.slice(2);
    let bound: "min" | "max" | null = null;
    if (key.endsWith(".min")) { bound = "min"; key = key.slice(0, -4); }
    else if (key.endsWith(".max")) { bound = "max"; key = key.slice(0, -4); }
    const def = defs.get(key);
    if (!def) continue;
    const raw = (sp.get(param) ?? "").trim().slice(0, 120);
    if (!raw) continue;
    specCount += 1;

    // Form HTML mengirim batas sebagai s.<key>.min / s.<key>.max (tanpa JS).
    if (bound && def.type === "NUMBER") {
      if (/^\d{1,9}(?:\.\d{1,2})?$/.test(raw)) {
       and.push({ attributes: bound === "min" ? { path: [key], gte: Number(raw) } : { path: [key], lte: Number(raw) } });
      }
      continue;
    }

    if (def.type === "BOOLEAN") {
      if (raw === "1" || raw === "true") and.push({ attributes: { path: [key], equals: true } });
    } else if (def.type === "ENUM") {
      const vals = raw.split(",").map((v) => v.trim()).filter(Boolean).slice(0, MAX_LIST);
      if (vals.length) and.push({ OR: vals.map((v) => ({ attributes: { path: [key], equals: v } })) });
    } else {
      const m = rangeRe.exec(raw);
      if (m) {
        const [, lo, hi] = m;
        if (lo) and.push({ attributes: { path: [key], gte: Number(lo) } });
        if (hi) and.push({ attributes: { path: [key], lte: Number(hi) } });
      } else if (/^\d{1,9}(?:\.\d{1,2})?$/.test(raw)) {
        and.push({ attributes: { path: [key], equals: Number(raw) } });
      }
    }
  }

  const sort: Sort = (SORTS as readonly string[]).includes(sp.get("sort") ?? "")
    ? (sp.get("sort") as Sort)
    : "newest";
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sort === "price_asc"
      ? [{ sellPrice: "asc" }, { id: "asc" }]
      : sort === "price_desc"
        ? [{ sellPrice: "desc" }, { id: "asc" }]
        : [{ createdAt: "desc" }, { id: "asc" }];

  const page = int(sp.get("page"), 1, MAX_PAGE) ?? 1;

  return { where: { AND: and } satisfies Prisma.ProductWhereInput, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, page };
}
