/** Aturan garansi (murni, tanpa DB/React) agar mudah diuji. Garansi 1 bulan dihitung sejak barang diterima. */
export const WARRANTY_DAYS = 30;
/** Maksimal klaim yang masih berjalan per order, mencegah spam/duplikat. */
export const MAX_OPEN_CLAIMS_PER_ORDER = 1;
/** Maksimal klaim seumur order (mencegah penyalahgunaan berulang). */
export const MAX_CLAIMS_PER_ORDER = 5;
export const ISSUE_MIN = 10;
export const ISSUE_MAX = 1000;
const DAY_MS = 86_400_000;

export interface WarrantyInput { deliveredAt: Date | null; paidAt: Date | null }
export type WarrantyState =
  | { state: "none" }                                            // belum diterima, garansi belum mulai
  | { state: "active"; startsAt: Date; endsAt: Date; daysLeft: number }
  | { state: "expired"; startsAt: Date; endsAt: Date };

/** Garansi mulai saat barang diterima (deliveredAt). Tanpa itu atau tanpa pembayaran, garansi belum berlaku. */
export function warrantyOf(o: WarrantyInput, now: Date = new Date()): WarrantyState {
  if (!o.deliveredAt || !o.paidAt) return { state: "none" };
  const startsAt = o.deliveredAt;
  const endsAt = new Date(startsAt.getTime() + WARRANTY_DAYS * DAY_MS);
  if (now.getTime() > endsAt.getTime()) return { state: "expired", startsAt, endsAt };
  return { state: "active", startsAt, endsAt, daysLeft: Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS)) };
}

/** Teks keluhan dirapikan: spasi ganda, karakter kontrol dibuang. Mengembalikan null jika tidak layak. */
export function cleanIssue(raw: string): string | null {
  const t = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return t.length >= ISSUE_MIN && t.length <= ISSUE_MAX ? t : null;
}

export type ClaimBlock = "notStarted" | "expired" | "open" | "limit";
/** Boleh mengajukan klaim baru? Mengembalikan null jika boleh, atau alasan penolakan. */
export function claimBlocker(w: WarrantyState, openClaims: number, totalClaims: number): ClaimBlock | null {
  if (w.state === "none") return "notStarted";
  if (w.state === "expired") return "expired";
  if (openClaims >= MAX_OPEN_CLAIMS_PER_ORDER) return "open";
  if (totalClaims >= MAX_CLAIMS_PER_ORDER) return "limit";
  return null;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** Kode klaim CL-YYMMDD-XXXX. `rand` disuntik agar bisa diuji; produksi memakai crypto.randomInt. */
export function claimCode(rand: (max: number) => number, now: Date = new Date()): string {
  const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, "");
  let s = "";
  for (let i = 0; i < 4; i++) s += ALPHABET[rand(ALPHABET.length)];
  return `CL-${yymmdd}-${s}`;
}
