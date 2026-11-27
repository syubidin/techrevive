# Panduan Aset Visual TechRevive

Dokumen ini adalah rencana dan langkah kerja untuk mengisi website dengan aset visual (banner, ilustrasi kategori, trust, cara pesan, grade, promo) memakai alat gratis. Kode sudah siap: begitu file diletakkan di `public/assets/`, gambar tampil otomatis.

## 1. Keputusan utama

| Jenis aset | Dari mana | Alasan |
|---|---|---|
| Ilustrasi (kategori, trust, cara pesan, grade, banner, 404) | Dibuat dengan AI gambar gratis (Gemini), satu gaya yang sama | Satu prompt dasar menjaga gaya seragam; gratis; hasil cepat |
| Foto bengkel / area QC / kemasan | Foto asli dari HP Anda | Aset kepercayaan paling kuat; AI tidak boleh dipakai untuk "bukti" |
| Foto produk | Foto asli per unit (Anda yang isi) | Sesuai janji "foto unit asli", dan wajib jujur soal kondisi |
| Ikon, pola, efek | Tetap di kode (sudah ada) | Ringan, tajam, ikut mode gelap |
| Cadangan ilustrasi vektor | unDraw (diwarnai ulang ke biru TechRevive) | Lisensi jelas, tanpa atribusi |

Yang sengaja **tidak** dibuat: testimoni atau ulasan pelanggan karangan, foto "unit" buatan AI yang seolah barang nyata, logo merk (Apple, Lenovo, dll.) di dalam gambar.

## 2. Aturan agar hasilnya konsisten dan aman

1. **Tanpa teks di dalam gambar.** Situs dwibahasa (ID/EN); semua tulisan ditangani HTML. Minta AI "no text, no letters".
2. **Tanpa logo merk dan tanpa wajah.** Hindari masalah merek dagang dan tampilan aneh pada wajah AI.
3. **Dua versi: terang dan gelap.** Situs mengikuti tema perangkat (sama seperti logo). Setiap ilustrasi punya versi **terang** (`nama.webp`, wajib, dipakai di mode terang) dan versi **gelap** (`nama-dark.webp`, sangat disarankan, dipakai otomatis di mode gelap). Tanpa versi gelap, versi terang tetap tampil di mode gelap. Gaya, objek, dan komposisi dua versi harus sama persis; hanya warna latar dan kontras yang berbeda.
   Pengecualian satu versi untuk kedua mode: **banner ajakan** di bagian bawah beranda (kartu gelap bertulisan putih di kedua mode) dan **foto bengkel** (foto asli).
4. **Ilustrasi grade bersifat ilustratif**, bukan foto unit sebenarnya. Foto unit asli tetap di halaman produk.
5. **Ukuran file kecil.** Format WebP, batas per aset ada di tabel. Kompres sebelum diunggah.
6. **Catat sumber setiap aset** (bagian 8) untuk jaga-jaga soal lisensi.

## 3. Alat gratis yang dipakai

Batas gratis alat AI sering berubah. Cek halaman resmi masing-masing sebelum mulai, dan baca ketentuan penggunaan komersialnya sendiri.

