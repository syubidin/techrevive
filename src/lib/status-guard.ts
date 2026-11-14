import { can, type Role } from "./rbac.ts";

/**
 * Penjaga perubahan status lewat form "Status & penawaran".
 *
 * Prinsip: status yang berkaitan dengan uang dan pengiriman (Menunggu bayar, Lunas, Dikirim, Selesai)
 * HANYA berubah lewat form Order (Owner/Developer), supaya tidak ada "Lunas" tanpa pencatatan pembayaran.
 */
export type InquiryStatus =
  | "NEW" | "CONTACTED" | "SUPPLIER_CHECKING" | "QUOTED" | "AWAITING_PAYMENT" | "PAID"
  | "PROCURING" | "RECEIVED_BY_US" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "EXPIRED";

export const ALL_STATUSES: readonly InquiryStatus[] = [
  "NEW", "CONTACTED", "SUPPLIER_CHECKING", "QUOTED", "AWAITING_PAYMENT", "PAID",
  "PROCURING", "RECEIVED_BY_US", "SHIPPED", "DELIVERED", "CANCELLED", "EXPIRED",
];

/** Hanya boleh diatur oleh form Order. */
export const ORDER_DRIVEN: readonly InquiryStatus[] = ["AWAITING_PAYMENT", "PAID", "SHIPPED", "DELIVERED"];
const PRE_ORDER: readonly InquiryStatus[] = ["NEW", "CONTACTED", "SUPPLIER_CHECKING", "QUOTED"];
const ORDER_RUNNING: readonly InquiryStatus[] = ["AWAITING_PAYMENT", "PAID", "PROCURING", "RECEIVED_BY_US", "SHIPPED"];
const NEEDS_PAYMENT: readonly InquiryStatus[] = ["PROCURING", "RECEIVED_BY_US"];

export interface GuardInput {
  role: Role;
  current: InquiryStatus;
  target: InquiryStatus;
  /** Order sudah dicatat lunas. */
  orderPaid: boolean;
}

/** Mengembalikan pesan kesalahan, atau null bila perubahan diizinkan. */
export function checkStatusChange({ role, current, target, orderPaid }: GuardInput): string | null {
  if (target === current) return null;

  if (current === "DELIVERED") return "Order yang sudah selesai tidak bisa diubah statusnya.";

  if (ORDER_DRIVEN.includes(target)) {
    return "Status ini diatur otomatis lewat form Order (pembayaran dan pengiriman), bukan dari sini.";
  }

  if ((current === "CANCELLED" || current === "EXPIRED") && !can(role, "inquiry.override")) {
    return "Inquiry yang batal atau kedaluwarsa hanya bisa dibuka ulang oleh Owner atau Developer.";
  }

  if (ORDER_RUNNING.includes(current) && PRE_ORDER.includes(target)) {
    return "Order sudah berjalan, status tidak bisa dikembalikan ke tahap penawaran. Pakai Batal bila perlu.";
  }

  if (NEEDS_PAYMENT.includes(target) && !orderPaid) {
    return "Catat pembayaran lunas lewat form Order sebelum memakai status ini.";
  }

  if (target === "CANCELLED" && orderPaid && !can(role, "inquiry.override")) {
    return "Order yang sudah dibayar hanya bisa dibatalkan oleh Owner atau Developer (perlu penanganan pengembalian dana).";
  }

  if (target === "EXPIRED" && (orderPaid || ORDER_RUNNING.includes(current))) {
    return "Order yang sedang berjalan tidak bisa berstatus kedaluwarsa.";
  }

  return null;
}

/** Status yang boleh dipilih di dropdown untuk kondisi saat ini (termasuk status sekarang). */
export function allowedTargets(input: Omit<GuardInput, "target">): InquiryStatus[] {
  return ALL_STATUSES.filter((target) => target === input.current || checkStatusChange({ ...input, target }) === null);
}
