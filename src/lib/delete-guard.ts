/** Aturan keselamatan penghapusan (fungsi murni, diuji). Mengembalikan pesan galat atau null bila boleh. */

export const canDeleteInquiry = (i: { orderPaid: boolean }): string | null =>
  i.orderPaid ? "Inquiry dengan pembayaran tercatat tidak boleh dihapus (menjadi catatan penjualan). Batalkan saja." : null;

export const canDeleteProduct = (p: { archived: boolean; inquiryCount: number }): string | null => {
  if (!p.archived) return "Arsipkan produk dulu, baru hapus permanen dari daftar arsip.";
  if (p.inquiryCount > 0) return `Produk punya ${p.inquiryCount} inquiry sehingga tidak bisa dihapus permanen. Biarkan tetap diarsipkan.`;
  return null;
};

export const canDeleteCategory = (n: { products: number }): string | null =>
  n.products > 0 ? `Masih dipakai ${n.products} produk (termasuk yang diarsipkan). Pindahkan produknya dulu.` : null;

export const canDeleteBrand = (n: { products: number }): string | null =>
  n.products > 0 ? `Masih dipakai ${n.products} produk (termasuk yang diarsipkan). Pindahkan produknya dulu.` : null;

export const canDeleteAdmin = (a: { isSelf: boolean; targetRole: string; targetActive: boolean; otherActiveDevelopers: number }): string | null => {
  if (a.isSelf) return "Tidak bisa menghapus akun sendiri.";
  if (a.targetRole === "DEVELOPER" && a.targetActive && a.otherActiveDevelopers === 0) return "Harus ada minimal satu Admin/Developer aktif.";
  return null;
};