| Fungsi | Alat | Catatan |
|---|---|---|
| Membuat ilustrasi (utama) | **Google Gemini** (gambar "Nano Banana") di gemini.google.com | Gratis dengan akun Google. Kuota harian tidak dipublikasikan angkanya dan pernah dipangkas (model Pro dilaporkan hanya ±2 gambar/hari), jadi buat beberapa aset per hari selama 3 sampai 5 hari. Hasil tanpa watermark terlihat, tetapi membawa metadata penanda AI. Ketentuan Google mengizinkan pemakaian, tetapi baca sendiri sebelum dipakai komersial. |
| Cadangan pembuat gambar | **Ideogram** (paket gratis) | Kredit gratis kecil per minggu dan hasil bersifat publik. Cocok sebagai cadangan, bukan utama. |
| Tanpa batas, perlu usaha | **Flux schnell** (Apache 2.0, bisa dijalankan sendiri atau lewat Hugging Face Space) | Lisensi bebas komersial. Perlu GPU sendiri atau antre di Space. Hanya bila kuota Gemini tidak cukup. |
| Ilustrasi vektor siap pakai | **unDraw** (undraw.co) | Gratis untuk komersial, tanpa atribusi, boleh diubah warna. Tidak boleh dikemas ulang sebagai paket atau dipakai melatih AI. Pilih warna `#06b6d4`. |
| Foto stok (latar, bila perlu) | **Pexels** atau **Unsplash** | Gratis komersial menurut lisensi masing-masing. Cek halaman lisensi. Jangan pakai foto yang menampilkan logo merk jelas. |
| Edit, potong, susun banner | **Photopea** (photopea.com) atau **Figma** (paket Starter gratis) | Photopea mirip Photoshop di browser. Figma bagus untuk menyusun banner dan ekspor. |
| Kompres dan ubah ke WebP | **Squoosh** (squoosh.app) | Berjalan di browser, tanpa unggah ke server. |
| Foto bengkel | Kamera HP | Cahaya jendela, latar rapi, tanpa data pelanggan atau nomor seri terlihat. |

**Hindari** untuk aset situs ini:
- **Leonardo AI paket gratis**: menurut ketentuannya, hasil paket gratis dimiliki Leonardo dan tidak boleh dijual. Tidak aman untuk komersial.
- **Adobe Firefly paket gratis**: hasil diberi watermark.
- **Canva gratis**: fitur AI dan penghapus latar dibatasi, dan saya tidak memverifikasi batasnya. Tidak dijadikan andalan.

## 4. Panduan gaya (bagian dari setiap prompt)

Palet yang sama dengan situs:

| Peran | Versi terang | Versi gelap |
|---|---|---|
| Latar gambar | biru-abu sangat muda `#e3e9f0` ke `#f4f7fa` | navy `#0f3354` (tepi `#08233c`) |
| Perangkat | navy `#08233c` dan silver `#8a8fa0`, layar putih | putih dan silver `#cfd3dc` |
| Aksen | cyan `#0891b2` | cyan `#06b6d4`, terang `#67e8f9` |
| Sukses (opsional) | hijau `#16a34a` | hijau `#16a34a` |

**Awalan prompt VERSI TERANG (salin di depan setiap prompt):**

```
Flat isometric vector illustration, clean geometric shapes, soft subtle gradients,
gentle soft shadow under objects. Color palette strictly: very light blue-grey
background (#eef3f8) with a faint cyan glow, devices in deep navy (#08233c) and
silver-grey (#8a8fa0) with white screens, small teal-cyan accents (#0891b2).
No text, no letters, no numbers, no logos, no brand marks, no human faces.
Centered composition with generous empty margin around the subject.
Aspect ratio: [RASIO].
```

**Versi GELAP:** setelah versi terang disukai, di percakapan yang sama kirim:

```
Recreate exactly this same illustration (same objects, same composition, same
proportions) for dark mode: deep navy background (#0f3354) with a faint cyan glow,
devices in white and silver-grey (#cfd3dc, #8a8fa0), cyan accents (#06b6d4).
Keep no text, no logos, no faces.
```

Tips: pakai satu percakapan Gemini yang sama untuk semua aset agar gayanya terbawa. Bila hasil meleset dari gaya, tempel gambar yang sudah Anda sukai dan tulis "same style as this image". Banner ajakan dan latar hero dijelaskan di bagian 6.

## 5. Daftar aset lengkap

Letakkan file di `public/assets/<key>.webp` (PNG/JPG/SVG juga dikenali). Nama harus persis sama.

Kolom **Versi**: *T+G* = buat terang (`nama.webp`) dan gelap (`nama-dark.webp`); *1* = satu berkas untuk semua mode. Ukuran dan batas berlaku untuk masing-masing berkas.

