import { createHash } from "node:crypto";

/**
 * Cloudinary (paket gratis tanpa kartu kredit), tanpa SDK: REST + tanda tangan SHA-1.
 *
 * Hemat penyimpanan:
 * - public_id = hash isi file, jadi file yang sama (klik dua kali / unggah ulang) menimpa aset yang sama, tidak menggandakan.
 * - Gambar diperkecil saat masuk (sisi terpanjang dibatasi) dan dikompres otomatis.
 * - Foto lama dihapus saat diganti/dilepas (lihat image-cleanup.ts) dan aset yatim disapu berkala.
 */
export interface CloudinaryConfig { cloudName: string; apiKey: string; apiSecret: string; folder: string }
export type UploadKind = "product" | "logo";

export function cloudinaryConfig(env: Record<string, string | undefined> = process.env): CloudinaryConfig | null {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim(), apiKey = env.CLOUDINARY_API_KEY?.trim(), apiSecret = env.CLOUDINARY_API_SECRET?.trim();
  const base = (env.CLOUDINARY_FOLDER?.trim() || "techrevive").replace(/^\/+|\/+$/g, "");
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret, folder: base } : null;
}

/** Tanda tangan: SHA-1 dari parameter (urut abjad, `k=v` digabung `&`) + api secret. */
export function signParams(params: Record<string, string | number>, secret: string): string {
  const base = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return createHash("sha1").update(base + secret).digest("hex");
}

/** Transformasi saat masuk: dibatasi ukurannya (tidak dipotong, tidak diperbesar). */
const INCOMING: Record<UploadKind, string> = {
  product: "c_limit,w_1600,h_1600,q_auto:good",
  logo: "c_limit,w_600,h_300",
};

export const contentId = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex").slice(0, 24);

export async function uploadToCloudinary(cfg: CloudinaryConfig, body: Uint8Array, mime: string, kind: UploadKind = "product", now = Date.now()): Promise<string> {
  const timestamp = Math.floor(now / 1000);
  const params = {
    overwrite: "true",
    public_id: `${cfg.folder}/${kind === "logo" ? "brands" : "products"}/${contentId(body)}`,
    timestamp,
    transformation: INCOMING[kind],
    unique_filename: "false",
  };
  const form = new FormData();
  form.set("file", new Blob([body as unknown as BlobPart], { type: mime }), "upload");
  form.set("api_key", cfg.apiKey);
  form.set("signature", signParams(params, cfg.apiSecret));
  for (const [k, v] of Object.entries(params)) form.set(k, String(v));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloudName)}/image/upload`, { method: "POST", body: form, signal: AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error(`Cloudinary upload gagal (${res.status})`);
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url?.startsWith("https://")) throw new Error("Cloudinary tidak mengembalikan URL");
  return json.secure_url;
}

/**
 * public_id dari URL Cloudinary milik kita; null bila bukan aset kita (URL manual/host lain) sehingga tidak pernah dihapus.
 * Contoh: https://res.cloudinary.com/demo/image/upload/c_fit,w_300/v123/techrevive/products/abc.jpg -> techrevive/products/abc
 */
export function publicIdFromUrl(url: string, cfg: Pick<CloudinaryConfig, "cloudName" | "folder">): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.hostname !== "res.cloudinary.com") return null;
  const m = u.pathname.match(/^\/([^/]+)\/image\/upload\/(.+)$/);
  if (!m || m[1] !== cfg.cloudName) return null;
  const parts = decodeURIComponent(m[2]).split("/");
  // Lewati transformasi dan versi di depan: mulai dari bagian pertama yang membentuk "<folder>/...".
  const start = parts.findIndex((_, i) => `${parts.slice(i).join("/")}`.startsWith(`${cfg.folder}/`));
  if (start < 0) return null;
  const path = parts.slice(start).join("/").replace(/\.[a-z0-9]{2,5}$/i, "");
  return path.startsWith(`${cfg.folder}/`) ? path : null;
}

export { deliveryUrl } from "./cloudinary-url.ts";

export async function destroyAsset(cfg: CloudinaryConfig, publicId: string, now = Date.now()): Promise<void> {
  const params = { invalidate: "true", public_id: publicId, timestamp: Math.floor(now / 1000) };
  const form = new FormData();
  form.set("api_key", cfg.apiKey);
  form.set("signature", signParams(params, cfg.apiSecret));
  for (const [k, v] of Object.entries(params)) form.set(k, String(v));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloudName)}/image/destroy`, { method: "POST", body: form, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Cloudinary destroy gagal (${res.status})`);
}

export interface RemoteAsset { publicId: string; createdAt: Date }

/** Daftar aset di folder kita (maks. `limit`), untuk penyapuan aset yatim. */
export async function listAssets(cfg: CloudinaryConfig, limit = 500): Promise<RemoteAsset[]> {
  const out: RemoteAsset[] = [];
  let cursor: string | undefined;
  const auth = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString("base64");
  while (out.length < limit) {
    const qs = new URLSearchParams({ prefix: `${cfg.folder}/`, max_results: "100", ...(cursor ? { next_cursor: cursor } : {}) });
    const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloudName)}/resources/image/upload?${qs}`, { headers: { authorization: `Basic ${auth}` }, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`Cloudinary list gagal (${res.status})`);
    const json = (await res.json()) as { resources?: Array<{ public_id: string; created_at: string }>; next_cursor?: string };
    for (const r of json.resources ?? []) out.push({ publicId: r.public_id, createdAt: new Date(r.created_at) });
    if (!json.next_cursor) break;
    cursor = json.next_cursor;
  }
  return out;
}
