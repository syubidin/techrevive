import { Prisma } from "@prisma/client";
import { db } from "./db";
import { canFuzzy, escapeLike, FUZZY_THRESHOLD, normalizeQuery, tokenize } from "./search-text";

/**
 * Pencarian produk publik. Dua lapis:
 *  1. Setiap kata harus muncul (ILIKE) di nama/SKU/merk. Bekerja tanpa ekstensi apa pun.
 *  2. Toleran salah ketik lewat pg_trgm, dinilai PER KATA: kata yang cukup panjang boleh cocok secara fuzzy
 *     dengan nama atau merk (operator `<%` memakai indeks GIN trigram). Jika ekstensi belum aktif, lapis ini
 *     dilewati otomatis dan pencarian tetap jalan dengan lapis 1.
 * Hanya mengembalikan id; data tampil tetap lewat publicProductSelect.
 */
export const SEARCH_LIMIT = 300;

function tokenMatch(t: string, fuzzy: boolean): Prisma.Sql {
  const like = `%${escapeLike(t)}%`;
  const exact = Prisma.sql`p."nameId" ILIKE ${like} OR p."nameEn" ILIKE ${like} OR p."sku" ILIKE ${like} OR b."name" ILIKE ${like}`;
  if (!fuzzy || !canFuzzy(t)) return Prisma.sql`(${exact})`;
  return Prisma.sql`(${exact} OR ${t} <% p."nameId" OR ${t} <% p."nameEn" OR ${t} <% b."name")`;
}

function tokenScore(t: string): Prisma.Sql {
  return Prisma.sql`GREATEST(word_similarity(${t}, p."nameId"), word_similarity(${t}, p."nameEn"), word_similarity(${t}, COALESCE(b."name", '')))`;
}

async function run(q: string, tokens: string[], limit: number, fuzzy: boolean): Promise<string[]> {
  const exact = Prisma.join(
    tokens.map((t) => {
      const like = `%${escapeLike(t)}%`;
      return Prisma.sql`(p."nameId" ILIKE ${like} OR p."nameEn" ILIKE ${like} OR p."sku" ILIKE ${like} OR b."name" ILIKE ${like})`;
    }),
    " AND ",
  );
  const match = Prisma.join(tokens.map((t) => tokenMatch(t, fuzzy)), " AND ");
  const prefix = `${escapeLike(q)}%`;
  const score = fuzzy ? Prisma.join(tokens.map(tokenScore), " + ") : Prisma.sql`0::float`;
  const query = Prisma.sql`
    SELECT p."id"
    FROM "Product" p
    LEFT JOIN "Brand" b ON b."id" = p."brandId"
    WHERE p."status" = 'PUBLISHED' AND p."deletedAt" IS NULL AND (${match})
    ORDER BY
      (CASE WHEN p."sku" ILIKE ${prefix} THEN 3 WHEN p."nameId" ILIKE ${prefix} OR p."nameEn" ILIKE ${prefix} THEN 2 WHEN ${exact} THEN 1 ELSE 0 END) DESC,
      ${score} DESC,
      p."createdAt" DESC, p."id" ASC
    LIMIT ${limit}`;
  if (!fuzzy) return (await db.$queryRaw<Array<{ id: string }>>(query)).map((r) => r.id);
  // Ambang kemiripan hanya berlaku di transaksi ini (set_config ... true), aman untuk koneksi pooled.
  const [, rows] = await db.$transaction([
    db.$queryRaw`SELECT set_config('pg_trgm.word_similarity_threshold', ${String(FUZZY_THRESHOLD)}, true)`,
    db.$queryRaw<Array<{ id: string }>>(query),
  ]);
  return rows.map((r) => r.id);
}

export async function rankedProductIds(raw: string, limit = SEARCH_LIMIT): Promise<string[]> {
  const q = normalizeQuery(raw);
  if (!q) return [];
  const tokens = tokenize(q);
  if (tokens.length === 0) return [];
  try {
    return await run(q, tokens, limit, true);
  } catch {
    // pg_trgm belum aktif (atau versi lama): pakai pencarian ILIKE saja.
    try {
      return await run(q, tokens, limit, false);
    } catch (e) {
      console.error(JSON.stringify({ evt: "search.error", message: e instanceof Error ? e.message : "unknown" }));
      return [];
    }
  }
}
