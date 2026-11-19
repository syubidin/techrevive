# Rancangan fitur berikutnya

Dokumen ini hanya rancangan. Belum ada kode. Setiap fitur sudah memuat model data, alur, kasus tepi, keamanan, dan performa supaya implementasinya benar sejak awal. Urutan prioritas ada di bagian akhir.

Aturan yang berlaku untuk semua fitur (lihat `docs/ARCHITECTURE.md`): izin lewat RBAC, validasi zod di server, audit log, teks dua bahasa, index untuk setiap filter, tes untuk logika murni.

---

## 1. Klaim garansi dan service

**Tujuan.** Garansi 1 bulan dan service berbayar adalah janji utama brand. Saat ini klaim hanya lewat chat. Fitur ini membuatnya terlacak.

**Data.** `WarrantyClaim`: id, kode `WC-YYMMDD-XXXX`, `orderId`, `status` (RECEIVED, PICKUP, DIAGNOSING, QUOTED, REPAIRING, READY, RETURNED, REJECTED, CLOSED), `issue`, `isUnderWarranty` (dihitung dari `deliveredAt + 1 bulan`, disimpan sebagai snapshot), `serviceFee`, `resolution`, `createdAt`. `WarrantyEvent` untuk riwayat. Foto kerusakan via Cloudinary (kategori terpisah).

**Alur.** Pelanggan buka halaman Lacak, lihat sisa garansi, tekan "Ajukan klaim", isi keluhan dan foto. Admin menerima, menjadwalkan jemput atau antar tim, mendiagnosis, dan bila di luar garansi mengirim biaya untuk disetujui. Pelanggan memantau status di halaman yang sama.

**Kasus tepi.** Klaim setelah garansi berakhir (diterima sebagai service berbayar, bukan ditolak). Klaim ganda untuk order yang sama (batasi satu klaim aktif per order). Order belum DELIVERED (tombol tidak muncul). Tanggal garansi dihitung dari `deliveredAt`, bukan `paidAt`. Zona waktu WIB saat menghitung batas hari terakhir. Pelanggan menyangkal biaya (status QUOTED menunggu persetujuan, tidak ada pekerjaan sebelum disetujui).

**Keamanan.** Akses pelanggan memakai pasangan kode order + nomor telepon seperti halaman Lacak, dengan rate limit sama. Unggahan foto: batas jumlah dan ukuran, pemeriksaan tipe di server. Hanya peran dengan izin `claim.manage` yang dapat mengubah status. Catatan internal tidak pernah dikirim ke klien.

**Performa.** Index `(status, createdAt)` dan `(orderId)`. Daftar admin berpaginasi.

---

## 2. Notifikasi status otomatis ke pelanggan (WhatsApp)

**Tujuan.** Pelanggan dikabari saat status berubah tanpa admin mengetik ulang.

**Pendekatan.** Pola outbox: tabel `Notification` (id, `inquiryId`, `template`, `channel`, `status` PENDING/SENT/FAILED, `attempts`, `nextTryAt`, `dedupeKey` unik). Perubahan status menulis satu baris di transaksi yang sama. Pengirim dijalankan dari cron (sudah ada infrastruktur cron) dan mengirim lewat penyedia WhatsApp resmi (WhatsApp Cloud API) atau penyedia lokal sebagai alternatif.

**Kasus tepi.** Pengiriman ganda (kunci `dedupeKey = inquiryId:template:statusVersion`). Penyedia down (coba ulang dengan jeda bertambah, maksimal 5 kali, lalu FAILED dan terlihat di admin). Pelanggan menolak pesan (kolom `optOut` per nomor, wajib dihormati). Template yang belum disetujui penyedia. Nomor tidak aktif.

**Keamanan.** Kunci API hanya di env server. Webhook status penyedia (bila dipakai) memverifikasi tanda tangan dan menolak permintaan tanpa tanda tangan sah. Isi pesan tidak memuat harga modal atau data internal.

**Performa.** Pengirim memproses per potongan 50 baris dengan `FOR UPDATE SKIP LOCKED` agar dua eksekusi cron tidak mengambil baris yang sama. Index `(status, nextTryAt)`.

---

## 3. Ulasan terverifikasi

**Tujuan.** Bukti sosial yang jujur, dan data `aggregateRating` asli untuk SEO.

**Data.** `Review`: id, `orderId` unik, `productId`, `rating` 1-5, `body`, `displayName`, `status` (PENDING, PUBLISHED, HIDDEN), `createdAt`.

**Alur.** Setelah status DELIVERED, halaman Lacak menampilkan form ulasan. Admin memoderasi sebelum tampil. Halaman produk menampilkan rata-rata dan daftar. Data terstruktur `aggregateRating` hanya dipasang bila ada minimal 3 ulasan terbit.

**Kasus tepi.** Satu ulasan per order (unik di DB). Ulasan dari order yang dibatalkan (ditolak). Isi berisi nomor telepon atau tautan (disaring dan dipotong). Spam dan HTML (teks polos, di-escape). Produk dihapus lunak (ulasan tetap, tidak ditampilkan).

**Keamanan.** Hanya pemilik order (kode + telepon) yang dapat mengirim. Rate limit. Moderasi wajib sebelum terbit.

**Performa.** Rata-rata dihitung lewat `aggregate` dan di-cache per produk, dibuang saat ulasan terbit. Index `(productId, status, createdAt)`.

---

## 4. Daftar tunggu stok ("Kabari saya")

**Tujuan.** Menangkap permintaan untuk unit Pre-order atau Habis.

