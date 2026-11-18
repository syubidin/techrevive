import type { InquiryStatus } from "@prisma/client";

export const STATUS_LABEL: Record<InquiryStatus, string> = {
  NEW: "Baru", CONTACTED: "Dihubungi", SUPPLIER_CHECKING: "Cek supplier", QUOTED: "Penawaran terkirim", AWAITING_PAYMENT: "Menunggu bayar",
  PAID: "Lunas", PROCURING: "Pesan ke supplier", RECEIVED_BY_US: "Diterima (QC)", SHIPPED: "Dikirim", DELIVERED: "Selesai", CANCELLED: "Batal", EXPIRED: "Kedaluwarsa",
};

/** Kelompok untuk tab daftar inquiry (lebih ringkas dari 12 status). */
export const STATUS_GROUPS: Array<{ key: string; label: string; statuses: InquiryStatus[] }> = [
  { key: "reply", label: "Perlu dibalas", statuses: ["NEW", "CONTACTED", "SUPPLIER_CHECKING"] },
  { key: "quoted", label: "Penawaran", statuses: ["QUOTED"] },
  { key: "pay", label: "Menunggu bayar", statuses: ["AWAITING_PAYMENT"] },
  { key: "process", label: "Diproses", statuses: ["PAID", "PROCURING", "RECEIVED_BY_US"] },
  { key: "shipping", label: "Dikirim", statuses: ["SHIPPED"] },
  { key: "done", label: "Selesai", statuses: ["DELIVERED"] },
  { key: "closed", label: "Ditutup", statuses: ["CANCELLED", "EXPIRED"] },
];
