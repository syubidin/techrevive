/**
 * Chip filter aktif di katalog: tiap nilai filter menjadi satu chip yang bisa dihapus sendiri.
 * Murni (tanpa React/DB) supaya bisa diuji. Label dibuat oleh pemanggil lewat `label(kind, value)`.
 */
export interface FilterChip {
  id: string;
  kind: string;
  value: string;
  /** Query string setelah chip ini dihapus (halaman kembali ke 1). */
  rest: string;
}

/** Kunci yang berupa daftar nilai (boleh dipisah koma). */
const LIST_KEYS = ["category", "brand", "condition", "grade", "availability", "feature"] as const;
const SINGLE_KEYS = ["q", "minPrice", "maxPrice", "battery"] as const;

const isSpec = (k: string) => k.startsWith("s.");

export function buildFilterChips(sp: URLSearchParams): FilterChip[] {
  const chips: FilterChip[] = [];

  const without = (kind: string, value?: string): string => {
    const next = new URLSearchParams();
    for (const [k, v] of sp.entries()) {
      if (k === "page") continue;
      if (value !== undefined && k === kind) {
        const keep = v.split(",").map((x) => x.trim()).filter((x) => x && x !== value);
        if (keep.length) next.append(k, keep.join(","));
        continue;
      }
      if (value === undefined && k === kind) continue;
      next.append(k, v);
    }
    return next.toString();
  };

  for (const kind of LIST_KEYS) {
    const seen = new Set<string>();
    for (const raw of sp.getAll(kind)) {
      for (const value of raw.split(",").map((x) => x.trim()).filter(Boolean)) {
        if (seen.has(value)) continue;
        seen.add(value);
        chips.push({ id: `${kind}:${value}`, kind, value, rest: without(kind, value) });
      }
    }
  }
  for (const kind of SINGLE_KEYS) {
    const value = (sp.get(kind) ?? "").trim();
    if (value) chips.push({ id: `${kind}:${value}`, kind, value, rest: without(kind) });
  }
  for (const key of new Set([...sp.keys()].filter(isSpec))) {
    for (const raw of sp.getAll(key)) {
      for (const value of raw.split(",").map((x) => x.trim()).filter(Boolean)) {
        chips.push({ id: `${key}:${value}`, kind: key, value, rest: without(key, value) });
      }
    }
  }
  return chips;
}

/** Jumlah filter aktif (tanpa urutan/halaman). */
export const activeFilterCount = (sp: URLSearchParams): number => buildFilterChips(sp).length;
