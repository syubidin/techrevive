# Alur sistem TechRevive (versi terbaru)

## Peran
| Peran | Akses |
|---|---|
| **Admin / Developer** | Penuh: kelola akun & peran, serta **menghapus** data master (kategori, merk, supplier, spek, zona ongkir) dan hapus permanen (produk arsip, inquiry uji/spam) |
| **Owner** | Semua fitur bisnis (produk, order, laporan, invoice) dan **menambah serta mengubah** kategori, merk, supplier, spek; tidak bisa kelola akun/peran maupun menghapus data master |
| **Staff** | Dashboard (tanpa angka keuangan), lihat & proses inquiry (status pra-order, catatan, follow-up). Nomor customer disamarkan. Tanpa form Order, laporan, produk, invoice, audit |

## Alur dari customer sampai selesai
1. **Customer** pilih produk → isi inquiry → WhatsApp terbuka dengan kode `TR-…`.
2. **Notifikasi** Telegram/webhook masuk ke tim seketika (nomor disamarkan). Belum dibalas > 15 menit → peringatan SLA oleh jadwal otomatis.
3. **Staff/Owner** buka inquiry → balas via WA → cek stok ke supplier → status *Dihubungi → Cek supplier → Penawaran terkirim* (isi harga final, masa berlaku 24 jam).
4. Penawaran lewat masa berlaku → **otomatis Kedaluwarsa** oleh jadwal (dashboard sebagai cadangan).
5. Customer setuju → **Owner/Developer** isi **form Order** (harga, modal, ongkir, metode bayar, cara kirim). Centang *Pembayaran diterima* → status otomatis **Lunas**. Staff **tidak bisa** menetapkan Lunas/Dikirim/Selesai dari form status.
6. **Stok setelah lunas**: bila produk punya *jumlah unit* → berkurang 1, otomatis **Habis** di 0 (dipulihkan bila pembayaran dibatalkan). Bila jumlah unit kosong → muncul kartu **Tinjau stok** (Habis / sisa N unit / masih ada) dan daftar di dashboard.
7. Pesan ke supplier → Diterima & QC → **Antar tim** atau **kurir** (resi) → centang *Diterima customer* → **Selesai**.
8. **Invoice**: setelah lunas, Owner/Developer klik *Buat invoice* → kirim link via WhatsApp (halaman publik acak 192-bit, tanpa modal/laba, bisa dicetak/PDF, bisa dicabut).
9. **Laporan**: menu *Laporan* → pilih rentang tanggal → ringkasan omzet/modal/laba/margin, per hari/produk/kategori/metode bayar → **Cetak/PDF** atau **CSV**.

## Aturan perubahan status (status guard)
- Menunggu bayar, Lunas, Dikirim, Selesai: hanya otomatis dari form Order.
- Pesan ke supplier / Diterima QC: hanya setelah order tercatat lunas.
- Order berjalan tidak bisa mundur ke tahap penawaran atau Kedaluwarsa; order selesai terkunci.
- Membatalkan order yang sudah dibayar dan membuka ulang Batal/Kedaluwarsa: hanya Owner/Developer.

## Pembaruan database setelah mengganti file
```
npx prisma db push
npx prisma generate
npm run db:set-role -- email-anda@contoh.com DEVELOPER
```
(Akun seed lama berperan OWNER; naikkan akun Anda ke DEVELOPER dengan perintah terakhir.)

## Keamanan sesi
Sesi login otomatis diputus (harus login ulang) bila: kata sandi akun diatur ulang, peran diubah, akun dinonaktifkan, Developer menekan *Putus semua sesi login*, atau pengguna menekan *Keluar semua perangkat*. Setelah memasang versi ini jalankan `npx prisma db push` (ada kolom baru `sessionVersion`).
