/** Pembersihan kata kunci pencarian (murni, diuji). Dipakai server dan klien agar perilakunya sama. */
export const SEARCH_MAX_LEN = 60;
export const SEARCH_MAX_TOKENS = 6;

/** Huruf kecil, hanya huruf/angka/spasi/titik/strip, spasi dirapatkan. Hasil kosong berarti tidak ada kata kunci. */
export function normalizeQuery(raw: string): string {
  return raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SEARCH_MAX_LEN)
    .trim();
}

/** Kata-kata unik (urutan terjaga), maksimal SEARCH_MAX_TOKENS. Kata satu huruf dibuang kecuali satu-satunya. */
export function tokenize(q: string): string[] {
  const all = [...new Set(q.split(" ").filter((t) => /[\p{L}\p{N}]/u.test(t)))];
  const long = all.filter((t) => t.length > 1);
  return (long.length ? long : all).slice(0, SEARCH_MAX_TOKENS);
}

/** Escape karakter khusus LIKE agar kata kunci selalu dibaca apa adanya. */
export const escapeLike = (s: string): string => s.replace(/[\\%_]/g, (c) => `\\${c}`);
