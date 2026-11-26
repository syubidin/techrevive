import generated from "@/config/assets.generated.json";

export type AssetFile = { src: string; w: number; h: number };
export type AssetInfo = AssetFile & { dark?: AssetFile };
const MAP = generated as Record<string, AssetInfo>;

/** Aset terpasang atau null (dibuat oleh `npm run assets:sync`). */
export function getAsset(key: string): AssetInfo | null {
  return MAP[key] ?? null;
}

/** Key pertama yang berkasnya ada, untuk pola "gambar kategori, kalau tidak ada pakai default". */
export function firstAsset(...keys: string[]): string | null {
  return keys.find((k) => k in MAP) ?? null;
}
