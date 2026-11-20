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

## Alur inquiry yang disederhanakan (versi terbaru)

Di detail inquiry admin ada satu panel **Langkah berikutnya** yang berubah mengikuti status:

1. Balas & kirim penawaran (Staff/Owner): tombol "Sudah saya hubungi", "Sedang cek supplier", isi harga final lalu "Kirim penawaran".
2. Buat pesanan (Owner/Developer): harga + ongkir, status Menunggu bayar.
3. Catat pembayaran (Owner/Developer): metode bayar, tandai lunas (stok berkurang otomatis bila jumlah unit diketahui).
4. Kirim barang (Staff/Owner/Developer): diantar tim (nama petugas) atau kurir (nama kurir, resi opsional), tandai Dikirim.
5. Konfirmasi diterima: tandai Selesai.

Tombol "Kabari via WhatsApp" selalu menyiapkan pesan sesuai status beserta link Lacak Pesanan.
Form "Koreksi order (lanjutan)" tetap ada (Owner/Developer) untuk memperbaiki angka atau membatalkan tanda lunas/dikirim.
Pelanggan melihat status yang sama di halaman Lacak Pesanan (kode inquiry + nomor WhatsApp).

## Impor produk (CSV/Excel)
Admin > Produk > Impor. Unduh template (.xlsx dengan dropdown, atau .csv), isi satu produk per baris, unggah. Semua-atau-tidak-sama-sekali: satu baris salah = tidak ada yang disimpan, semua kesalahan ditampilkan dengan nomor baris. Centang "Hanya periksa dulu" untuk uji tanpa menyimpan. Maks. 500 produk dan 2 MB per file. Logika: src/lib/product-import.ts.

## Selesai
Saat status Dikirim, pembeli bisa menekan "Pesanan sudah saya terima" di Lacak Pesanan (butuh kode + nomor WA), atau admin menekan Selesai. Keduanya menghasilkan status Selesai, tahap terakhir bercentang di sisi pembeli dan admin, dan pembeli melihat ucapan terima kasih.

## Foto produk dan logo merk (Cloudinary)
- Foto produk: ideal 1200 x 1200 px (1:1), JPG/WebP, maks. 5 MB. Tampil utuh (tidak dipotong). Di server sisi terpanjang dibatasi 1600 px.
- Logo merk: PNG/WebP transparan (wajib; JPG atau PNG berlatar ditolak), ideal 600 x 240 px, maks. 1 MB. Di marquee tampil abu-abu, berwarna saat hover/fokus, klik membuka katalog merk itu. Semua logo ditampilkan di kotak ukuran sama.
- Hemat penyimpanan: nama file = hash isi (file sama tidak menggandakan), foto lama otomatis dihapus saat diganti/dilepas/produk dihapus, dan job maintenance menyapu aset yatim (diunggah tapi tidak disimpan) yang lebih dari 24 jam.
- Setelah memasang versi ini jalankan `npx prisma db push` lalu `npx prisma generate` (kolom baru `Brand.logoUrl`).

## Klaim garansi

1. Pesanan berstatus Selesai (`DELIVERED`) dan `deliveredAt` tercatat: garansi 30 hari mulai berjalan.
2. Pelanggan membuka Lacak Pesanan, memasukkan kode + nomor WhatsApp, lalu menekan "Ajukan klaim garansi". Satu klaim berjalan per pesanan, maksimal 5 klaim per pesanan.
3. Tim menerima notifikasi (Telegram/webhook bila diatur), membuka Admin > Klaim garansi, mengambil klaim, lalu menggerakkan status: Baru > Ditinjau > Disetujui > Diservis > Siap dikembalikan > Selesai. Penolakan wajib disertai alasan.
4. Catatan penyelesaian terlihat pelanggan di halaman Lacak. Catatan tim hanya terlihat admin.
5. Setelah garansi berakhir, klaim baru ditolak dengan pesan yang mengarahkan ke WhatsApp (servis berbayar).

## Penugasan inquiry

Setiap inquiry/klaim punya satu penanggung jawab. Petugas bisa Ambil dan Lepas sendiri; Owner dan Admin juga bisa menugaskan ke orang lain atau mengambil alih. Akun yang dinonaktifkan otomatis melepas semua inquiry dan klaim yang masih berjalan.
