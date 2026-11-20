# Arsitektur TechRevive

Panduan singkat agar proyek mudah dikembangkan dan tetap cepat saat data membesar.

## Lapisan

| Lapisan | Lokasi | Aturan |
|---|---|---|
| Halaman dan layout | `src/app/[locale]/**`, `src/app/admin/(panel)/**` | Server Component secara default. Client Component hanya untuk interaksi (`"use client"`). |
| Server action admin | `src/app/admin/**/actions.ts` | Selalu mulai dengan `requirePermission("...")`. Validasi input dengan zod. Tulis audit (`audit(...)`). Akhiri dengan `revalidateStorefront()` bila data publik berubah. |
| API publik | `src/app/api/**` | Cek Origin, rate limit per IP dan per nomor, Turnstile, batas ukuran body, zod. |
| Logika bisnis murni | `src/lib/*.ts` (pricing, order-flow, status-guard, stock, product-import, reports, session-policy) | Tanpa akses DB dan tanpa `next/*` supaya bisa dites cepat (`tests/*.test.ts`). |
| Akses data | `src/lib/db.ts` (Prisma), `src/lib/catalog-cache.ts` | Halaman publik hanya memakai `publicProductSelect`. Jangan pernah memilih `costPrice`, margin, atau supplier di kode publik. |
| Pembungkus layanan luar | `src/lib/cloudinary.ts`, `notify.ts`, `whatsapp.ts` | Semua panggilan keluar lewat satu file per layanan, dengan timeout dan penanganan gagal. |
| Teks | `src/messages/{id,en}.json` | Kunci id dan en harus sama persis (TypeScript akan memaksa). |
| SEO | `src/lib/seo.ts`, `src/app/{robots,sitemap,manifest}.ts`, `src/app/llms.txt` | Metadata halaman publik wajib lewat `pageMetadata()`. Data terstruktur lewat `<JsonLd />`. |

## Aturan data besar

1. **Tidak ada query tanpa batas.** Daftar selalu `take` + `skip`/cursor. Pembacaan massal (laporan, sitemap) memakai cursor bertahap.
2. **Agregasi di database.** Hitung dengan `aggregate`, `groupBy`, atau `$queryRaw`, bukan memuat baris lalu menjumlah di JavaScript.
3. **Setiap filter atau urutan baru butuh index.** Tambahkan `@@index` di `prisma/schema.prisma` bersamaan dengan fiturnya. Index yang sudah ada: produk (status, deletedAt, createdAt, brand, kategori, supplier, harga, GIN atribut), inquiry (status+createdAt, productId, createdAt, status+quoteExpiresAt), audit log (actorId, createdAt, entity).
4. **Halaman publik di-cache.** Beranda dan detail produk memakai ISR (`revalidate`). Data filter (kategori, merk, spek) memakai `unstable_cache`. Setiap perubahan admin memanggil `revalidateStorefront()` agar cache segar.
5. **Transaksi dengan kunci baris** untuk apa pun yang mengubah stok atau status lebih dari satu tabel (lihat `saveOrderCore`).
6. **Operasi massal bersifat semua-atau-tidak** dan punya mode cek dulu (lihat impor produk).

## Batas saat ini dan jalur naiknya

| Gejala | Kira-kira mulai terasa | Langkah |
|---|---|---|
| Pencarian "mengandung kata" lambat | puluhan ribu produk atau ratusan ribu inquiry | Aktifkan ekstensi `pg_trgm` dan buat index GIN `gin_trgm_ops` pada kolom nama, SKU, kode, dan nama pelanggan. |
| Sitemap mendekati 50.000 URL | 20.000 produk | Pindah ke `generateSitemaps()` (sitemap bertingkat). Batasnya ada di `src/app/sitemap.ts`. |
| Rate limit tidak konsisten antar instance | lalu lintas tinggi di Vercel | Pasang Upstash Redis (`@upstash/ratelimit`) di `src/lib/rate-limit.ts`. Antarmuka fungsinya sudah satu pintu. |
| Impor memuat semua SKU dan slug | ratusan ribu produk | Ganti dengan query `in` per potongan 1.000 baris. |
| Sapuan gambar yatim memuat semua URL | ratusan ribu gambar | Proses bertahap dengan cursor. |
| Pencarian butuh toleransi salah ketik | kapan pun | Mulai dengan `pg_trgm similarity()`. Mesin pencari terpisah (Meilisearch/Typesense) baru perlu bila katalog sangat besar. |

