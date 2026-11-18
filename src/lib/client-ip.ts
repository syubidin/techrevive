import { createHmac } from "node:crypto";

/**
 * IP klien untuk rate limit. Header hanya dipercaya jika datang dari proxy kita sendiri:
 * - TRUST_CLOUDFLARE=1 → pakai CF-Connecting-IP (situs di belakang Cloudflare).
 * - Selain itu → entri TERAKHIR X-Forwarded-For (ditulis Caddy dari alamat koneksi asli;
 *   entri sebelumnya bisa dipalsukan klien).
 */
export function getClientIp(h: Headers): string {
  if (process.env.TRUST_CLOUDFLARE === "1") {
    const cf = h.get("cf-connecting-ip");
    if (cf) return cf.trim();
  }
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",");
    return parts[parts.length - 1]!.trim() || "unknown";
  }
  // Tanpa X-Forwarded-For (mis. proxy lain): pakai X-Real-IP bila ada agar semua pengunjung tidak berbagi satu "unknown".
  return h.get("x-real-ip")?.trim() || "unknown";
}

export function hashIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(ip).digest("hex");
}
