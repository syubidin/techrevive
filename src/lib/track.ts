/** Logika murni halaman "Lacak Pesanan" (tanpa DB/React) agar mudah diuji. */
export type TrackStatus =
  | "NEW" | "CONTACTED" | "SUPPLIER_CHECKING" | "QUOTED" | "AWAITING_PAYMENT" | "PAID"
  | "PROCURING" | "RECEIVED_BY_US" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "EXPIRED";

export const ALL_TRACK_STATUSES: readonly TrackStatus[] = [
  "NEW", "CONTACTED", "SUPPLIER_CHECKING", "QUOTED", "AWAITING_PAYMENT", "PAID", "PROCURING", "RECEIVED_BY_US", "SHIPPED", "DELIVERED", "CANCELLED", "EXPIRED",
];

/** Enam tahap yang dilihat pelanggan (indeks cocok dengan t.track.steps). */
export const TRACK_STEP_COUNT = 6;

const STEP: Record<TrackStatus, number> = {
  NEW: 0,
  CONTACTED: 1,
  SUPPLIER_CHECKING: 1,
  QUOTED: 1,
  AWAITING_PAYMENT: 2,
  PAID: 3,
  PROCURING: 3,
  RECEIVED_BY_US: 3,
  SHIPPED: 4,
  DELIVERED: 5,
  CANCELLED: -1,
  EXPIRED: -1,
};

/** Indeks tahap aktif 0..5, atau -1 untuk status akhir yang tidak berlanjut (batal/kedaluwarsa). */
export const trackStep = (status: TrackStatus): number => STEP[status];

/** Kode inquiry dinormalkan: huruf besar, tanpa spasi. Mengembalikan null jika bentuknya tidak masuk akal. */
export function normalizeCode(raw: string): string | null {
  const c = raw.trim().toUpperCase().replace(/\s+/g, "");
  return /^TR-\d{6}-[A-Z0-9]{4}$/.test(c) ? c : null;
}
