import { createHash } from "node:crypto";

/** Unggah gambar ke Cloudinary (paket gratis tanpa kartu kredit). Tanpa SDK: cukup REST + tanda tangan SHA-1. */
export interface CloudinaryConfig { cloudName: string; apiKey: string; apiSecret: string; folder: string }

export function cloudinaryConfig(env: Record<string, string | undefined> = process.env): CloudinaryConfig | null {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim(), apiKey = env.CLOUDINARY_API_KEY?.trim(), apiSecret = env.CLOUDINARY_API_SECRET?.trim();
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret, folder: env.CLOUDINARY_FOLDER?.trim() || "techrevive/products" } : null;
}

/** Tanda tangan: SHA-1 dari parameter (urut abjad, `k=v` digabung `&`) + api secret. */
export function signParams(params: Record<string, string | number>, secret: string): string {
  const base = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return createHash("sha1").update(base + secret).digest("hex");
}

export async function uploadToCloudinary(cfg: CloudinaryConfig, body: Uint8Array, mime: string, now = Date.now()): Promise<string> {
  const timestamp = Math.floor(now / 1000);
  const signature = signParams({ folder: cfg.folder, timestamp }, cfg.apiSecret);
  const form = new FormData();
  form.set("file", new Blob([body as unknown as BlobPart], { type: mime }), "upload");
  form.set("api_key", cfg.apiKey);
  form.set("timestamp", String(timestamp));
  form.set("folder", cfg.folder);
  form.set("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloudName)}/image/upload`, { method: "POST", body: form, signal: AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error(`Cloudinary upload gagal (${res.status})`);
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url?.startsWith("https://")) throw new Error("Cloudinary tidak mengembalikan URL");
  return json.secure_url;
}