| # | Key (nama file) | Ukuran (px) | Maks | Tampil di | Sumber | Versi | Prioritas |
|---|---|---|---|---|---|---|---|
| 1 | `cta/banner` | 1200 x 750 | 140 KB | Banner ajakan "Belum menemukan yang dicari?" di dasar beranda (desktop di kanan teks, HP di atas teks) | AI | 1 | Fase 1 |
| 3 | `categories/laptop` | 960 x 720 | 90 KB | Kartu kategori | AI | T+G | Fase 1 |
| 4 | `categories/smartphone` | 960 x 720 | 90 KB | Kartu kategori | AI | T+G | Fase 1 |
| 5 | `categories/tablet` | 960 x 720 | 90 KB | Kartu kategori | AI | T+G | Fase 1 |
| 6 | `categories/accessories` | 960 x 720 | 90 KB | Kartu kategori | AI | T+G | Fase 1 |
| 7 | `categories/default` | 960 x 720 | 90 KB | Cadangan kategori baru | AI | T+G | Fase 1 |
| 8 | `trust/why-grade` | 800 x 600 | 70 KB | "Kenapa TechRevive" kartu 1 | AI | T+G | Fase 2 |
| 9 | `trust/why-qc` | 800 x 600 | 70 KB | Kartu 2 | AI | T+G | Fase 2 |
| 10 | `trust/why-human` | 800 x 600 | 70 KB | Kartu 3 | AI | T+G | Fase 2 |
| 11 | `grades/grade-a` | 800 x 600 | 70 KB | Penjelasan grade | AI | T+G | Fase 2 |
| 12 | `grades/grade-b` | 800 x 600 | 70 KB | Penjelasan grade | AI | T+G | Fase 2 |
| 13 | `grades/grade-c` | 800 x 600 | 70 KB | Penjelasan grade | AI | T+G | Fase 2 |
| 14 | `process/step-1` ... `step-4` | 640 x 480 | 60 KB | Cara pesan (4 file) | AI | T+G | Fase 2 |
| 15 | `hero/hero-backdrop` | 1920 x 900 | 160 KB | Latar samar beranda | AI | T+G | Fase 3 |
| 16 | `states/not-found` | 640 x 480 | 60 KB | Halaman 404 | AI | T+G | Fase 3 |
| 16b | `states/error` | 640 x 480 | 60 KB | Halaman error (500) | AI | T+G | Fase 3 |
| 17 | `about/workshop` | 1600 x 800 | 160 KB | Tentang Kami | **Foto asli** | 1 | Fase 2 |
| 18 | `about/founder` | 800 x 1000 | 100 KB | Tentang Kami (profil pendiri) | **Foto asli** | 1 | Fase 2 |

Di luar `public/assets/` (diganti manual bila mau):
- `public/brand/og-default.png` (1200 x 630): gambar saat tautan dibagikan di WhatsApp/sosmed. Susun di Figma: logo + latar navy + 1 ilustrasi. Bagian teks boleh dalam bahasa Indonesia saja atau tanpa teks.
- Foto produk: Anda isi lewat admin (disarankan 1200 x 900, latar polos, 4 sampai 6 foto per unit, termasuk foto cacat bila ada).

## 6. Prompt per aset

Gabungkan: **awalan terang (bagian 4)** + baris subjek di bawah, lalu buat versi gelapnya dengan perintah di bagian 4, dengan `[RASIO]` sesuai tabel (4:3 untuk kartu, 16:9 atau 3:1 untuk banner).

**Kategori**
- `laptop`: `A modern open silver laptop, screen showing abstract cyan geometric shapes (no text), floating slightly above a soft shadow.`
- `smartphone`: `A modern smartphone standing upright with an abstract cyan gradient screen, a second phone slightly behind it, seen from behind.`
- `tablet`: `A slim tablet leaning at an angle with an abstract cyan dashboard-like screen made of plain shapes, no text.`
- `accessories`: `A small group of tech accessories floating together: wireless earbuds with case, a compact mouse, a power adapter and a cable, all plain with no logos.`
- `default`: `A friendly stack of generic gadgets: laptop, phone and earbuds arranged together.`

