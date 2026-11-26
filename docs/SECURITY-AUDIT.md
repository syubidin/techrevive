# Audit performa, keamanan, dan edge case (26 Nov 2026)

Lingkup: login admin, rate limit, katalog, halaman publik, aset gambar, fitur baru (Bantu memutuskan, perbandingan).

## Diperbaiki pada audit ini

| # | Temuan | Risiko | Perbaikan |
|---|---|---|---|
| 1 | Rate limit tanpa Redis hanya di memori per-instance. Di serverless (Vercel) tiap permintaan bisa dilayani instance berbeda, sehingga batas mudah dilewati | Brute force login, tebak token lacak, spam inquiry | Tabel `RateBucket` (satu pernyataan atomik) dipakai bila Upstash tidak diatur, untuk login, lacak, klaim, dan inquiry. Redis tetap yang utama. Bila DB bermasalah, jatuh ke memori (tidak terbuka). Baris kedaluwarsa dibersihkan oleh cron `maintenance` |
| 2 | Pesan "Akun terkunci" membedakan email terdaftar dan tidak | Pencacahan akun (user enumeration) | Semua kegagalan memakai satu pesan yang sama |
| 3 | Kunci akun tetap 15 menit dan hitungan di-reset saat terkunci | Penyerang sabar bisa mencoba terus tiap 15 menit | Kunci progresif: 5 gagal = 15 menit, 10 = 1 jam, 15 = 6 jam, 20+ = 24 jam. Hitungan baru kembali ke 0 saat login berhasil |
| 4 | Batas login hanya per IP (15 menit) dan per email | Satu IP menyemprot banyak email pelan-pelan | Tambah batas per IP per 24 jam (80). Total tiga lapis, semuanya awet antar instance |
| 5 | Kunci rate limit inquiry memuat nomor HP apa adanya | Data pribadi tersimpan di tabel batas | Nomor di-hash (HMAC) sebelum jadi kunci |
| 6 | URL katalog boleh membawa ratusan parameter | Beban render dan formulir, URL sampah ter-crawl | Maksimal 40 parameter, kunci lebih dari 60 karakter dibuang |
| 7 | Berkas `/assets` dan `/brand` tanpa aturan cache | Unduhan ulang tiap kunjungan | Cache 1 hari + segarkan di latar (`stale-while-revalidate` 7 hari). Hasil optimasi gambar lokal 1 hari |
| 8 | Gambar latar beranda ikut `priority` | Bersaing dengan elemen LCP | Dimuat biasa (lazy), bukan prioritas |
| 9 | Gambar dan tautan bisa diseret | Salin iseng, hantu gambar di HP | CSS `user-drag: none`, `touch-callout: none`, guard `dragstart` (juga Firefox), dan `draggable=false` |

Catatan jujur untuk nomor 9: ini hanya menghalangi salin iseng. Gambar yang tampil di browser tetap bisa diunduh lewat alat pengembang atau tangkapan layar.

## Sudah diperiksa dan tidak perlu diubah

- Semua server action admin memanggil pemeriksaan izin (`requirePermission`) di awal; hanya `login` dan `logout` yang sengaja tanpa itu.
- Semua SQL mentah memakai template berparameter (tidak ada `queryRawUnsafe`).
- JSON-LD di-escape sebelum disisipkan; satu-satunya `dangerouslySetInnerHTML` di situs.
- Upload gambar: cek Origin, login, izin, rate limit, ukuran, magic bytes, dan alpha logo.
- Filter katalog: semua nilai divalidasi daftar putih; kunci spek hanya dari definisi di database.
- Header keamanan, CSP bernonce untuk admin/API, cookie `__Host-`, batas diam 45 menit dan maksimal 1,5 jam.

## Fitur baru dan edge case-nya

| Fitur | Edge case yang ditangani |
|---|---|
| Bantu memutuskan | Jawaban dari `localStorage` divalidasi daftar putih (data rusak atau diubah = diabaikan). Penyimpanan diblokir (mode privat) tetap jalan. Kategori yang tidak ada tidak ditawarkan (daftar perangkat diambil dari kategori sungguhan). Spek hanya ditambahkan bila satu kategori dipilih. Muncul otomatis sekali, hanya di katalog tanpa filter, tidak untuk bot (`navigator.webdriver`). Hasil kosong menawarkan membuka ulang |
| Perbandingan di beranda | Contoh tampilan diberi label jelas bukan unit nyata; tabel punya header dan teks untuk pembaca layar |
| Banner CTA | Tanpa gambar, kartu tampil seperti sebelumnya. Gambar tampil utuh di HP (di atas teks) dan desktop (di kanan teks) |

## Saran lanjutan (belum dikerjakan)

1. **Turnstile di login admin** setelah beberapa kali gagal (Turnstile sudah dipakai di form publik).
2. **2FA admin** (sudah di ROADMAP). Ini perlindungan terkuat terhadap kata sandi bocor.
3. Isi `UPSTASH_REDIS_REST_URL/TOKEN` bila trafik naik, agar rate limit tidak menambah beban database.
4. Kunci akun bisa dipakai orang lain untuk mengunci admin yang sah (kompromi bawaan). Bila terjadi, Developer bisa membuka kunci lewat database atau `set-role`.
5. Tinjau `npm audit` tiap bulan dan jangan memakai `--force`.

## Langkah yang harus dijalankan

```
npx prisma generate
npx prisma db push      # membuat tabel RateBucket
npm run typecheck
npm test
```
Sebelum `db push` dijalankan, rate limit otomatis memakai memori seperti sebelumnya (tidak error).
