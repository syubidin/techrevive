import { Prisma } from "@prisma/client";
import { db } from "./db";
import { escapeLike, normalizeQuery, tokenize } from "./search-text";

/**
 * Pencarian produk publik. Dua lapis:
 *  1. Semua kata harus muncul (ILIKE) di nama/SKU/merk. Bekerja tanpa ekstensi apa pun.
 *  2. Toleran salah ketik lewat pg_trgm (`<%` memakai indeks GIN trigram). Jika ekstensi belum aktif,
 *     lapis ini dilewati otomatis dan pencarian tetap jalan dengan lapis 1.
 * Hanya mengembalikan id; data tampil tetap lewat publicProductSelect.
 */
export const SEARCH_LIMIT = 300;

function allTokens(tokens: string[]): Prisma.Sql {
  return Prisma.join(
    tokens.map((t) => {
      const like = `%${escapeLike(t)}%`;
      return Prisma.sql`(p."nameId" ILIKE ${like} OR p."nameEn" ILIKE ${like} OR p."sku" ILIKE ${like} OR b."name" ILIKE ${like})`;
    }),
    " AND ",
  );
}

async function run(q: string, tokens: string[], limit: number, fuzzy: boolean): Promise<string[]> {
  const exact = allTokens(tokens);
  const prefix = `${escapeLike(q)}%`;
  const match = fuzzy ? Prisma.sql`(${exact}) OR (${q} <% p."nameId") OR (${q} <% p."nameEn")` : exact;
  const score = fuzzy
    ? Prisma.sql`GREATEST(word_similarity(${q}, p."nameId"), word_similarity(${q}, p."nameEn"))`
    : Prisma.sql`0::float`;
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT p."id"
    FROM "Product" p
    LEFT JOIN "Brand" b ON b."id" = p."brandId"
    WHERE p."status" = 'PUBLISHED' AND p."deletedAt" IS NULL AND (${match})
    ORDER BY
      (CASE WHEN p."sku" ILIKE ${prefix} THEN 3 WHEN p."nameId" ILIKE ${prefix} OR p."nameEn" ILIKE ${prefix} THEN 2 WHEN ${exact} THEN 1 ELSE 0 END) DESC,
      ${score} DESC,
      p."createdAt" DESC, p."id" ASC
    LIMIT ${limit}`;
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