## Menambah fitur: daftar periksa

1. Model dan index di `schema.prisma`, lalu `npx prisma db push` (atau migrasi).
2. Aturan bisnis sebagai fungsi murni di `src/lib/` dan tes di `tests/`.
3. Izin baru di `src/lib/rbac.ts` bila perlu, lalu dipakai di server action.
4. Validasi zod di sisi server, walaupun form sudah memvalidasi.
5. Audit log untuk setiap perubahan di admin.
6. Teks di kedua bahasa (`id.json` dan `en.json`).
7. Tangani kasus tepi: data kosong, nilai besar, akses ganda bersamaan, pengguna tanpa izin, dan jaringan putus.
8. Perbarui `revalidateStorefront()` bila data publik berubah, dan `sitemap.ts` bila ada URL baru yang layak diindeks.
9. Jalankan `npm run typecheck`, `npm run lint`, `npm test`.

## Keamanan singkat

- Sesi admin: cookie `__Host-` HttpOnly Secure SameSite=Strict, batas diam 45 menit, batas maksimal 1,5 jam (`src/lib/session-policy.ts`), keluar di semua perangkat lewat `sessionVersion`.
- CSP bernonce untuk admin dan API. Halaman publik memakai `unsafe-inline` karena di-cache.
- Cek Origin pada setiap POST publik dan unggahan. Turnstile pada form inquiry.
- Pengambilan data publik tidak pernah memuat harga modal.
- Unggahan: tipe dan ukuran diperiksa di server, logo wajib transparan (pemeriksaan alpha).

## Fitur Tahap A (klaim, penugasan, pencarian, perbandingan)

| Area | Letak kode | Aturan penting |
|---|---|---|
| Garansi dan alur klaim | `src/lib/warranty.ts`, `src/lib/claim-flow.ts` | Logika murni dan diuji. Garansi 30 hari sejak `deliveredAt`; satu klaim berjalan per order, maksimal 5 klaim per order. |
| Klaim sisi pelanggan | `src/app/[locale]/track/actions.ts`, `src/components/claim-panel.tsx` | Wajib kode pesanan + nomor WhatsApp, rate limit per IP, baris order dikunci `FOR UPDATE` agar dua pengajuan bersamaan tidak lolos. |
| Klaim sisi admin | `src/app/admin/(panel)/claims/` | Izin `claim.manage`. Perubahan status memakai `updateMany` bersyarat terhadap status yang dibaca. |
| Penugasan dan catatan | `src/lib/assignment.ts`, `src/app/admin/(panel)/assign-actions.ts` | Satu aksi untuk inquiry dan klaim. Dilepas otomatis saat akun dinonaktifkan. |
| Pencarian | `src/lib/search-text.ts`, `src/lib/search.ts`, `/api/search/suggest` | Semua parameter lewat `Prisma.sql` (tanpa penggabungan string). Lapis trigram dilewati otomatis bila ekstensi belum ada. |
| Perbandingan | `src/lib/compare.ts`, `src/lib/compare-store.ts`, `/[locale]/compare` | Daftar di localStorage (aman bila diblokir), URL `?p=` bisa dibagikan, hanya data publik. |

Setelah menarik perubahan ini jalankan `npx prisma generate` dan `npx prisma db push` (membuat tabel klaim, kolom penugasan, ekstensi `pg_trgm`, dan indeks trigram).