**Kenapa TechRevive**
- `why-grade`: `A magnifying glass inspecting a laptop corner, small checkmark badges in cyan floating nearby.`
- `why-qc`: `A laptop on a workbench with a shield-with-check badge above it and a small screwdriver and gear, suggesting testing and warranty.`
- `why-human`: `Two overlapping chat bubbles with a smartphone, one bubble with a small heart, friendly and human feeling, no faces.`

**Grade (ilustratif)**
- `grade-a`: `A pristine silver laptop with a clean flawless surface and a few sparkles around it.`
- `grade-b`: `A silver laptop with a few very faint hairline scratches on the lid, otherwise clean.`
- `grade-c`: `A silver laptop with clearly visible scuffs and a small dent on the corner, while the screen glows brightly to show it works.`

**Cara pesan (4:3, satu per langkah)**
- `step-1`: `A magnifier over a grid of device cards with filter sliders beside it.`
- `step-2`: `A smartphone showing a chat window made of plain bubbles with a send button.`
- `step-3`: `A laptop with a large checklist beside it where all items are ticked, a small shield badge.`
- `step-4`: `A delivery courier scooter carrying a small box, with a map pin and a tiny wallet icon.`

**Banner ajakan (`cta/banner`, rasio 16:10, satu versi gelap, pakai awalan GELAP bagian 4)**
- `A laptop and a smartphone floating isometrically with cyan light rings and small floating chat bubbles. Main subject centered slightly to the right and upper part of the frame; the left 40% and bottom 35% should be simple dark navy space, because the image fades into the card color on those sides.`
- Di desktop gambar berada di kanan teks dan memudar ke kiri; di HP gambar berada di atas teks dan memudar ke bawah. Karena itu objek utama jangan menempel di tepi kiri atau bawah. Seluruh bagian gambar tampak di kedua ukuran (tidak ada teks yang menimpa gambar).

**Hero backdrop** (16:7), dua versi: terang `Abstract very light blue-grey background with a fine teal circuit-line grid and a soft cyan glow in the upper right, very low contrast, large empty area on the left. No objects.`; gelap: sama tetapi latar navy dengan garis cyan.

**404** (4:3): `A laptop with a magnifier and a small question-mark-shaped cable loop (no text), lost-and-found feeling.`

**Foto pendiri `about/founder`** (rasio 4:5, potret): LinkedIn tidak bisa diambil otomatis, jadi simpan foto profil Anda sendiri (pakai foto resolusi tertinggi). Potong 4:5 dengan wajah di bagian atas (di Photopea atau Squoosh), ubah ke WebP kualitas 80, namai `founder.webp`, taruh di `public/assets/about/founder.webp`, lalu jalankan `npm run assets:sync`. Sebelum file ada, halaman menampilkan inisial "MF" sebagai pengganti. Nama dan tautan LinkedIn ada di `src/config/founder.ts`, teks bio di `aboutPage.founder` pada `src/messages/*.json`.

**Foto asli `about/workshop`** (bukan AI): foto meja kerja QC, unit yang sedang dites, dan area pengemasan. Ambil landscape, cahaya terang, rapikan kabel, jangan tampilkan data pelanggan, nomor seri, atau layar berisi info pribadi. Rasio 2:1, potong di Photopea.

## 7. Alur kerja per aset

