import type { InquiryStatus } from "@prisma/client";

export const STATUS_LABEL: Record<InquiryStatus, string> = {
  NEW: "Baru", CONTACTED: "Dihubungi", SUPPLIER_CHECKING: "Cek supplier", QUOTED: "Penawaran terkirim", AWAITING_PAYMENT: "Menunggu bayar",
  PAID: "Lunas", PROCURING: "Pesan ke supplier", RECEIVED_BY_US: "Diterima (QC)", SHIPPED: "Dikirim", DELIVERED: "Selesai", CANCELLED: "Batal", EXPIRED: "Kedaluwarsa",
};
export const STATUS_KEYS = Object.keys(STATUS_LABEL) as InquiryStatus[];
