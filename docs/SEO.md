# SEO dan GEO

## Yang sudah terpasang

- Judul dan deskripsi unik per halaman (ID dan EN), canonical, hreflang (`id`, `en`, `x-default`), Open Graph, Twitter Card. Semuanya lewat `pageMetadata()` di `src/lib/seo.ts`.
- Halaman kategori (`/catalog?category=slug`) diindeks. Kombinasi filter, pencarian, urutan, dan halaman ke-2 dst. diberi `noindex, follow` supaya tidak ada ribuan URL kembar.
- Data terstruktur: Organization, WebSite (kotak pencarian), BreadcrumbList, Product (harga, kondisi, garansi 1 bulan, ketersediaan jujur, grade, spesifikasi), FAQPage.
- `sitemap.xml` dengan alternatif bahasa, tanggal ubah produk, dan halaman kategori. `robots.txt` menutup admin, API, lacak pesanan, dan invoice.
- `/llms.txt`: ringkasan fakta situs untuk mesin AI (GEO), berisi garansi, grade, alur pesan, area antar, metode bayar, kategori, dan merk. Dibuat otomatis dari data.
- `manifest.webmanifest` dan gambar share default `public/brand/og-default.png` (1200x630).
- Gambar produk memakai `next/image` dengan `alt`, `sizes`, dan prioritas gambar pertama.

## Yang perlu Anda lakukan setelah deploy

1. Pastikan `NEXT_PUBLIC_SITE_URL` di Vercel berisi domain final (mis. `https://techrevive.com`), tanpa garis miring di akhir. Canonical dan sitemap mengikuti nilai ini.
2. Buka **Google Search Console**, tambahkan properti domain, verifikasi, lalu kirim `https://domain-anda/sitemap.xml`.
3. Lakukan hal yang sama di **Bing Webmaster Tools** (juga menjadi sumber untuk beberapa asisten AI).
4. Isi `site.social` di `src/config/site.ts` dengan akun asli. Link yang masih berupa beranda platform tidak dimasukkan ke data terstruktur.
5. Ganti `WHATSAPP_NUMBER` dengan nomor asli. Nomor asli otomatis masuk ke data terstruktur sebagai kontak layanan.
6. Uji dengan Rich Results Test (Google) pada satu halaman produk dan halaman FAQ.

## Tips konten (berpengaruh besar)

- Nama produk: sertakan merk, seri, dan spesifikasi kunci (mis. "ThinkPad T14 Gen 2, Core i5, 16 GB, 512 GB SSD").
- Deskripsi produk 2-4 kalimat berisi hal nyata: kondisi fisik, kesehatan baterai, kelengkapan. Mesin AI mengutip kalimat yang spesifik.
- Foto asli dengan `alt` yang menjelaskan sisi yang difoto.
- Jangan menyalin deskripsi pabrikan. Teks unik lebih mudah ranking dan lebih sering dikutip.
- Pertahankan ketersediaan yang jujur. Data terstruktur hanya menyatakan "InStock" bila unit sudah terverifikasi.