**Data.** `StockAlert`: id, `productId`, `phone`, `createdAt`, `notifiedAt`. Unik `(productId, phone)`.

**Alur.** Pada produk Habis atau Pre-order muncul tombol. Saat admin mengubah ketersediaan menjadi tersedia, pesan dikirim lewat fitur nomor 2 (atau ditampilkan sebagai daftar tindak lanjut di admin bila notifikasi otomatis belum aktif).

**Kasus tepi.** Pendaftaran berulang (unik di DB, jawaban tetap sukses). Produk dihapus. Nomor yang sama mendaftar ke ratusan produk (batas harian per nomor dan per IP).

**Keamanan.** Turnstile dan rate limit seperti form inquiry. Nomor disimpan dengan normalisasi yang sama dengan inquiry.

---

## 5. Jual atau tukar tambah perangkat

**Tujuan.** Sumber stok baru dan alasan pelanggan kembali.

**Data.** `TradeIn`: kode, nama, telepon, kategori, merk, model, kondisi, foto (maks. 5), `expectedPrice` opsional, `status` (NEW, QUOTED, ACCEPTED, REJECTED, COMPLETED), `offerPrice`, `note`.

**Alur.** Form publik di halaman baru. Admin menilai dan mengirim penawaran lewat WhatsApp. Bila disetujui, perangkat dapat dijadikan produk baru dari admin dengan sekali klik (menyalin merk, kategori, harga modal = harga tawar).

**Kasus tepi.** Barang diduga bermasalah (IMEI, akun terkunci): daftar periksa wajib sebelum penawaran akhir. Foto kosong atau terlalu besar. Pengajuan ganda. Penawaran kedaluwarsa.

**Keamanan.** Turnstile, rate limit, batas unggahan, pemeriksaan tipe gambar. Foto pelanggan disimpan terpisah dan dihapus otomatis bila pengajuan ditolak lebih dari 30 hari.

---

## 6. Penugasan dan catatan internal pada inquiry

**Tujuan.** Tim lebih dari satu orang bekerja tanpa saling menimpa.

**Data.** `Inquiry.assigneeId`, tabel `InquiryNote` (id, inquiryId, authorId, body, createdAt). Filter "milik saya" dan "belum ditugaskan".

**Kasus tepi.** Dua orang mengambil bersamaan (pembaruan bersyarat `WHERE assigneeId IS NULL`). Staf dinonaktifkan (inquiry kembali ke antrean). Catatan tidak pernah tampil ke pelanggan.

**Performa.** Index `(assigneeId, status)`.

---

## 7. Keamanan admin lanjutan

- **Autentikasi dua langkah (TOTP)** untuk Owner dan Developer, dengan kode cadangan sekali pakai yang di-hash. Pemulihan lewat Developer.
- **Rate limit terdistribusi** (Upstash) menggantikan penghitung per instance.
- **Pemantauan galat** (Sentry paket gratis) dengan data pribadi disamarkan.
- **Retensi data pribadi**: nama dan telepon pada inquiry yang sudah selesai lebih dari 12 bulan dianonimkan oleh tugas cron. Angka laporan tetap utuh.
- **Pencadangan**: ekspor terjadwal (Neon branch atau `pg_dump`) dan uji pulih berkala.

---

## 8. Analitik penjualan dan sumber pelanggan

**Data.** `Inquiry.utmSource/utmMedium/utmCampaign` (ditangkap dari URL saat mengirim form, dipotong 60 karakter). Laporan baru: corong (kunjungan produk, inquiry, order lunas, selesai), konversi per sumber, produk paling dicari yang habis, waktu respons rata-rata terhadap SLA.

**Kasus tepi.** Parameter palsu atau terlalu panjang (disaring). Zona waktu WIB pada pengelompokan harian. Data besar (agregasi di database, rentang maksimal 1 tahun).

---

## 9. Pencarian yang lebih pintar

Aktifkan `pg_trgm` untuk toleransi salah ketik ("lenopo" menemukan Lenovo) dan saran otomatis (autocomplete) di kotak cari beranda dan katalog. Saran diambil dari endpoint ringan yang di-cache 60 detik dan dibatasi 8 hasil. Index GIN pada nama dan SKU.

---

## 10. Perbandingan produk dan favorit

Sepenuhnya di sisi klien (localStorage dengan try/catch), tanpa tabel baru. Bandingkan sampai 3 produk dalam satu kategori dalam tabel spesifikasi. Favorit menyimpan ID dan mengambil data terbaru saat halaman dibuka (hanya `publicProductSelect`). Produk yang sudah tidak terbit disembunyikan otomatis.

---

## Urutan yang disarankan

| Tahap | Fitur | Alasan |
|---|---|---|
| A | 1. Klaim garansi dan service | Menegakkan janji brand terkuat, memakai data order yang sudah ada |
| A | 6. Penugasan dan catatan internal | Murah, langsung berguna saat tim bertambah |
| B | 2. Notifikasi WhatsApp otomatis | Menghemat waktu admin, butuh akun penyedia |
| B | 3. Ulasan terverifikasi | Membangun kepercayaan dan memperkuat SEO |
| B | 4. Daftar tunggu stok | Menangkap permintaan yang selama ini hilang |
| C | 8. Analitik sumber pelanggan | Berguna setelah ada lalu lintas |
| C | 9. Pencarian pintar | Terasa setelah katalog besar |
| C | 5. Tukar tambah | Perlu proses bisnis yang jelas lebih dulu |
| Kapan saja | 7. Keamanan lanjutan, 10. Perbandingan | 7 sebaiknya sebelum tim besar, 10 murah |
