/** Aturan daftar perbandingan (murni, diuji). Disimpan di browser; URL /compare?p=slug1,slug2 bisa dibagikan. */
export const COMPARE_MAX = 4;
export const COMPARE_MIN = 2;
const slugRe = /^[a-z0-9][a-z0-9-]{0,119}$/;

/** Membersihkan daftar slug dari URL/penyimpanan: hanya slug valid, unik, maksimal COMPARE_MAX. */
export function parseSlugs(raw: string | string[] | null | undefined): string[] {
  const parts = (Array.isArray(raw) ? raw : [raw ?? ""]).flatMap((v) => v.split(","));
  return [...new Set(parts.map((s) => s.trim().toLowerCase()).filter((s) => slugRe.test(s)))].slice(0, COMPARE_MAX);
}

export type ToggleResult = { slugs: string[]; added: boolean; full: boolean };
/** Tambah/hapus satu slug. Saat penuh, penambahan ditolak (full = true) dan daftar tidak berubah. */
export function toggleSlug(list: string[], slug: string): ToggleResult {
  if (list.includes(slug)) return { slugs: list.filter((s) => s !== slug), added: false, full: false };
  if (list.length >= COMPARE_MAX) return { slugs: list, added: false, full: true };
  return { slugs: [...list, slug], added: true, full: false };
}

/** Apakah nilai spek berbeda antar produk (untuk menyorot baris yang berbeda). Kosong dianggap nilai tersendiri. */
export function rowDiffers(values: Array<string | number | boolean | null | undefined>): boolean {
  const norm = values.map((v) => (v === null || v === undefined || v === "" ? "\u0000" : String(v)));
  return new Set(norm).size > 1;
}

/** Indeks harga terendah (semua indeks bila seri); kosong jika kurang dari 2 harga. */
export function cheapestIndexes(prices: number[]): number[] {
  if (prices.length < 2) return [];
  const min = Math.min(...prices);
  return prices.flatMap((p, i) => (p === min ? [i] : []));
}