1. Buka Gemini, tempel awalan terang + prompt aset. Minta 3 variasi, pilih yang terbaik. Lalu minta versi gelapnya (bagian 4).
2. Cek: tidak ada teks atau logo, warna dekat palet, subjek di tengah, ruang kosong sesuai kebutuhan. Bila ada kesalahan kecil, minta Gemini memperbaiki dengan menyebut persis apa yang salah.
3. Unduh. Buka di **Photopea**: *Image > Canvas/Image Size* atau potong (Crop) agar tepat sesuai ukuran di tabel (rasio harus sama; boleh lebih besar).
4. Buka **Squoosh**: pilih WebP, kualitas 70 sampai 80, pastikan ukuran di bawah batas, lalu unduh.
5. Ganti nama sesuai key (contoh `laptop.webp` untuk terang dan `laptop-dark.webp` untuk gelap) dan taruh di folder yang sesuai, misalnya `public/assets/categories/laptop.webp`.
6. Jalankan `npm run assets:sync`. Skrip menampilkan aset mana yang sudah terpasang, mana yang belum, dan peringatan bila ukuran atau rasio tidak pas.
7. Jalankan `npm run dev` (sinkron otomatis) dan lihat tampilannya di mode terang dan gelap (ganti tema di pengaturan Windows/HP, atau di DevTools: Rendering > Emulate prefers-color-scheme), desktop dan HP.
8. Catat di bagian 8, lalu `git add`, `commit`, `push`. Di Vercel, sinkron berjalan otomatis saat build.

Bila satu aset belum ada, bagian itu tetap tampil seperti sebelumnya (ikon), jadi situs tidak pernah rusak.

## 8. Catatan sumber dan lisensi (isi sendiri)

| Key | Alat | Tanggal dibuat | Prompt atau tautan sumber | Catatan lisensi |
|---|---|---|---|---|
| contoh `categories/laptop` | Gemini | 2026-11-26 | (tempel prompt) | Ketentuan Google dicek 2026-11-26 |

## 9. Rencana bertahap

- **Fase 1 (±1 jam, dampak terbesar):** banner ajakan (1 file) dan kategori (5 gambar terang, lalu versi gelapnya). Beranda langsung terasa penuh.
- **Fase 2 (hari berikutnya):** trust (3), grade (3), cara pesan (4), dan foto bengkel asli.
- **Fase 3 (opsional):** hero backdrop, 404, gambar OG baru.
- **Kemudian:** foto produk nyata lewat admin; bila ada ulasan pelanggan sungguhan, tampilkan dengan izin mereka.

## 10. Pemeriksaan sebelum rilis

- [ ] Tidak ada teks, logo merk, atau wajah di gambar.
- [ ] Semua gambar di bawah batas ukuran dan berformat WebP.
- [ ] `npm run assets:sync` tidak menampilkan peringatan.
- [ ] Tampilan HP: kartu kategori 2 kolom rapi, banner ajakan tampil utuh di atas teks.
- [ ] Mode terang dan gelap sama-sama enak dilihat, dan setiap ilustrasi punya versi `-dark` (sinkron menampilkan baris "belum ada versi gelap" bila belum).
- [ ] Lighthouse mobile: skor performa tidak turun (gambar hero atas memakai `priority`, sisanya lazy).
- [ ] Sumber setiap aset sudah dicatat.

## 11. Pemecahan masalah

| Gejala | Penyebab | Solusi |
|---|---|---|
| Gambar tidak muncul | Nama atau folder salah, atau belum sinkron | Cek `npm run assets:sync`; baris "belum ada" menunjukkan nama yang diharapkan |
| "tidak dikenal" di keluaran sinkron | Nama file tidak ada di daftar | Samakan dengan tabel bagian 5 |
| Mode gelap masih menampilkan gambar terang | Berkas `-dark` belum ada atau namanya salah | Pastikan `nama-dark.webp`; cek keluaran `npm run assets:sync` |
| Peringatan "rasio beda" | Gambar terpotong di tepi | Potong ulang ke rasio yang benar |
| Objek banner terpotong atau memudar | Objek terlalu dekat tepi kiri/bawah | Minta objek lebih ke tengah-kanan atas, ulangi gambar |
| Gaya antar gambar berbeda | Percakapan berbeda | Pakai satu percakapan dan "same style as this image" |


## Unggah foto produk (WebP otomatis)

Foto produk dan logo yang diunggah lewat panel admin diubah ke WebP di browser sebelum dikirim (sisi terpanjang maksimal 1600 px, logo 600 px). Cloudinary juga menyimpannya sebagai WebP (`f_webp`) dan situs menyajikan WebP. Bila browser tidak bisa menyandi WebP, berkas asli dikirim dan Cloudinary yang mengonversinya.
