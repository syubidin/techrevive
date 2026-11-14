/**
 * Penyesuaian stok produk saat order dibayar.
 *
 * Jumlah unit sering tidak diketahui (reseller, supplier tidak memberi angka), jadi `stockQty` opsional:
 *  - diketahui (angka): stok berkurang 1 saat order pertama kali lunas, otomatis "Habis" di 0,
 *    dan dipulihkan bila pembayaran dibatalkan;
 *  - tidak diketahui (null): sistem TIDAK menebak. Admin diminta meninjau (Habis / masih ada unit).
 */
export interface StockPlanInput {
  stockQty: number | null;
  paidBefore: boolean;
  paidNow: boolean;
  /** Stok order ini sudah pernah dikurangi otomatis. */
  autoApplied: boolean;
}

export interface StockPlan {
  action: "none" | "decrement" | "restore";
  newQty: number | null;
  markSoldOut: boolean;
  /** Produk yang tadinya Habis karena stok 0 kembali "Cek ketersediaan" setelah stok dipulihkan. */
  reopen: boolean;
  autoApplied: boolean;
  /** Perlu ditinjau manual oleh admin (jumlah unit tidak diketahui). */
  needsReview: boolean;
}

export function planStockAdjustment(i: StockPlanInput): StockPlan {
  const none: StockPlan = { action: "none", newQty: i.stockQty, markSoldOut: false, reopen: false, autoApplied: i.autoApplied, needsReview: false };

  if (i.paidNow && !i.paidBefore) {
    if (i.stockQty === null) return { ...none, needsReview: true };
    const newQty = Math.max(0, i.stockQty - 1);
    return { action: "decrement", newQty, markSoldOut: newQty === 0, reopen: false, autoApplied: true, needsReview: false };
  }

  if (!i.paidNow && i.paidBefore && i.autoApplied) {
    const newQty = (i.stockQty ?? 0) + 1;
    return { action: "restore", newQty, markSoldOut: false, reopen: true, autoApplied: false, needsReview: false };
  }

  return none;
}
