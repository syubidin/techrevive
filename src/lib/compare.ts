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

/** Arah "lebih unggul" per spek. Spek yang tidak terdaftar (ukuran layar, prosesor, dll.) bersifat selera, jadi tidak ditandai. */
export const SPEC_RULES: Readonly<Record<string, "higher">> = {
  ram_gb: "higher",
  storage_gb: "higher",
  dedicated_gpu: "higher",
  touchscreen: "higher",
  esim: "higher",
};
const GRADE_SCORE: Record<string, number> = { A: 3, B: 2, C: 1 };
const CONDITION_SCORE: Record<string, number> = { REFURBISHED: 2, USED: 1 };

/** Ubah nilai mentah menjadi skor angka; null bila tidak diketahui atau tidak bisa dibandingkan. */
export function scoreOf(kind: "number" | "boolean" | "grade" | "condition", v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (kind === "grade") return GRADE_SCORE[String(v)] ?? null;
  if (kind === "condition") return CONDITION_SCORE[String(v)] ?? null;
  if (kind === "boolean") return v === true || v === "true" || v === 1 ? 1 : v === false || v === "false" || v === 0 ? 0 : null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Indeks yang paling unggul pada satu baris. Tidak ada tanda bila: kurang dari 2 nilai diketahui, semua nilai sama
 * (seri total), atau nilai yang diketahui hanya satu. Produk dengan nilai kosong tidak pernah dianggap unggul.
 */
export function bestIndexes(scores: Array<number | null>, dir: "higher" | "lower" = "higher"): number[] {
  const known = scores.filter((s): s is number => s !== null);
  if (known.length < 2 || new Set(known).size < 2) return [];
  const best = dir === "higher" ? Math.max(...known) : Math.min(...known);
  return scores.flatMap((s, i) => (s === best ? [i] : []));
}

/** Jumlah baris yang dimenangkan tiap produk (untuk ringkasan di kepala kolom). */
export function winCounts(rows: Array<number[] | undefined>, n: number): number[] {
  const out = Array<number>(n).fill(0);
  for (const r of rows) for (const i of r ?? []) if (i >= 0 && i < n) out[i] += 1;
  return out;
}
