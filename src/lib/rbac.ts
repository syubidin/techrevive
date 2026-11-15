/**
 * Peta izin terpusat. Satu-satunya tempat yang menentukan siapa boleh melakukan apa.
 *
 *  DEVELOPER (Admin/Developer) : kendali penuh, termasuk akun/peran serta ubah-hapus data master dan penghapusan permanen.
 *  OWNER                       : semua fitur bisnis, KECUALI mengelola akun dan peran.
 *  STAFF                       : memproses inquiry saja (nomor HP tersamar, tanpa data keuangan).
 *
 * Nilai enum di database tetap OWNER | DEVELOPER | STAFF; hanya hak aksesnya yang berbeda.
 */
export type Role = "DEVELOPER" | "OWNER" | "STAFF";

export const ROLES: readonly Role[] = ["DEVELOPER", "OWNER", "STAFF"];

export const ROLE_LABEL: Record<Role, string> = {
  DEVELOPER: "Admin / Developer",
  OWNER: "Owner",
  STAFF: "Staff",
};

const ALL: readonly Role[] = ["DEVELOPER", "OWNER", "STAFF"];
const MANAGEMENT: readonly Role[] = ["DEVELOPER", "OWNER"];
const DEVELOPER_ONLY: readonly Role[] = ["DEVELOPER"];

export const PERMISSIONS = {
  // Inquiry harian
  "inquiry.view": ALL,
  "inquiry.update": ALL,
  /** Membuka ulang inquiry yang batal/kedaluwarsa, atau membatalkan order yang sudah dibayar. */
  "inquiry.override": MANAGEMENT,
  /** Melihat nomor HP lengkap (Staff hanya melihat nomor tersamar). */
  "pii.view": MANAGEMENT,
  // Keuangan dan order
  "finance.view": MANAGEMENT,
  "order.write": MANAGEMENT,
  "stock.review": MANAGEMENT,
  "invoice.issue": MANAGEMENT,
  "report.view": MANAGEMENT,
  // Katalog dan pengaturan
  "product.manage": MANAGEMENT,
  "upload.image": MANAGEMENT,
  "taxonomy.manage": MANAGEMENT,
  "shipping.manage": MANAGEMENT,
  "audit.view": MANAGEMENT,
  /** Mengubah (bukan menghapus) kategori, merk, supplier, dan definisi spek. */
  "taxonomy.edit": MANAGEMENT,
  /** Hapus data master (kategori, merk, supplier, spek, zona ongkir) serta penghapusan permanen (produk, inquiry). */
  "data.manage": DEVELOPER_ONLY,
  // Akun dan peran
  "user.manage": DEVELOPER_ONLY,
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as readonly string[]).includes(v);
