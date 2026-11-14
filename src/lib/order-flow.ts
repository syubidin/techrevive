/**
 * Aturan pembayaran dan pengiriman sebuah order. Fungsi murni agar mudah diuji.
 *
 * Aturan:
 * - Diantar tim sendiri: boleh berangkat sebelum lunas (pembayaran bisa saat serah terima),
 *   tetapi wajib lunas sebelum ditandai "diterima".
 * - Kurir: wajib lunas sebelum dikirim (tidak ada bayar di tempat), nama kurir wajib diisi.
 * - "Diterima" otomatis berarti sudah dikirim/diantar.
 */
export type DeliveryMethod = "OWN_TEAM" | "COURIER";
export type FlowStatus = "AWAITING_PAYMENT" | "PAID" | "SHIPPED" | "DELIVERED";

export interface DeliveryInput {
  method: DeliveryMethod;
  paid: boolean;
  dispatched: boolean;
  delivered: boolean;
  courier: string | null;
  trackingNumber: string | null;
  deliveredBy: string | null;
}

export interface DeliveryResolution {
  error?: string;
  dispatched: boolean;
  delivered: boolean;
  status: FlowStatus;
}

export function resolveDelivery(i: DeliveryInput): DeliveryResolution {
  // Kurir yang sudah punya nomor resi dianggap sudah dikirim.
  const dispatched = i.dispatched || i.delivered || (i.method === "COURIER" && !!i.trackingNumber);
  const status: FlowStatus = i.delivered ? "DELIVERED" : dispatched ? "SHIPPED" : i.paid ? "PAID" : "AWAITING_PAYMENT";
  const fail = (error: string): DeliveryResolution => ({ error, dispatched, delivered: i.delivered, status });

  if (i.delivered && !i.paid) return fail("Tandai pembayaran sudah lunas sebelum menandai barang diterima customer.");
  if (dispatched && i.method === "COURIER") {
    if (!i.paid) return fail("Pembayaran harus lunas sebelum barang dikirim lewat kurir.");
    if (!i.courier) return fail("Isi nama kurir (mis. JNE, SiCepat, Gojek).");
  }
  if (dispatched && i.method === "OWN_TEAM" && !i.deliveredBy) return fail("Isi nama petugas yang mengantar.");

  return { dispatched, delivered: i.delivered, status };
}

/** Urutan status yang boleh dimajukan otomatis oleh form order. Tidak pernah memundurkan status. */
export const FORWARD_ORDER = [
  "NEW", "CONTACTED", "SUPPLIER_CHECKING", "QUOTED", "AWAITING_PAYMENT", "PAID", "PROCURING", "RECEIVED_BY_US", "SHIPPED", "DELIVERED",
] as const;

export function shouldAdvance(current: string, target: FlowStatus): boolean {
  const from = FORWARD_ORDER.indexOf(current as (typeof FORWARD_ORDER)[number]);
  const to = FORWARD_ORDER.indexOf(target);
  return from !== -1 && to > from;
}
