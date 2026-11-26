/**
 * "Bantu memutuskan": jawaban kebutuhan pengunjung diterjemahkan menjadi filter katalog.
 * Murni (tanpa React/DB) agar bisa diuji. Semua nilai divalidasi dengan daftar putih; keluarannya hanya
 * memakai parameter yang sudah dikenal buildCatalogQuery, jadi tidak membuka jalur masukan baru.
 */
export const PURPOSES = ["study", "office", "creative", "gaming", "business", "daily"] as const;
export const BUDGETS = ["lt3", "3to6", "6to10", "gt10", "flex"] as const;
export const PRIORITIES = ["cheap", "performance", "battery", "mint"] as const;
export const ANY_DEVICE = "any";

export type Purpose = (typeof PURPOSES)[number];
export type Budget = (typeof BUDGETS)[number];
export type Priority = (typeof PRIORITIES)[number];
export interface Answers { purpose?: Purpose; device?: string; budget?: Budget; priority?: Priority }

const SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/;
const has = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);

/** Batas harga (rupiah). */
export const BUDGET_RANGE: Record<Budget, { min?: number; max?: number }> = {
  lt3: { max: 3_000_000 },
  "3to6": { min: 3_000_000, max: 6_000_000 },
  "6to10": { min: 6_000_000, max: 10_000_000 },
  gt10: { min: 10_000_000 },
  flex: {},
};

/** Spek minimum per kebutuhan, menurut jenis perangkat. Kunci mengikuti definisi spek di seed (ram_gb, storage_gb, dedicated_gpu). */
const SPEC_RULES: Record<string, Partial<Record<Purpose, { ram?: number; storage?: number; gpu?: boolean }>>> = {
  laptop: {
    study: { ram: 8 }, office: { ram: 8, storage: 256 }, creative: { ram: 16, storage: 512 },
    gaming: { ram: 16, gpu: true }, business: { ram: 8 }, daily: { ram: 4 },
  },
  smartphone: {
    study: { ram: 4 }, office: { ram: 4 }, creative: { ram: 8, storage: 128 },
    gaming: { ram: 8 }, business: { ram: 4, storage: 128 }, daily: { ram: 4 },
  },
};

/** Jawaban dari penyimpanan lokal atau sumber lain: buang apa pun yang tidak valid. */
export function sanitizeAnswers(raw: unknown): Answers {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Answers = {};
  if (has(PURPOSES, r.purpose)) out.purpose = r.purpose;
  if (typeof r.device === "string" && (r.device === ANY_DEVICE || SLUG.test(r.device))) out.device = r.device;
  if (has(BUDGETS, r.budget)) out.budget = r.budget;
  if (has(PRIORITIES, r.priority)) out.priority = r.priority;
  return out;
}

/** Query string katalog (tanpa "?"). Spek hanya ditambahkan bila satu kategori dipilih (itulah syarat katalog memuat definisi spek). */
export function buildFinderParams(answers: Answers): string {
  const a = sanitizeAnswers(answers);
  const sp = new URLSearchParams();
  const single = a.device && a.device !== ANY_DEVICE ? a.device : undefined;
  if (single) sp.set("category", single);

  if (a.budget) {
    const { min, max } = BUDGET_RANGE[a.budget];
    if (min !== undefined) sp.set("minPrice", String(min));
    if (max !== undefined) sp.set("maxPrice", String(max));
  }

  const rule = single && a.purpose ? SPEC_RULES[single]?.[a.purpose] : undefined;
  if (rule?.ram) sp.set("s.ram_gb.min", String(rule.ram));
  if (rule?.storage) sp.set("s.storage_gb.min", String(rule.storage));
  if (rule?.gpu) sp.set("s.dedicated_gpu", "1");

  if (a.priority === "cheap") sp.set("sort", "price_asc");
  if (a.priority === "performance") sp.set("grade", "A,B");
  if (a.priority === "battery") sp.set("battery", "80");
  if (a.priority === "mint") sp.set("grade", "A");
  return sp.toString();
}

export const FINDER_STORAGE = { seen: "tr_finder_seen", answers: "tr_finder_answers" } as const;
