/**
 * Alur inquiry yang disederhanakan: dari status database dihitung SATU langkah berikutnya yang perlu dilakukan admin.
 * Fungsi murni agar mudah diuji dan dipakai UI maupun server action.
 */
export type StepKey = "reply" | "order" | "pay" | "ship" | "deliver" | "done" | "closed";

export interface StepInput {
  status: string;
  hasOrder: boolean;
}

export function nextStep({ status, hasOrder }: StepInput): StepKey {
  switch (status) {
    case "NEW":
    case "CONTACTED":
    case "SUPPLIER_CHECKING":
      return "reply";
    case "QUOTED":
      return hasOrder ? "pay" : "order";
    case "AWAITING_PAYMENT":
      return "pay";
    case "PAID":
    case "PROCURING":
    case "RECEIVED_BY_US":
      return "ship";
    case "SHIPPED":
      return "deliver";
    case "DELIVERED":
      return "done";
    default:
      return "closed";
  }
}

/** Judul & petunjuk satu kalimat untuk tiap langkah. */
export const STEP_COPY: Record<StepKey, { title: string; hint: string }> = {
  reply: { title: "Balas & kirim penawaran", hint: "Hubungi customer, pastikan unit lolos QC dan siap, lalu kirim harga final." },
  order: { title: "Customer setuju? Buat pesanan", hint: "Catat harga final dan ongkir. Customer akan diminta membayar." },
  pay: { title: "Catat pembayaran", hint: "Setelah transfer/VA/QRIS masuk dan terverifikasi, tandai lunas." },
  ship: { title: "Kirim barang", hint: "Pilih diantar tim atau kurir, lalu tandai dikirim." },
  deliver: { title: "Konfirmasi barang diterima", hint: "Tandai selesai setelah customer menerima barang." },
  done: { title: "Pesanan selesai", hint: "Tidak ada langkah lagi. Invoice bisa dikirim bila diperlukan." },
  closed: { title: "Inquiry ditutup", hint: "Dibatalkan atau kedaluwarsa. Hanya Owner/Developer yang bisa membukanya lagi." },
};

export interface MessageCtx {
  name: string;
  code: string;
  product: string;
  /** Sudah diformat, mis. "Rp5.500.000". */
  price: string | null;
  /** Sudah diformat, mis. "16 Nov 2026 15.00 WIB". */
  validUntil: string | null;
  trackUrl: string;
  courier: string | null;
  trackingNumber: string | null;
  deliveredBy: string | null;
}

/** Pesan WhatsApp siap kirim untuk status tertentu (admin tinggal klik). */
export function customerMessage(status: string, c: MessageCtx): string {
  const head = `Halo ${c.name}, ini TechRevive (kode ${c.code}).`;
  const track = `Pantau pesanan: ${c.trackUrl}`;
  switch (status) {
    case "QUOTED":
      return [head, `Produk: ${c.product}`, c.price ? `Harga final: ${c.price}${c.validUntil ? ` (berlaku s.d. ${c.validUntil})` : ""}` : "", "Catatan: garansi penuh 1 bulan sejak barang diterima; kondisi sesuai grade yang tertera.", "Jika setuju, balas pesan ini ya.", track].filter(Boolean).join("\n");
    case "AWAITING_PAYMENT":
      return [head, `Pesanan ${c.product} sudah kami catat${c.price ? ` dengan total ${c.price}` : ""}.`, "Silakan lakukan pembayaran, lalu kirim bukti transfer di chat ini.", track].join("\n");
    case "PAID":
    case "PROCURING":
    case "RECEIVED_BY_US":
      return [head, `Pembayaran untuk ${c.product} sudah kami terima. Barang sedang kami siapkan.`, track].join("\n");
    case "SHIPPED":
      return [
        head,
        `${c.product} sedang dalam pengiriman.`,
        c.courier ? `Kurir: ${c.courier}${c.trackingNumber ? ` (resi ${c.trackingNumber})` : ""}` : c.deliveredBy ? `Diantar oleh: ${c.deliveredBy}` : "",
        track,
      ].filter(Boolean).join("\n");
    case "DELIVERED":
      return [head, `Terima kasih sudah berbelanja ${c.product} di TechRevive.`, track].join("\n");
    default:
      return [head, `Kami menindaklanjuti permintaan Anda untuk ${c.product}.`, track].join("\n");
  }
}
